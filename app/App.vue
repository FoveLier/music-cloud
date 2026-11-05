<script>
	export default {
		onLaunch() {
			console.log('云端音乐启动')
		},
		onShow() {
			console.log('云端音乐显示')
		},
		onHide() {
			console.log('云端音乐隐藏')
		}
	}
</script>

<style>
	page {
		background-color: #0B0B10;
		color: #F7F3EE;
		font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
		-webkit-font-smoothing: antialiased;
	}

	view,
	text,
	button,
	input,
	scroll-view,
	image {
		box-sizing: border-box;
	}

	button::after {
		border: none;
	}
</style>
