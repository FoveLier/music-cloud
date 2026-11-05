<template>
	<view class="page">
		<view class="status-space"></view>

		<view class="topbar">
			<view class="back" hover-class="back--pressed" @tap="goBack">‹</view>
			<view class="mode-pill" hover-class="mode-pill--pressed" @tap="toggleMode">
				{{ mode === 'vinyl' ? '歌词' : '唱片' }}
			</view>
		</view>

		<view v-if="loadingPlaylist && !playlist" class="loading-screen">
			<view class="loading-ring"></view>
			<text>正在准备今晚的声音…</text>
		</view>

		<view v-else-if="playlistError && !playlist" class="state-card">
			<text class="state-title">播放页没有准备好</text>
			<text class="state-copy">{{ playlistError }}</text>
			<button class="state-btn" @tap="loadPlaylist">重新加载</button>
			<button class="state-link" @tap="goBack">返回歌单</button>
		</view>

		<view v-else-if="currentTrack" class="player-body">
			<image
				v-if="currentTrack.cover"
				class="ambient-cover"
				:src="currentTrack.cover"
				mode="aspectFill"
				@error="onCoverError"
			></image>
			<view class="ambient-scrim"></view>

			<view v-if="mode === 'vinyl'" class="vinyl-stage">
				<view class="vinyl" :class="{ 'vinyl--playing': isPlaying }">
					<view class="vinyl-grooves"></view>
					<image
						v-if="currentTrack.cover"
						class="vinyl-cover"
						:src="currentTrack.cover"
						mode="aspectFill"
						@error="onCoverError"
					></image>
					<view v-else class="vinyl-cover vinyl-cover--fallback">夜航</view>
					<view class="vinyl-pin"></view>
				</view>
				<text class="vinyl-hint">{{ isPlaying ? '正在旋转' : '已暂停' }}</text>
			</view>

			<view v-else class="lyric-stage">
				<view class="lyric-head">
					<image
						v-if="currentTrack.cover"
						class="mini-cover"
						:src="currentTrack.cover"
						mode="aspectFill"
						@error="onCoverError"
					></image>
					<view v-else class="mini-cover mini-cover--fallback">夜</view>
					<view class="lyric-head-text">
						<text class="lyric-title">{{ currentTrack.name }}</text>
						<text class="lyric-artist">{{ currentTrack.artist }}</text>
					</view>
				</view>
				<scroll-view
					v-if="lyricLines.length"
					class="lyric-scroll"
					scroll-y
					:scroll-into-view="lyricScrollTarget"
					scroll-with-animation
				>
					<view class="lyric-pad"></view>
					<view
						v-for="(line, index) in lyricLines"
						:id="'lyric-' + index"
						:key="index"
						class="lyric-line"
						:class="{ 'lyric-line--active': index === activeLyricIndex }"
					>
						{{ line.text }}
					</view>
					<view class="lyric-pad"></view>
				</scroll-view>
				<view v-else class="lyric-empty">
					<text>暂无歌词</text>
					<text class="lyric-empty-sub">听旋律，也很好。</text>
				</view>
			</view>

			<view v-if="mode === 'vinyl'" class="song-block">
				<text class="song-name">{{ currentTrack.name }}</text>
				<text class="song-artist">{{ currentTrack.artist }}</text>
				<text class="song-playlist">来自 {{ playlist.name }}</text>
			</view>

			<view class="progress-block">
				<view class="progress-bar">
					<view class="progress-fill" :style="{ width: progressPercent + '%' }"></view>
					<view class="progress-dot" :style="{ left: progressPercent + '%' }"></view>
				</view>
				<view class="progress-times">
					<text>{{ formatClock(currentTime) }}</text>
					<text>{{ formatClock(duration) }}</text>
				</view>
			</view>

			<view v-if="audioError" class="audio-error">{{ audioError }}</view>

			<view class="controls">
				<view class="control-btn" hover-class="control-btn--pressed" @tap="prev">⏮</view>
				<view class="play-btn" hover-class="play-btn--pressed" @tap="togglePlay">
					<text v-if="isLoading" class="play-glyph">…</text>
					<text v-else-if="isPlaying" class="play-glyph">❚❚</text>
					<text v-else class="play-glyph play-glyph--tri">▶</text>
				</view>
				<view class="control-btn" hover-class="control-btn--pressed" @tap="next">⏭</view>
			</view>

			<view class="mode-switch">
				<view class="mode-option" :class="{ active: mode === 'vinyl' }" @tap="setMode('vinyl')">唱片</view>
				<view class="mode-option" :class="{ active: mode === 'lyric' }" @tap="setMode('lyric')">歌词</view>
			</view>
		</view>
	</view>
