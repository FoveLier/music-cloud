<template>
	<view class="page">
		<view class="status-space"></view>

		<view class="page-head">
			<text class="kicker">LISTENING REPORT</text>
			<text class="display">听歌报告</text>
			<text class="lede">你的夜航记录，来自本机播放。</text>
		</view>

		<view v-if="!hasData" class="empty-card">
			<view class="empty-vinyl">
				<view class="empty-pin"></view>
			</view>
			<text class="empty-title">还没有播放记录</text>
			<text class="empty-copy">去发现一首歌，报告会自己长出来。</text>
			<button class="empty-btn" @tap="goDiscover">去发现歌单</button>
		</view>

		<view v-else class="report">
			<view class="summary-grid">
				<view class="summary-card">
					<text class="summary-value">{{ stats.totalPlays }}</text>
					<text class="summary-label">总播放</text>
				</view>
				<view class="summary-card">
					<text class="summary-value">{{ stats.uniqueSongs }}</text>
					<text class="summary-label">首歌</text>
				</view>
				<view class="summary-card">
					<text class="summary-value gold">{{ stats.totalMinutes }}</text>
					<text class="summary-label">分钟</text>
				</view>
			</view>

			<view class="chart-card">
				<view class="chart-head">
					<text class="chart-title">播放次数 Top 10</text>
					<text class="chart-meta">本机记录</text>
				</view>
				<view class="chart-box">
					<qiun-data-charts
						type="column"
						:chartData="topChart"
						:opts="columnOpts"
						:canvas2d="false"
					/>
				</view>
				<text class="chart-note">同一首暂停后继续，不重复计数。</text>
			</view>

			<view class="chart-card">
				<view class="chart-head">
					<text class="chart-title">最近 7 天听歌时长</text>
					<text class="chart-meta">分钟</text>
				</view>
				<view class="chart-box">
					<qiun-data-charts
						type="line"
						:chartData="dailyChart"
						:opts="lineOpts"
						:canvas2d="false"
					/>
				</view>
				<text class="chart-note">按实际播放秒数聚合，不是歌曲总时长。</text>
			</view>

			<view class="footer-row">
				<text class="footer-note">DATA FROM LOCAL STORAGE</text>
				<text class="clear-link" @tap="clearStats">清空记录</text>
			</view>
		</view>
	</view>
</template>

