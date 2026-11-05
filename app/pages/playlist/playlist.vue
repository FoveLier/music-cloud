<template>
	<view class="page">
		<view class="status-space"></view>

		<view class="topbar">
			<view class="back" hover-class="back--pressed" @tap="goBack">‹</view>
			<text class="topbar-title">歌单</text>
			<view class="topbar-spacer"></view>
		</view>

		<view v-if="stale" class="stale-banner">
			<view class="stale-dot"></view>
			<text>数据可能不是最新 · 使用上次缓存</text>
		</view>

		<view v-if="loading && !playlist" class="loading-card">
			<view class="loading-cover"></view>
			<view class="loading-lines">
				<view class="loading-line wide"></view>
				<view class="loading-line"></view>
				<view class="loading-line short"></view>
			</view>
		</view>

		<view v-else-if="error && !playlist" class="state-card">
			<text class="state-title">歌单走丢了</text>
			<text class="state-copy">{{ error }}</text>
			<button class="state-btn" @tap="retry">再试一次</button>
			<button class="state-link" @tap="goBack">返回发现</button>
		</view>

		<view v-else-if="playlist" class="playlist-body">
			<view class="playlist-hero">
				<image
					v-if="playlist.cover"
					class="hero-backdrop"
					:src="playlist.cover"
					mode="aspectFill"
					@error="onCoverError"
				></image>
				<view v-else class="hero-backdrop hero-backdrop--fallback"></view>
				<view class="hero-scrim"></view>
				<view class="hero-inner">
					<view class="cover-wrap">
						<image
							v-if="playlist.cover"
							class="cover"
							:src="playlist.cover"
							mode="aspectFill"
							@error="onCoverError"
						></image>
						<view v-else class="cover cover--fallback">{{ playlist.name.slice(0, 1) }}</view>
					</view>
					<view class="hero-info">
						<text class="hero-name">{{ playlist.name }}</text>
						<text class="hero-count">{{ playlist.trackCount }} 首 · {{ playlist.description }}</text>
						<view class="hero-actions">
							<view class="play-all" hover-class="play-all--pressed" @tap="playAll">
								<text class="play-icon">▶</text>
								<text>播放全部</text>
							</view>
						</view>
					</view>
				</view>
			</view>

			<view class="track-head">
				<text>曲目</text>
				<text>{{ playlist.tracks.length }} 首</text>
			</view>

			<view class="track-list">
				<view
					v-for="(item, index) in playlist.tracks"
					:key="item.id"
					class="track-row"
					:class="{ 'track-row--active': activeSongId === item.id }"
					hover-class="track-row--pressed"
					@tap="goPlayer(item, index, true)"
				>
					<text class="track-index">{{ String(index + 1).padStart(2, '0') }}</text>
					<view class="track-main">
						<text class="track-name">{{ item.name }}</text>
						<text class="track-artist">{{ item.artist }}</text>
					</view>
					<text class="track-duration">{{ formatDuration(item.duration) }}</text>
					<view class="mini-play" hover-class="mini-play--pressed" @tap.stop="goPlayer(item, index, true)">
						▶
					</view>
				</view>
			</view>

			<text class="data-note">点击曲目进入播放页 · 播放地址不缓存</text>
		</view>
	</view>
</template>

