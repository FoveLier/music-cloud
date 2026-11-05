/**
 * 云端音乐 · 本地 TTL 缓存
 * 只缓存歌单与歌词；播放地址有时效，不缓存。
 */

export const CACHE_KEYS = {
	playlists: 'music_playlists_v1',
	playlist: id => `music_playlist_${id}_v1`,
	lyric: id => `music_lyric_${id}_v1`
}

export const CACHE_TTL = {
	playlists: 10 * 60 * 1000,
	playlist: 10 * 60 * 1000,
	lyric: 24 * 60 * 60 * 1000
}

export function readCache(key) {
	try {
		const raw = uni.getStorageSync(key)
		if (!raw) {
			return null
		}
		const entry = typeof raw === 'string' ? JSON.parse(raw) : raw
		if (!entry || typeof entry !== 'object' || !('savedAt' in entry) || !('data' in entry)) {
			return null
		}
		return {
			savedAt: Number(entry.savedAt || 0),
			data: entry.data
		}
	} catch (error) {
		return null
	}
}

export function writeCache(key, data) {
	const entry = {
		savedAt: Date.now(),
		data
	}
	try {
		uni.setStorageSync(key, entry)
	} catch (error) {
		console.warn('[cache] write failed', key)
	}
	return entry
}

export function isFresh(entry, ttl) {
	return Boolean(entry && entry.savedAt && Date.now() - entry.savedAt < ttl)
}

export function cacheAgeText(entry) {
	if (!entry || !entry.savedAt) {
		return ''
	}
	const seconds = Math.max(0, Math.round((Date.now() - entry.savedAt) / 1000))
	if (seconds < 60) {
		return '刚刚更新'
	}
	if (seconds < 3600) {
		return `${Math.round(seconds / 60)} 分钟前更新`
	}
	return `${Math.round(seconds / 3600)} 小时前更新`
}
