<template>
	<view class="page">
		<view class="status-space"></view>

		<view class="page-head">
			<text class="kicker">CLOUD MUSIC · 08</text>
			<text class="display">今晚，听点什么</text>
			<text class="lede">把耳机戴上，让城市退后。</text>
		</view>

		<view v-if="stale" class="stale-banner">
			<view class="stale-dot"></view>
			<text>数据可能不是最新 · 使用上次缓存</text>
		</view>

		<view v-if="error && !playlists.length" class="state-card">
			<text class="state-title">音乐服务没有回应</text>
			<text class="state-copy">{{ error }}</text>
			<button class="state-btn" @tap="loadPlaylists">重新连接</button>
		</view>

		<view v-else-if="loading && !playlists.length" class="skeleton-list">
			<view class="skeleton skeleton-hero"></view>
			<view v-for="n in 2" :key="n" class="skeleton-row">
				<view class="skeleton skeleton-cover"></view>
				<view class="skeleton-lines">
					<view class="skeleton skeleton-line"></view>
					<view class="skeleton skeleton-line short"></view>
				</view>
			</view>
		</view>

		<view v-else class="content">
			<view
				v-if="featured"
				class="hero"
				hover-class="hero--pressed"
				@tap="goPlaylist(featured.id)"
			>
				<image
					v-if="featured.cover"
					class="hero-cover"
					:src="featured.cover"
					mode="aspectFill"
					@error="featured.cover = ''"
				></image>
				<view v-else class="hero-cover hero-cover--fallback"></view>
				<view class="hero-shade"></view>
				<view class="hero-content">
					<text class="hero-tag">本周精选</text>
					<text class="hero-name">{{ featured.name }}</text>
					<view class="hero-foot">
						<text class="hero-meta">{{ heroMeta }}</text>
						<view class="hero-play">▶</view>
					</view>
				</view>
			</view>

			<view class="section-head">
				<text class="section-title">为你推荐</text>
				<text class="section-meta">{{ restPlaylists.length }} 个歌单</text>
			</view>

			<view class="playlist-list">
				<view
					v-for="(item, index) in restPlaylists"
					:key="item.id"
					class="playlist-row"
					hover-class="playlist-row--pressed"
					@tap="goPlaylist(item.id)"
				>
					<view class="row-cover-wrap">
						<image
							v-if="item.cover"
							class="row-cover"
							:src="item.cover"
							mode="aspectFill"
							@error="item.cover = ''"
						></image>
						<view v-else class="row-cover row-cover--fallback" :class="'fallback-' + (index % 3)">
							{{ item.name.slice(0, 1) }}
						</view>
					</view>
					<view class="row-main">
						<text class="row-name">{{ item.name }}</text>
						<text class="row-copy">{{ rowMeta(item) }}</text>
					</view>
					<text class="row-arrow">›</text>
				</view>
			</view>

			<text class="data-note">DATA FROM LOCAL METING · {{ cacheHint }}</text>
		</view>
	</view>
</template>