<script>
	import { getPlaylist } from '../../utils/api.js'
	import {
		CACHE_KEYS,
		CACHE_TTL,
		cacheAgeText,
		isFresh,
		readCache,
		writeCache
	} from '../../utils/cache.js'
	import { formatDuration } from '../../utils/format.js'

	export default {
		data() {
			return {
				playlistId: '',
				playlist: null,
				loading: true,
				error: '',
				stale: false,
				cacheAge: '',
				activeSongId: ''
			}
		},
		onLoad(options) {
			this.playlistId = options && options.id ? String(options.id) : ''
			if (!this.playlistId) {
				this.loading = false
				this.error = '缺少歌单 ID，请从首页重新进入。'
				return
			}
			this.loadPlaylist()
		},
		onPullDownRefresh() {
			this.loadPlaylist().finally(() => {
				uni.stopPullDownRefresh()
			})
		},
		methods: {
			formatDuration,
			async loadPlaylist() {
				const key = CACHE_KEYS.playlist(this.playlistId)
				const cached = readCache(key)
				if (cached) {
					this.playlist = cached.data
					this.stale = !isFresh(cached, CACHE_TTL.playlist)
					this.cacheAge = cacheAgeText(cached)
				}

				this.error = ''
				if (!cached) {
					this.loading = true
				}

				try {
					const result = await getPlaylist(this.playlistId)
					this.playlist = result.data
					this.stale = Boolean(result.stale)
					this.cacheAge = ''
					writeCache(key, this.playlist)
				} catch (error) {
					this.error = error.message || '歌单暂时不可用'
					if (this.playlist) {
						this.stale = true
						this.cacheAge = this.cacheAge || '使用上次缓存'
					}
				} finally {
					this.loading = false
				}
			},
			retry() {
				this.loadPlaylist()
			},
			playAll() {
				if (!this.playlist || !this.playlist.tracks.length) {
					uni.showToast({
						title: '这个歌单还没有曲目',
						icon: 'none'
					})
					return
				}
				this.activeSongId = this.playlist.tracks[0].id
				this.goPlayer(this.playlist.tracks[0], 0, true)
			},
			onCoverError() {
				if (this.playlist) {
					this.playlist.cover = ''
				}
			},
			goPlayer(track, index, autoplay = false) {
				if (!track || !track.id) {
					return
				}
				this.activeSongId = track.id
				uni.navigateTo({
					url: `/pages/player/player?playlistId=${encodeURIComponent(
						this.playlistId
					)}&songId=${encodeURIComponent(track.id)}&index=${index}&autoplay=${
						autoplay ? 1 : 0
					}`
				})
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
		min-height: 100vh;
		padding: 0 32rpx 80rpx;
		background:
			radial-gradient(circle at 18% 0%, rgba(255, 77, 90, .16), transparent 38%),
			#0B0B10;
	}
	.status-space {
		height: var(--status-bar-height);
	}
	.topbar {
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
		justify-content: flex-start;
		color: #F7F3EE;
		font-size: 52rpx;
		font-weight: 300;
		line-height: 1;
	}
	.back--pressed {
		opacity: .6;
	}
	.topbar-title {
		color: #A7A3AE;
		font-size: 22rpx;
		letter-spacing: 2rpx;
	}
	.topbar-spacer {
		width: 64rpx;
	}
	.stale-banner {
		display: flex;
		align-items: center;
		gap: 12rpx;
		margin-bottom: 18rpx;
		padding: 16rpx 20rpx;
		border: 1rpx solid rgba(245, 200, 107, .2);
		border-radius: 16rpx;
		background: rgba(245, 200, 107, .08);
		color: #F5C86B;
		font-size: 22rpx;
		line-height: 1.5;
	}
	.stale-dot {
		width: 10rpx;
		height: 10rpx;
		border-radius: 50%;
		background: #F5C86B;
	}
	.playlist-hero {
		position: relative;
		overflow: hidden;
		min-height: 360rpx;
		border-radius: 32rpx;
		background: #14141C;
	}
	.hero-backdrop {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		opacity: .45;
		filter: saturate(.9);
	}
	.hero-backdrop--fallback {
		background:
			radial-gradient(circle at 20% 20%, rgba(245, 200, 107, .3), transparent 30%),
			linear-gradient(145deg, #7B2C3A, #18111A 68%);
		opacity: 1;
	}
	.hero-scrim {
		position: absolute;
		inset: 0;
		background: linear-gradient(100deg, rgba(11, 11, 16, .86) 0%, rgba(11, 11, 16, .58) 58%, rgba(11, 11, 16, .86) 100%);
	}
	.hero-inner {
		position: relative;
		display: flex;
		gap: 28rpx;
		align-items: center;
		padding: 32rpx;
	}
	.cover-wrap {
		width: 232rpx;
		height: 232rpx;
		flex: 0 0 232rpx;
		overflow: hidden;
		border-radius: 28rpx;
		background: #1B1B25;
		box-shadow: 0 20rpx 50rpx rgba(0, 0, 0, .4);
	}
	.cover {
		width: 232rpx;
		height: 232rpx;
	}
	.cover--fallback {
		display: flex;
		align-items: center;
		justify-content: center;
		color: rgba(255, 255, 255, .45);
		font-size: 72rpx;
		font-weight: 700;
	}
	.hero-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 12rpx;
	}
	.hero-name {
		color: #F7F3EE;
		font-size: 44rpx;
		line-height: 1.2;
		font-weight: 700;
		letter-spacing: -1rpx;
	}
	.hero-count {
		color: #A7A3AE;
		font-size: 22rpx;
		line-height: 1.6;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		overflow: hidden;
		-webkit-box-orient: vertical;
	}
	.hero-actions {
		display: flex;
		margin-top: 4rpx;
	}
	.play-all {
		display: inline-flex;
		align-items: center;
		gap: 8rpx;
		height: 64rpx;
		padding: 0 24rpx;
		border-radius: 999rpx;
		background: #FF4D5A;
		color: #FFFFFF;
		font-size: 22rpx;
		font-weight: 600;
		line-height: 64rpx;
		box-shadow: 0 12rpx 30rpx rgba(255, 77, 90, .28);
	}
	.play-all--pressed {
		opacity: .82;
	}
	.play-icon {
		font-size: 18rpx;
		text-indent: 2rpx;
	}
	.track-head {
		display: flex;
		justify-content: space-between;
		margin: 40rpx 0 8rpx;
		color: #6E6A78;
		font-size: 22rpx;
		line-height: 1.5;
		letter-spacing: 1rpx;
	}
	.track-list {
		border-top: 1rpx solid rgba(255, 255, 255, .07);
	}
	.track-row {
		display: flex;
		align-items: center;
		gap: 14rpx;
		min-height: 112rpx;
		padding: 12rpx 0;
		border-bottom: 1rpx solid rgba(255, 255, 255, .055);
	}
	.track-row--pressed {
		background: rgba(255, 255, 255, .03);
	}
	.track-row--active {
		border-left: 4rpx solid #FF4D5A;
		padding-left: 12rpx;
		background: linear-gradient(90deg, rgba(255, 77, 90, .08), transparent);
	}
	.track-index {
		width: 40rpx;
		flex: 0 0 40rpx;
		color: #6E6A78;
		font-size: 20rpx;
		line-height: 1.5;
		font-variant-numeric: tabular-nums;
	}
	.track-row--active .track-index {
		color: #FF4D5A;
	}
	.track-main {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 4rpx;
	}
	.track-name {
		color: #F7F3EE;
		font-size: 28rpx;
		line-height: 1.4;
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.track-artist {
		color: #6E6A78;
		font-size: 22rpx;
		line-height: 1.4;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.track-duration {
		color: #6E6A78;
		font-size: 20rpx;
		line-height: 1.4;
		font-variant-numeric: tabular-nums;
	}
	.mini-play {
		width: 54rpx;
		height: 54rpx;
		flex: 0 0 54rpx;
		border: 1rpx solid rgba(255, 77, 90, .38);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #FF4D5A;
		font-size: 16rpx;
		line-height: 1;
		text-indent: 2rpx;
	}
	.mini-play--pressed {
		background: rgba(255, 77, 90, .14);
	}
	.data-note {
		display: block;
		margin-top: 28rpx;
		color: #4E4A57;
		font-size: 18rpx;
		line-height: 1.5;
		letter-spacing: .5rpx;
		text-align: center;
	}
	.loading-card {
		display: flex;
		gap: 28rpx;
		align-items: center;
		padding: 32rpx;
		border: 1rpx solid #2A2935;
		border-radius: 32rpx;
		background: #14141C;
	}
	.loading-cover {
		width: 200rpx;
		height: 200rpx;
		flex: 0 0 200rpx;
		border-radius: 24rpx;
		background: linear-gradient(90deg, #171720 20%, #20202C 50%, #171720 80%);
		background-size: 200% 100%;

	}
	.loading-lines {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 16rpx;
	}
	.loading-line {
		height: 24rpx;
		border-radius: 12rpx;
		background: linear-gradient(90deg, #171720 20%, #20202C 50%, #171720 80%);
		background-size: 200% 100%;

	}
	.loading-line.wide {
		height: 40rpx;
		width: 80%;
	}
	.loading-line.short {
		width: 52%;
	}
	.state-card {
		margin-top: 24rpx;
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
</style>
