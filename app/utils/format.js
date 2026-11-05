/**
 * 云端音乐 · 格式化工具
 */

export function formatDuration(ms) {
	const total = Math.max(0, Math.floor(Number(ms || 0) / 1000))
	return formatClock(total)
}

export function formatClock(seconds) {
	const total = Math.max(0, Math.floor(Number(seconds) || 0))
	const minutes = Math.floor(total / 60)
	const rest = total % 60
	return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

export function dateKey(timestamp) {
	const date = new Date(Number(timestamp) || Date.now())
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const day = String(date.getDate()).padStart(2, '0')
	return `${date.getFullYear()}-${month}-${day}`
}

export function dayLabel(timestamp) {
	const date = new Date(Number(timestamp) || Date.now())
	return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function formatCount(value) {
	const number = Number(value) || 0
	if (number >= 10000) {
		return `${(number / 10000).toFixed(1)}w`
	}
	return String(number)
}