<script>
	import { getPlaylists } from '../../utils/api.js'
	import {
		CACHE_KEYS,
		CACHE_TTL,
		cacheAgeText,
		isFresh,
		readCache,
		writeCache
	} from '../../utils/cache.js'
	import { formatCount } from '../../utils/format.js'

	export default {
		data() {
			return {
				playlists: [],
				loading: true,
				error: '',
				stale: false,
				cacheAge: '',
				cacheHint: '实时同步'
			}
		},
		computed: {
			featured() {
				return this.playlists[0] || null
			},
			restPlaylists() {
				return this.playlists.slice(1)
			},
			heroMeta() {
				if (!this.featured) {
					return ''
				}
				return `${formatCount(this.featured.trackCount)} 首 · ${this.featured.description || '此刻最热'}`
			}
		},
		onLoad() {
			this.loadPlaylists()
		},
		onPullDownRefresh() {
			this.loadPlaylists().finally(() => {
				uni.stopPullDownRefresh()
			})
		},
		methods: {
			async loadPlaylists() {
				const cached = readCache(CACHE_KEYS.playlists)
				if (cached) {
					this.playlists = Array.isArray(cached.data) ? cached.data : []
					this.stale = !isFresh(cached, CACHE_TTL.playlists)
					this.cacheAge = cacheAgeText(cached)
					this.cacheHint = this.cacheAge || '实时同步'
				}

				this.error = ''
				if (!cached) {
					this.loading = true
				}

				try {
					const result = await getPlaylists()
					this.playlists = Array.isArray(result.data) ? result.data : []
					this.stale = Boolean(result.stale)
					this.cacheAge = ''
					this.cacheHint = result.cacheHit ? '缓存命中' : '实时同步'
					writeCache(CACHE_KEYS.playlists, this.playlists)
				} catch (error) {
					this.error = error.message || '音乐服务暂时不可用'
					if (this.playlists.length) {
						this.stale = true
						this.cacheAge = this.cacheAge || '使用上次缓存'
					}
				} finally {
					this.loading = false
				}
			},
			rowMeta(item) {
				if (item.trackCount) {
					return `${formatCount(item.trackCount)} 首 · ${item.description || '精选歌单'}`
				}
				return item.description || '精选歌单'
			},
			goPlaylist(id) {
				if (!id) {
					return
				}
				uni.navigateTo({
					url: `/pages/playlist/playlist?id=${encodeURIComponent(id)}`
				})
			}
		}
	}
</script>