</template>

<script>
	import { getLyric, getPlaylist, getSongUrl } from '../../utils/api.js'
	import { CACHE_KEYS, CACHE_TTL, isFresh, readCache, writeCache } from '../../utils/cache.js'
	import { formatClock } from '../../utils/format.js'
	import { findActiveLyricIndex, parseLrc } from '../../utils/lrc.js'
	import { recordPlay, updatePlayedSeconds } from '../../utils/stats.js'

	export default {
		data() {
			return {
				playlistId: '',
				songId: '',
				playlist: null,
				currentIndex: 0,
				currentTrack: null,
				mode: 'vinyl',
				loadingPlaylist: true,
				playlistError: '',
				isLoading: false,
				isPlaying: false,
				audioUrl: '',
				audioError: '',
				currentTime: 0,
				duration: 0,
				lyricLines: [],
				activeLyricIndex: -1,
				lyricScrollTarget: '',
				playSession: 0
			}
		},
		computed: {
			progressPercent() {
				if (!this.duration) {
					return 0
				}
				return Math.min(100, Math.max(0, (this.currentTime / this.duration) * 100))
			}
		},
		onLoad(options) {
			this.playlistId = options && options.playlistId ? String(options.playlistId) : ''
			this.songId = options && options.songId ? String(options.songId) : ''
			this.initialIndex = options && options.index ? Number(options.index) : 0
			this.autoPlay = options && String(options.autoplay) === '1'
			this.audio = null
			this.recordId = ''
			this.pageAlive = true
			if (!this.playlistId) {
				this.loadingPlaylist = false
				this.playlistError = '缺少歌单信息，请从歌单页进入。'
				return
			}
			this.loadPlaylist()
		},
		onUnload() {
			this.pageAlive = false
			this.playSession += 1
			this.flushListeningTime()
			this.destroyAudio()
		},
		methods: {
			formatClock,
			async loadPlaylist() {
				const key = CACHE_KEYS.playlist(this.playlistId)
				const cached = readCache(key)
				if (cached && isFresh(cached, CACHE_TTL.playlist)) {
					this.playlist = cached.data
				}

				this.playlistError = ''
				if (!this.playlist) {
					this.loadingPlaylist = true
				}

				try {
					const result = await getPlaylist(this.playlistId)
					this.playlist = result.data
					writeCache(key, this.playlist)
				} catch (error) {
					this.playlistError = error.message || '歌单加载失败'
					if (!this.playlist) {
						this.loadingPlaylist = false
						return
					}
				} finally {
					this.loadingPlaylist = false
				}

				if (!this.pageAlive) {
					return
				}

				if (!this.playlist || !Array.isArray(this.playlist.tracks) || !this.playlist.tracks.length) {
					this.playlistError = '这个歌单还没有可播放的曲目。'
					return
				}

				const byId = this.songId
					? this.playlist.tracks.findIndex(item => String(item.id) === this.songId)
					: -1
				this.currentIndex = byId >= 0 ? byId : Math.max(0, Math.min(this.initialIndex, this.playlist.tracks.length - 1))
				await this.loadTrack(this.currentIndex, Boolean(this.autoPlay))
			},
			ensureAudio() {
				if (this.audio) {
					return
				}
				const audio = uni.createInnerAudioContext()
				audio.autoplay = false
				audio.obeyMuteSwitch = false
				audio.onPlay(() => {
					this.isPlaying = true
					this.isLoading = false
					if (this.currentTrack && !this.recordId) {
						this.recordId = recordPlay(this.currentTrack, this.playlistId)
					}
				})
				audio.onPause(() => {
					this.isPlaying = false
					this.flushListeningTime()
				})
				audio.onStop(() => {
					this.isPlaying = false
					this.flushListeningTime()
				})
				audio.onWaiting(() => {
					this.isLoading = true
				})
				audio.onCanplay(() => {
					this.isLoading = false
				})
				audio.onTimeUpdate(() => {
					if (!this.audio) {
						return
					}
					this.currentTime = Number(this.audio.currentTime || 0)
					if (this.audio.duration) {
						this.duration = Number(this.audio.duration || this.duration)
					}
					const nextIndex = findActiveLyricIndex(this.lyricLines, this.currentTime)
					if (nextIndex !== this.activeLyricIndex) {
						this.activeLyricIndex = nextIndex
						if (this.mode === 'lyric' && nextIndex >= 0) {
							this.lyricScrollTarget = `lyric-${nextIndex}`
						}
					}
				})
				audio.onEnded(() => {
					this.flushListeningTime()
					if (this.currentIndex < this.playlist.tracks.length - 1) {
						this.loadTrack(this.currentIndex + 1, true)
					} else {
						this.isPlaying = false
						this.currentTime = this.duration
						uni.showToast({
							title: '歌单已播完',
							icon: 'none'
						})
					}
				})
				audio.onError(() => {
					this.isPlaying = false
					this.isLoading = false
					this.audioError = '播放失败，可能是试听/版权限制或网络不稳定。'
					uni.showToast({
						title: '播放失败，换一首试试',
						icon: 'none'
					})
				})
				this.audio = audio
			},
			async loadTrack(index, autoplay) {
				const track = this.playlist && this.playlist.tracks ? this.playlist.tracks[index] : null
				if (!track || !this.pageAlive) {
					return
				}
				this.playSession += 1
				const session = this.playSession
				this.flushListeningTime()
				this.destroyAudio()
				this.ensureAudio()

				this.currentIndex = index
				this.currentTrack = track
				this.audioError = ''
				this.isLoading = true
				this.isPlaying = false
				this.currentTime = 0
				this.duration = Number(track.duration || 0) / 1000
				this.lyricLines = []
				this.activeLyricIndex = -1
				this.lyricScrollTarget = ''
				this.recordId = ''
				this.audioUrl = ''

				const [urlResult, lyricResult] = await Promise.allSettled([
					getSongUrl(track.urlId),
					this.loadLyric(track)
				])

				if (!this.pageAlive || session !== this.playSession) {
					return
				}

				if (lyricResult.status === 'fulfilled' && Array.isArray(lyricResult.value)) {
					this.lyricLines = lyricResult.value
				}

				if (urlResult.status !== 'fulfilled') {
					this.isLoading = false
					this.audioError = urlResult.reason && urlResult.reason.message ? urlResult.reason.message : '播放地址获取失败'
					uni.showToast({
						title: '这首歌暂时没有播放地址',
						icon: 'none'
					})
					return
				}

				const url = urlResult.value && urlResult.value.data ? urlResult.value.data.url : ''
				if (!url) {
					this.isLoading = false
					this.audioError = urlResult.value.message || '该歌曲暂无可用播放地址'
					uni.showToast({
						title: '该歌曲暂无可用播放地址',
						icon: 'none'
					})
					return
				}

				if (!this.pageAlive || !this.audio || session !== this.playSession) {
					return
				}

				this.audioUrl = url
				this.audio.src = url
				this.isLoading = false
				if (autoplay) {
					this.playCurrent()
				}
			},
			async loadLyric(track) {
				const key = CACHE_KEYS.lyric(track.lyricId)
				const cached = readCache(key)
				let data = cached && cached.data ? cached.data : null

				if (!cached || !isFresh(cached, CACHE_TTL.lyric)) {
					try {
						const result = await getLyric(track.lyricId)
						data = result.data
						writeCache(key, data)
					} catch (error) {
						if (!data) {
							return []
						}
					}
				}

				return parseLrc(data && data.lyric ? data.lyric : '')
			},
			playCurrent() {
				if (!this.audio || !this.audioUrl) {
					return
				}
				if (this.currentTime >= this.duration - 0.5 && this.duration > 0) {
					this.audio.seek(0)
					this.currentTime = 0
					this.recordId = ''
				}
				try {
					this.audio.play()
				} catch (error) {
					this.audioError = '浏览器拦截了自动播放，请点击播放。'
				}
			},
			togglePlay() {
				if (this.isLoading) {
					uni.showToast({
						title: '正在准备音频',
						icon: 'none'
					})
					return
				}
				if (!this.audioUrl) {
					uni.showToast({
						title: '这首歌暂时没有播放地址',
						icon: 'none'
					})
					return
				}
				if (this.isPlaying) {
					this.audio.pause()
					return
				}
				this.playCurrent()
			},
			prev() {
				if (!this.playlist || !this.playlist.tracks.length) {
					return
				}
				const nextIndex =
					this.currentIndex > 0 ? this.currentIndex - 1 : this.playlist.tracks.length - 1
				this.loadTrack(nextIndex, true)
			},
			next() {
				if (!this.playlist || !this.playlist.tracks.length) {
					return
				}
				const nextIndex =
					this.currentIndex < this.playlist.tracks.length - 1 ? this.currentIndex + 1 : 0
				this.loadTrack(nextIndex, true)
			},
			setMode(mode) {
				this.mode = mode
				if (mode === 'lyric' && this.activeLyricIndex >= 0) {
					this.lyricScrollTarget = `lyric-${this.activeLyricIndex}`
				}
			},
			toggleMode() {
				this.setMode(this.mode === 'vinyl' ? 'lyric' : 'vinyl')
			},
			flushListeningTime() {
				if (this.recordId && this.currentTime > 0) {
					updatePlayedSeconds(this.recordId, this.currentTime)
				}
			},
			destroyAudio() {
				if (!this.audio) {
					return
				}
				try {
					this.audio.stop()
				} catch (error) {
					// ignore
				}
				try {
					this.audio.destroy()
				} catch (error) {
					// ignore
				}
				this.audio = null
			},
			onCoverError() {
				if (this.currentTrack) {
					this.currentTrack.cover = ''
				}
			},
			goBack() {
				uni.navigateBack({
					fail: () => {
						uni.switchTab({
							url: '/pages/index/index'
						})
					}
				})
			}
		}
	}