<script>
	import { aggregateStats, clearPlayRecords, getPlayRecords } from '../../utils/stats.js'

	const STYLE = {
		column: {
			color: ['#FF4D5A', '#F5C86B'],
			padding: [16, 16, 4, 8],
			background: 'transparent',
			legend: { show: false },
			xAxis: {
				disableGrid: true,
				fontColor: '#6E6A78',
				fontSize: 10,
				rotateLabel: true,
				axisLineColor: '#2A2935'
			},
			yAxis: {
				gridColor: '#24232F',
				fontColor: '#6E6A78',
				fontSize: 10,
				data: [{ min: 0 }]
			},
			extra: {
				column: {
					width: 18,
					barBorderRadius: [4, 4, 0, 0]
				}
			}
		},
		line: {
			color: ['#F5C86B'],
			padding: [16, 16, 4, 8],
			background: 'transparent',
			legend: { show: false },
			xAxis: {
				disableGrid: true,
				fontColor: '#6E6A78',
				fontSize: 10,
				axisLineColor: '#2A2935'
			},
			yAxis: {
				gridColor: '#24232F',
				fontColor: '#6E6A78',
				fontSize: 10,
				data: [{ min: 0 }]
			},
			extra: {
				line: {
					width: 2,
					activeType: 'hollow'
				}
			}
		}
	}

	export default {
		data() {
			return {
				stats: {
					totalPlays: 0,
					uniqueSongs: 0,
					totalMinutes: 0,
					topSongs: [],
					dailyMinutes: []
				},
				topChart: { categories: [], series: [] },
				dailyChart: { categories: [], series: [] },
				columnOpts: STYLE.column,
				lineOpts: STYLE.line
			}
		},
		computed: {
			hasData() {
				return this.stats.totalPlays > 0
			}
		},
		onShow() {
			this.loadStats()
		},
		methods: {
			loadStats() {
				const records = getPlayRecords()
				const stats = aggregateStats(records)
				this.stats = stats

				const maxPlays = Math.max(1, ...stats.topSongs.map(item => item.plays))
				const playAxisMax = maxPlays <= 5 ? maxPlays : Math.ceil(maxPlays / 5) * 5
				const playSplit = maxPlays <= 5 ? maxPlays : 5

				this.topChart = {
					categories: stats.topSongs.map(item =>
						item.name.length > 5 ? `${item.name.slice(0, 5)}…` : item.name
					),
					series: [
						{
							name: '播放次数',
							data: stats.topSongs.map(item => item.plays)
						}
					]
				}
				this.columnOpts = {
					...STYLE.column,
					xAxis: {
						...STYLE.column.xAxis,
						rotateLabel: false,
						...(stats.topSongs.length > 5 ? { labelCount: 5 } : {})
					},
					yAxis: {
						...STYLE.column.yAxis,
						splitNumber: playSplit,
						data: [{ min: 0, max: playAxisMax }]
					}
				}

				const maxMinutes = Math.max(1, ...stats.dailyMinutes.map(item => item.minutes))
				const minuteAxisMax = maxMinutes <= 5 ? maxMinutes : Math.ceil(maxMinutes / 5) * 5
				const minuteSplit = maxMinutes <= 5 ? maxMinutes : 5

				this.dailyChart = {
					categories: stats.dailyMinutes.map(item => item.label),
					series: [
						{
							name: '听歌时长',
							data: stats.dailyMinutes.map(item => item.minutes)
						}
					]
				}
				this.lineOpts = {
					...STYLE.line,
					yAxis: {
						...STYLE.line.yAxis,
						splitNumber: minuteSplit,
						data: [{ min: 0, max: minuteAxisMax }]
					}
				}
			},
			goDiscover() {
				uni.switchTab({
					url: '/pages/index/index'
				})
			},
			clearStats() {
				uni.showModal({
					title: '清空听歌记录',
					content: '只删除本机播放记录，不会影响歌单数据。',
					success: result => {
						if (!result.confirm) {
							return
						}
						clearPlayRecords()
						this.loadStats()
						uni.showToast({
							title: '记录已清空',
							icon: 'none'
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
		padding: 0 32rpx 180rpx;
		background:
			radial-gradient(circle at 92% 2%, rgba(245, 200, 107, .08), transparent 30%),
			radial-gradient(circle at 8% 0%, rgba(255, 77, 90, .1), transparent 35%),
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
		color: #F5C86B;
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
	.summary-grid {
		display: flex;
		gap: 16rpx;
	}
	.summary-card {
		flex: 1;
		min-width: 0;
		padding: 24rpx 20rpx;
		border: 1rpx solid #2A2935;
		border-radius: 24rpx;
		background: #14141C;
	}
	.summary-value {
		display: block;
		color: #F7F3EE;
		font-size: 54rpx;
		line-height: 1.1;
		font-weight: 700;
		letter-spacing: -2rpx;
		font-variant-numeric: tabular-nums;
	}
	.summary-value.gold {
		color: #F5C86B;
	}
	.summary-label {
		display: block;
		margin-top: 10rpx;
		color: #6E6A78;
		font-size: 20rpx;
		line-height: 1.4;
	}
	.chart-card {
		margin-top: 24rpx;
		padding: 26rpx 20rpx 20rpx;
		border: 1rpx solid #2A2935;
		border-radius: 32rpx;
		background: #14141C;
	}
	.chart-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		padding: 0 6rpx;
	}
	.chart-title {
		color: #F7F3EE;
		font-size: 30rpx;
		line-height: 1.4;
		font-weight: 600;
	}
	.chart-meta {
		color: #6E6A78;
		font-size: 19rpx;
		letter-spacing: .5rpx;
	}
	.chart-box {
		width: 100%;
		height: 420rpx;
		margin-top: 10rpx;
	}
	.chart-note {
		display: block;
		padding: 0 6rpx;
		color: #6E6A78;
		font-size: 19rpx;
		line-height: 1.5;
	}
	.footer-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 30rpx;
		padding: 0 6rpx;
	}
	.footer-note {
		color: #4E4A57;
		font-size: 18rpx;
		letter-spacing: 1rpx;
	}
	.clear-link {
		color: #6E6A78;
		font-size: 20rpx;
	}
	.empty-card {
		margin-top: 30rpx;
		padding: 56rpx 32rpx;
		border: 1rpx solid #2A2935;
		border-radius: 32rpx;
		background: #14141C;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
	}
	.empty-vinyl {
		width: 148rpx;
		height: 148rpx;
		border-radius: 50%;
		background: repeating-radial-gradient(circle at 50% 50%, #1B1B25 0 4rpx, #111118 4rpx 9rpx);
		border: 1rpx solid #2A2935;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.empty-pin {
		width: 18rpx;
		height: 18rpx;
		border-radius: 50%;
		background: #FF4D5A;
		box-shadow: 0 0 22rpx rgba(255, 77, 90, .5);
	}
	.empty-title {
		margin-top: 28rpx;
		color: #F7F3EE;
		font-size: 36rpx;
		font-weight: 600;
	}
	.empty-copy {
		margin-top: 10rpx;
		color: #A7A3AE;
		font-size: 24rpx;
		line-height: 1.7;
	}
	.empty-btn {
		margin-top: 30rpx;
		height: 76rpx;
		padding: 0 32rpx;
		border-radius: 999rpx;
		background: #FF4D5A;
		color: #FFFFFF;
		font-size: 24rpx;
		font-weight: 600;
		line-height: 76rpx;
	}
</style>
