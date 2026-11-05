/**
 * 云端音乐 · LRC 歌词解析
 * 支持一行多个时间标签；输出按时间升序。
 */

const TIME_TAG = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g

export function parseLrc(text) {
	if (!text || typeof text !== 'string') {
		return []
	}

	const lines = []
	for (const rawLine of text.split(/\r?\n/)) {
		const tags = []
		let match
		TIME_TAG.lastIndex = 0
		while ((match = TIME_TAG.exec(rawLine)) !== null) {
			const minutes = Number(match[1] || 0)
			const seconds = Number(match[2] || 0)
			const fraction = Number((match[3] || '0').padEnd(3, '0'))
			tags.push(minutes * 60 + seconds + fraction / 1000)
		}
		if (!tags.length) {
			continue
		}
		const content = rawLine.replace(TIME_TAG, '').trim()
		if (!content) {
			continue
		}
		for (const time of tags) {
			lines.push({ time, text: content })
		}
	}

	return lines.sort((a, b) => a.time - b.time)
}

export function findActiveLyricIndex(lines, currentTime) {
	if (!Array.isArray(lines) || !lines.length) {
		return -1
	}
	const now = Number(currentTime) || 0
	let index = -1
	for (let i = 0; i < lines.length; i += 1) {
		if (lines[i].time <= now + 0.05) {
			index = i
		} else {
			break
		}
	}
	return index
}