</script>

<style>
	.page {
		--ease: cubic-bezier(.2, .8, .2, 1);
		position: relative;
		min-height: 100vh;
		overflow: hidden;
		padding: 0 40rpx 64rpx;
		background:
			radial-gradient(circle at 50% 22%, rgba(255, 77, 90, .16), transparent 42%),
			#0B0B10;
	}
	.status-space {
		height: var(--status-bar-height);
	}
	.topbar {
		position: relative;
		z-index: 4;
		height: 88rpx;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.back {
		width: 64rpx;
		height: 64rpx;
		display: flex;
		align-items: center;
		color: #F7F3EE;
		font-size: 52rpx;
		font-weight: 300;
		line-height: 1;
	}
	.back--pressed {
		opacity: .6;
	}
	.mode-pill {
		padding: 10rpx 20rpx;
		border: 1rpx solid #2A2935;
		border-radius: 999rpx;
		color: #A7A3AE;
		font-size: 20rpx;
		line-height: 1.3;
		letter-spacing: 1rpx;
	}
	.mode-pill--pressed {
		background: #1B1B25;
	}
	.ambient-cover {
		position: absolute;
		top: 0;
		left: -80rpx;
		right: -80rpx;
		height: 760rpx;
		width: auto;
		opacity: .18;
		filter: blur(70rpx) saturate(1.1);
		transform: scale(1.2);
		z-index: 0;
	}
	.ambient-scrim {
		position: absolute;
		inset: 0;
		background: linear-gradient(180deg, rgba(11, 11, 16, .28) 0%, rgba(11, 11, 16, .72) 48%, #0B0B10 84%);
		z-index: 1;
	}
	.player-body {
		position: relative;
		z-index: 2;
		display: flex;
		flex-direction: column;
		min-height: calc(100vh - 120rpx);
	}
	.vinyl-stage,
	.lyric-stage,
	.song-block,
	.progress-block,
	.audio-error,
	.controls,
	.mode-switch {
		position: relative;
		z-index: 2;
	}
	.vinyl-stage {
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-top: 38rpx;
	}
	.vinyl {
		position: relative;
		width: 486rpx;
		height: 486rpx;
		border-radius: 50%;
		background:
			repeating-radial-gradient(circle at 50% 50%, #15151D 0 5rpx, #0A0A0F 5rpx 12rpx);
		box-shadow: 0 40rpx 110rpx rgba(0, 0, 0, .62), inset 0 0 0 1rpx rgba(255, 255, 255, .08);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.vinyl--playing {
		animation: vinyl-spin 18s linear infinite;
	}
	.vinyl-grooves {
		position: absolute;
		inset: 26rpx;
		border-radius: 50%;
		border: 1rpx solid rgba(255, 255, 255, .06);
		box-shadow: inset 0 0 0 18rpx rgba(255, 255, 255, .018), inset 0 0 0 40rpx rgba(255, 255, 255, .015);
	}
	.vinyl-cover {
		width: 286rpx;
		height: 286rpx;
		border-radius: 50%;
		border: 12rpx solid #08080C;
	}
	.vinyl-cover--fallback {
		display: flex;
		align-items: center;
		justify-content: center;
		background:
			radial-gradient(circle at 30% 25%, rgba(245, 200, 107, .3), transparent 30%),
			conic-gradient(from 20deg, #6B2433, #17111A, #2A1A22, #17111A, #6B2433);
		color: rgba(255, 255, 255, .55);
		font-size: 34rpx;
		letter-spacing: 6rpx;
	}
	.vinyl-pin {
		position: absolute;
		width: 18rpx;
		height: 18rpx;
		border-radius: 50%;
		background: #F5C86B;
		box-shadow: 0 0 24rpx rgba(245, 200, 107, .72);
	}
	.vinyl-hint {
		margin-top: 22rpx;
		color: #6E6A78;
		font-size: 20rpx;
		letter-spacing: 2rpx;
	}
	.lyric-stage {
		display: flex;
		flex-direction: column;
		min-height: 610rpx;
		padding-top: 18rpx;
	}
	.lyric-head {
		display: flex;
		align-items: center;
		gap: 18rpx;
	}
	.mini-cover {
		width: 82rpx;
		height: 82rpx;
		border-radius: 18rpx;
	}
	.mini-cover--fallback {
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(145deg, #6A2635, #1A121B);
		color: rgba(255, 255, 255, .5);
		font-size: 30rpx;
	}
	.lyric-head-text {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 5rpx;
	}
	.lyric-title {
		color: #F7F3EE;
		font-size: 28rpx;
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.lyric-artist {
		color: #A7A3AE;
		font-size: 21rpx;
	}
	.lyric-scroll {
		height: 500rpx;
		margin-top: 16rpx;
	}
	.lyric-pad {
		height: 170rpx;
	}
	.lyric-line {
		padding: 14rpx 0;
		color: #6E6A78;
		font-size: 28rpx;
		line-height: 1.6;
		text-align: center;
		transition: color .24s var(--ease);
	}
	.lyric-line--active {
		color: #F7F3EE;
		font-size: 34rpx;
		font-weight: 600;
	}
	.lyric-empty {
		height: 500rpx;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8rpx;
		color: #A7A3AE;
		font-size: 28rpx;
	}
	.lyric-empty-sub {
		color: #6E6A78;
		font-size: 22rpx;
	}
	.song-block {
		display: flex;
		flex-direction: column;
		gap: 6rpx;
		margin-top: 28rpx;
	}
	.song-name {
		color: #F7F3EE;
		font-size: 44rpx;
		line-height: 1.2;
		font-weight: 700;
		letter-spacing: -1rpx;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.song-artist {
		color: #A7A3AE;
		font-size: 24rpx;
		line-height: 1.5;
	}
	.song-playlist {
		color: #6E6A78;
		font-size: 20rpx;
		line-height: 1.5;
		letter-spacing: .5rpx;
	}
	.progress-block {
		margin-top: 32rpx;
	}
	.progress-bar {
		position: relative;
		height: 6rpx;
		border-radius: 999rpx;
		background: #2A2935;
	}
	.progress-fill {
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		border-radius: 999rpx;
		background: linear-gradient(90deg, #C83242, #FF4D5A);
		transition: width .2s linear;
	}
	.progress-dot {
		position: absolute;
		top: 50%;
		width: 16rpx;
		height: 16rpx;
		border-radius: 50%;
		background: #FF4D5A;
		transform: translate(-50%, -50%);
		box-shadow: 0 0 16rpx rgba(255, 77, 90, .65);
	}
	.progress-times {
		display: flex;
		justify-content: space-between;
		margin-top: 12rpx;
		color: #6E6A78;
		font-size: 20rpx;
		font-variant-numeric: tabular-nums;
	}
	.audio-error {
		margin-top: 16rpx;
		color: #FF8E96;
		font-size: 22rpx;
		line-height: 1.6;
		text-align: center;
	}
	.controls {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 56rpx;
		margin-top: 34rpx;
	}
	.control-btn {
		width: 88rpx;
		height: 88rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #A7A3AE;
		font-size: 34rpx;
		line-height: 1;
	}
	.control-btn--pressed {
		color: #F7F3EE;
		transform: scale(.94);
	}
	.play-btn {
		width: 132rpx;
		height: 132rpx;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #FF4D5A;
		color: #FFFFFF;
		box-shadow: 0 20rpx 50rpx rgba(255, 77, 90, .34);
	}
	.play-btn--pressed {
		transform: scale(.94);
		opacity: .9;
	}
	.play-glyph {
		font-size: 32rpx;
		line-height: 1;
		letter-spacing: 2rpx;
	}
	.play-glyph--tri {
		font-size: 38rpx;
		text-indent: 4rpx;
	}
	.mode-switch {
		display: flex;
		justify-content: center;
		gap: 44rpx;
		margin-top: 34rpx;
	}
	.mode-option {
		padding: 6rpx 0;
		color: #6E6A78;
		font-size: 22rpx;
		line-height: 1.4;
		border-bottom: 1rpx solid transparent;
	}
	.mode-option.active {
		color: #F7F3EE;
		border-color: #FF4D5A;
	}
	.loading-screen {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 70vh;
		gap: 24rpx;
		color: #A7A3AE;
		font-size: 26rpx;
	}
	.loading-ring {
		width: 56rpx;
		height: 56rpx;
		border-radius: 50%;
		border: 4rpx solid #2A2935;
		border-top-color: #FF4D5A;
		animation: ring-spin .8s linear infinite;
	}
	.state-card {
		margin-top: 30rpx;
		padding: 40rpx 32rpx;
		border: 1rpx solid #2A2935;
		border-radius: 32rpx;
		background: #14141C;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
	}
	.state-title {
		color: #F7F3EE;
		font-size: 36rpx;
		font-weight: 600;
	}
	.state-copy {
		margin-top: 12rpx;
		color: #A7A3AE;
		font-size: 24rpx;
		line-height: 1.7;
	}
	.state-btn {
		margin-top: 26rpx;
		height: 72rpx;
		padding: 0 28rpx;
		border-radius: 999rpx;
		background: #FF4D5A;
		color: #FFFFFF;
		font-size: 24rpx;
		font-weight: 600;
		line-height: 72rpx;
	}
	.state-link {
		margin: 8rpx 0 0;
		padding: 0;
		height: 56rpx;
		background: transparent;
		color: #6E6A78;
		font-size: 22rpx;
		line-height: 56rpx;
	}
	@keyframes vinyl-spin {
		to {
			transform: rotate(360deg);
		}
	}
	@keyframes ring-spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
