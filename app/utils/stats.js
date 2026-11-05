/**
 * 云端音乐 · 播放记录与统计聚合
 * 只读写本机 Storage，不上传任何行为数据。
 */

import { dateKey, dayLabel } from './format.js'

export const HISTORY_KEY = 'music_history_v1'
export const HISTORY_LIMIT = 500

function normalizeRecord(item) {
	if (!item || typeof item !== 'object') {
		return null
	}
	const songId = String(item.songId || '')
	if (!songId) {
		return null
	}
	return {
		id: typeof item.id === 'string' ? item.id : `play-${item.playedAt || Date.now()}`,
		songId,
		name: typeof item.name === 'string' ? item.name : '未知曲目',
		artist: typeof item.artist === 'string' ? item.artist : '未知歌手',
		cover: typeof item.cover === 'string' ? item.cover : '',
		playlistId: String(item.playlistId || ''),
		duration: Number(item.duration || 0),
		listenedSeconds: Math.max(0, Number(item.listenedSeconds || 0)),
		playedAt: Number(item.playedAt || 0)
	}
}

export function getPlayRecords() {
	try {
		const raw = uni.getStorageSync(HISTORY_KEY)
		const list = Array.isArray(raw) ? raw : typeof raw === 'string' ? JSON.parse(raw) : []
		return (Array.isArray(list) ? list : [])
			.map(normalizeRecord)
			.filter(Boolean)
			.sort((a, b) => b.playedAt - a.playedAt)
	} catch (error) {
		return []
	}
}

function saveRecords(records) {
	const next = records.slice(0, HISTORY_LIMIT)
	try {
		uni.setStorageSync(HISTORY_KEY, next)
	} catch (error) {
		console.warn('[stats] save failed')
	}
	return next
}

export function recordPlay(track, playlistId = '') {
	if (!track || !track.id) {
		return ''
	}
	const records = getPlayRecords()
	const record = {
		id: `play-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
		songId: String(track.id),
		name: track.name || '未知曲目',
		artist: track.artist || '未知歌手',
		cover: track.cover || '',
		playlistId: String(playlistId || ''),
		duration: Number(track.duration || 0),
		listenedSeconds: 0,
		playedAt: Date.now()
	}
	saveRecords([record, ...records])
	return record.id
}

export function updatePlayedSeconds(recordId, seconds) {
	if (!recordId) {
		return
	}
	const records = getPlayRecords()
	const next = records.map(item =>
		item.id === recordId
			? { ...item, listenedSeconds: Math.max(item.listenedSeconds, Number(seconds) || 0) }
			: item
	)
	saveRecords(next)
}

export function clearPlayRecords() {
	try {
		uni.removeStorageSync(HISTORY_KEY)
	} catch (error) {
		// ignore
	}
}

export function aggregateStats(records, now = Date.now()) {
	const list = Array.isArray(records) ? records.filter(Boolean) : []
	const songMap = new Map()
	const dayMap = new Map()

	for (let i = 0; i < 7; i += 1) {
		const timestamp = now - i * 24 * 60 * 60 * 1000
		dayMap.set(dateKey(timestamp), {
			key: dateKey(timestamp),
			label: dayLabel(timestamp),
			seconds: 0
		})
	}

	let totalSeconds = 0
	for (const record of list) {
		const songKey = record.songId || `${record.name}-${record.artist}`
		const current = songMap.get(songKey) || {
			songId: record.songId,
			name: record.name,
			artist: record.artist,
			cover: record.cover,
			plays: 0
		}
		current.plays += 1
		songMap.set(songKey, current)

		const seconds = Math.max(0, Number(record.listenedSeconds || 0))
		totalSeconds += seconds
		const key = dateKey(record.playedAt)
		if (dayMap.has(key)) {
			const day = dayMap.get(key)
			day.seconds += seconds
		}
	}

	const topSongs = Array.from(songMap.values())
		.sort((a, b) => b.plays - a.plays || a.name.localeCompare(b.name))
		.slice(0, 10)

	const dailyMinutes = Array.from(dayMap.values())
		.sort((a, b) => a.key.localeCompare(b.key))
		.map(day => ({
			key: day.key,
			label: day.label,
			minutes: Math.round(day.seconds / 60)
		}))

	return {
		totalPlays: list.length,
		uniqueSongs: songMap.size,
		totalMinutes: Math.round(totalSeconds / 60),
		topSongs,
		dailyMinutes
	}
}