<style>
	.page {
		min-height: 100vh;
		padding: 0 32rpx 180rpx;
		background:
			radial-gradient(circle at 8% 0%, rgba(255, 77, 90, .12), transparent 34%),
			#0B0B10;
	}
	.status-space {
		height: var(--status-bar-height);
	}
	.page-head {
		display: flex;
		flex-direction: column;
		gap: 10rpx;
		padding: 52rpx 0 30rpx;
	}
	.kicker {
		color: #FF4D5A;
		font-size: 20rpx;
		line-height: 1.4;
		letter-spacing: 5rpx;
		font-weight: 600;
	}
	.display {
		color: #F7F3EE;
		font-size: 64rpx;
		line-height: 1.12;
		letter-spacing: -2rpx;
		font-weight: 700;
	}
	.lede {
		color: #A7A3AE;
		font-size: 26rpx;
		line-height: 1.6;
	}
	.stale-banner {
		display: flex;
		align-items: center;
		gap: 12rpx;
		margin: 0 0 20rpx;
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
	.hero {
		position: relative;
		height: 340rpx;
		overflow: hidden;
		border-radius: 32rpx;
		background: #14141C;
		box-shadow: 0 24rpx 80rpx rgba(0, 0, 0, .35);
	}
	.hero--pressed {
		opacity: .9;
	}
	.hero-cover {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}
	.hero-cover--fallback {
		background:
			radial-gradient(circle at 28% 22%, rgba(245, 200, 107, .35), transparent 26%),
			linear-gradient(135deg, #742636, #17111A 62%, #0E0D12);
	}
	.hero-shade {
		position: absolute;
		inset: 0;
		background: linear-gradient(90deg, rgba(11, 11, 16, .12) 0%, rgba(11, 11, 16, .86) 72%, rgba(11, 11, 16, .95) 100%);
	}
	.hero-content {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		padding: 28rpx;
	}
	.hero-tag {
		align-self: flex-start;
		padding: 6rpx 12rpx;
		border-radius: 999rpx;
		background: rgba(255, 77, 90, .18);
		color: #FF8E96;
		font-size: 18rpx;
		line-height: 1.4;
		letter-spacing: 2rpx;
		font-weight: 600;
	}
	.hero-name {
		margin-top: 12rpx;
		color: #F7F3EE;
		font-size: 48rpx;
		line-height: 1.2;
		font-weight: 700;
		letter-spacing: -1rpx;
	}
	.hero-foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16rpx;
		margin-top: 10rpx;
	}
	.hero-meta {
		flex: 1;
		color: #A7A3AE;
		font-size: 22rpx;
		line-height: 1.5;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
	.hero-play {
		width: 76rpx;
		height: 76rpx;
		flex: 0 0 76rpx;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #FF4D5A;
		color: #FFFFFF;
		font-size: 24rpx;
		text-indent: 3rpx;
		box-shadow: 0 16rpx 36rpx rgba(255, 77, 90, .3);
	}
	.section-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		margin: 44rpx 0 10rpx;
	}
	.section-title {
		color: #F7F3EE;
		font-size: 32rpx;
		font-weight: 600;
		line-height: 1.3;
	}
	.section-meta {
		color: #6E6A78;
		font-size: 20rpx;
		letter-spacing: 1rpx;
	}
	.playlist-list {
		border-top: 1rpx solid rgba(255, 255, 255, .07);
	}
	.playlist-row {
		display: flex;
		align-items: center;
		gap: 20rpx;
		min-height: 124rpx;
		padding: 16rpx 0;
		border-bottom: 1rpx solid rgba(255, 255, 255, .06);
	}
	.playlist-row--pressed {
		background: rgba(255, 255, 255, .03);
	}
	.row-cover-wrap {
		width: 96rpx;
		height: 96rpx;
		flex: 0 0 96rpx;
		overflow: hidden;
		border-radius: 20rpx;
	}
	.row-cover {
		width: 96rpx;
		height: 96rpx;
	}
	.row-cover--fallback {
		display: flex;
		align-items: center;
		justify-content: center;
		color: rgba(255, 255, 255, .55);
		font-size: 30rpx;
		font-weight: 700;
	}
	.fallback-0 {
		background: linear-gradient(145deg, #6A2635, #1A121B);
	}
	.fallback-1 {
		background: linear-gradient(145deg, #26364A, #12161E);
	}
	.fallback-2 {
		background: linear-gradient(145deg, #4A3A21, #18150F);
	}
	.row-main {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 6rpx;
	}
	.row-name {
		color: #F7F3EE;
		font-size: 28rpx;
		font-weight: 600;
		line-height: 1.4;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.row-copy {
		color: #A7A3AE;
		font-size: 22rpx;
		line-height: 1.5;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.row-arrow {
		color: #6E6A78;
		font-size: 38rpx;
		font-weight: 300;
		line-height: 1;
	}
	.data-note {
		display: block;
		margin-top: 30rpx;
		color: #4E4A57;
		font-size: 18rpx;
		line-height: 1.5;
		letter-spacing: 1rpx;
		text-align: center;
	}
	.state-card {
		margin-top: 28rpx;
		padding: 32rpx;
		border: 1rpx solid #2A2935;
		border-radius: 32rpx;
		background: #14141C;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
	}
	.state-title {
		color: #F7F3EE;
		font-size: 32rpx;
		font-weight: 600;
	}
	.state-copy {
		margin-top: 10rpx;
		color: #A7A3AE;
		font-size: 24rpx;
		line-height: 1.7;
	}
	.state-btn {
		margin-top: 24rpx;
		height: 72rpx;
		padding: 0 28rpx;
		border-radius: 999rpx;
		background: #FF4D5A;
		color: #FFFFFF;
		font-size: 24rpx;
		font-weight: 600;
		line-height: 72rpx;
	}
	.skeleton-list {
		display: flex;
		flex-direction: column;
		gap: 18rpx;
		margin-top: 24rpx;
	}
	.skeleton {
		border-radius: 20rpx;
		background: linear-gradient(90deg, #171720 20%, #20202C 50%, #171720 80%);
	}
	.skeleton-hero {
		height: 340rpx;
		border-radius: 32rpx;
	}
	.skeleton-row {
		display: flex;
		gap: 18rpx;
		align-items: center;
	}
	.skeleton-cover {
		width: 96rpx;
		height: 96rpx;
	}
	.skeleton-lines {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 12rpx;
	}
	.skeleton-line {
		height: 24rpx;
	}
	.skeleton-line.short {
		width: 58%;
	}
</style>
