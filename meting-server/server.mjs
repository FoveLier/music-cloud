import http from 'node:http'
import { URL } from 'node:url'
import Meting from '@meting/core'

const PORT = Number(process.env.PORT || 3000)
const PLAYLIST_TTL = 10 * 60 * 1000
const LYRIC_TTL = 24 * 60 * 60 * 1000

const PRESET_PLAYLISTS = [
	{
		id: '3778678',
		name: '热歌榜',
		description: '此刻最热，先听为快。'
	},
	{
		id: '3779629',
		name: '新歌榜',
		description: '新鲜上架，抢先收听。'
	},
	{
		id: '19723756',
		name: '飙升榜',
		description: '正在升温的声音。'
	},
	{
		id: '2884035',
		name: '原创榜',
		description: '独立与新鲜，来自原创。'
	}
]

// 两个实例分别固定 format(false) / format(true)，避免并发请求切换 format 状态。
const rawMeting = new Meting('netease')
rawMeting.format(false)
const formattedMeting = new Meting('netease')
formattedMeting.format(true)

const cache = new Map()

function sendJson(res, status, payload) {
	res.writeHead(status, {
		'Content-Type': 'application/json; charset=utf-8',
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Methods': 'GET, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type',
		'Cache-Control': 'no-store'
	})
	res.end(JSON.stringify(payload))
}

function fail(res, code, message) {
	sendJson(res, 200, { ok: false, code, message })
}

function toHttps(value) {
	return typeof value === 'string' ? value.replace(/^http:\/\//i, 'https://') : ''
}

function trimText(value, max = 120) {
	const text = typeof value === 'string' ? value.trim() : ''
	return text.length > max ? `${text.slice(0, max)}…` : text
}

function getCached(key, ttl) {
	const entry = cache.get(key)
	if (!entry) {
		return null
	}
	return {
		...entry,
		fresh: Date.now() - entry.savedAt < ttl
	}
}

function writeCache(key, data) {
	cache.set(key, { savedAt: Date.now(), data })
}

function withTimeout(promise, ms, label) {
	let timer
	return Promise.race([
		promise,
		new Promise((_, reject) => {
			timer = setTimeout(() => reject(new Error(`${label}超时`)), ms)
		})
	]).finally(() => clearTimeout(timer))
}

async function fetchRawPlaylist(id) {
	const raw = JSON.parse(
		await withTimeout(rawMeting.playlist(String(id)), 15000, '获取歌单')
	)
	if (!raw || !raw.playlist) {
		throw new Error('Meting 未返回歌单')
	}
	return raw.playlist
}

async function fetchFormattedTracks(id) {
	const tracks = JSON.parse(
		await withTimeout(formattedMeting.playlist(String(id)), 15000, '获取曲目')
	)
	if (!Array.isArray(tracks)) {
		throw new Error('Meting 未返回曲目列表')
	}
	return tracks
}

function normalizeTrack(track, rawById, fallbackCover) {
	const raw = rawById.get(String(track.id)) || {}
	const artist = Array.isArray(track.artist)
		? track.artist.filter(Boolean).join(' / ')
		: raw.ar && Array.isArray(raw.ar)
			? raw.ar.map(item => item.name).filter(Boolean).join(' / ')
			: '未知歌手'
	const cover =
		toHttps(raw.al && raw.al.picUrl ? raw.al.picUrl : '') ||
		toHttps(fallbackCover)
	return {
		id: String(track.id),
		name: track.name || raw.name || '未知曲目',
		artist,
		album: track.album || (raw.al && raw.al.name) || '',
		duration: Number(raw.dt || 0),
		cover,
		urlId: String(track.url_id || track.id),
		lyricId: String(track.lyric_id || track.id)
	}
}

async function buildPlaylistDetail(id) {
	const [rawPlaylist, formattedTracks] = await Promise.all([
		fetchRawPlaylist(id),
		fetchFormattedTracks(id)
	])
	const rawTracks = Array.isArray(rawPlaylist.tracks) ? rawPlaylist.tracks : []
	const rawById = new Map(rawTracks.map(item => [String(item.id), item]))
	const cover = toHttps(rawPlaylist.coverImgUrl)
	const tracks = formattedTracks
		.filter(item => item && item.id)
		.map(item => normalizeTrack(item, rawById, cover))

	const description =
		trimText(rawPlaylist.description) ||
		(Array.isArray(rawPlaylist.tags) ? rawPlaylist.tags.join(' / ') : '') ||
		'用音乐打开今晚。'

	return {
		id: String(rawPlaylist.id || id),
		name: rawPlaylist.name || '未命名歌单',
		cover,
		description,
		trackCount: Number(rawPlaylist.trackCount || tracks.length),
		tracks
	}
}

async function buildPlaylistSummary(preset) {
	const rawPlaylist = await fetchRawPlaylist(preset.id)
	return {
		id: String(rawPlaylist.id || preset.id),
		name: rawPlaylist.name || preset.name,
		cover: toHttps(rawPlaylist.coverImgUrl),
		trackCount: Number(rawPlaylist.trackCount || 0),
		description:
			trimText(rawPlaylist.description) ||
			(Array.isArray(rawPlaylist.tags) ? rawPlaylist.tags.join(' / ') : '') ||
			preset.description
	}
}

async function getPlaylistDetail(id) {
	const key = `playlist:${id}`
	const cached = getCached(key, PLAYLIST_TTL)
	if (cached && cached.fresh) {
		return { data: cached.data, cachedAt: cached.savedAt, stale: false, cacheHit: true }
	}

	try {
		const data = await buildPlaylistDetail(id)
		writeCache(key, data)
		return { data, cachedAt: Date.now(), stale: false, cacheHit: false }
	} catch (error) {
		if (cached) {
			return {
				data: cached.data,
				cachedAt: cached.savedAt,
				stale: true,
				cacheHit: true,
				message: '数据可能不是最新'
			}
		}
		throw error
	}
}

async function getPlaylists() {
	const key = 'playlists'
	const cached = getCached(key, PLAYLIST_TTL)
	if (cached && cached.fresh) {
		return { data: cached.data, cachedAt: cached.savedAt, stale: false, cacheHit: true }
	}

	try {
		const data = []
		let failed = 0
		for (const preset of PRESET_PLAYLISTS) {
			try {
				data.push(await buildPlaylistSummary(preset))
			} catch (error) {
				failed += 1
				data.push({
					id: preset.id,
					name: preset.name,
					cover: '',
					trackCount: 0,
					description: preset.description
				})
			}
		}
		if (failed === PRESET_PLAYLISTS.length) {
			throw new Error('Meting 上游不可用，暂时拿不到歌单')
		}
		writeCache(key, data)
		return {
			data,
			cachedAt: Date.now(),
			stale: failed > 0,
			cacheHit: false,
			...(failed > 0 ? { message: '部分歌单数据可能不是最新' } : {})
		}
	} catch (error) {
		if (cached) {
			return {
				data: cached.data,
				cachedAt: cached.savedAt,
				stale: true,
				cacheHit: true,
				message: '数据可能不是最新'
			}
		}
		throw error
	}
}

async function getLyric(id) {
	const key = `lyric:${id}`
	const cached = getCached(key, LYRIC_TTL)
	if (cached && cached.fresh) {
		return { data: cached.data, cachedAt: cached.savedAt, stale: false, cacheHit: true }
	}

	try {
		const parsed = JSON.parse(
			await withTimeout(formattedMeting.lyric(String(id)), 15000, '获取歌词')
		)
		const data = {
			lyric: typeof parsed.lyric === 'string' ? parsed.lyric : '',
			tlyric: typeof parsed.tlyric === 'string' ? parsed.tlyric : ''
		}
		writeCache(key, data)
		return { data, cachedAt: Date.now(), stale: false, cacheHit: false }
	} catch (error) {
		if (cached) {
			return {
				data: cached.data,
				cachedAt: cached.savedAt,
				stale: true,
				cacheHit: true,
				message: '数据可能不是最新'
			}
		}
		throw error
	}
}

async function getSongUrl(id, br) {
	const bitrates = [br, 320, 128].filter((value, index, list) => value && list.indexOf(value) === index)
	let lastError = ''

	for (const bitrate of bitrates) {
		try {
			const parsed = JSON.parse(
				await withTimeout(
					formattedMeting.url(String(id), Number(bitrate)),
					15000,
					'获取播放地址'
				)
			)
			if (parsed && parsed.url) {
				return {
					url: parsed.url,
					size: Number(parsed.size || 0),
					br: Number(parsed.br || bitrate),
					type: parsed.type || ''
				}
			}
			lastError = '该歌曲暂无可用播放地址'
		} catch (error) {
			lastError = error.message || '获取播放地址失败'
		}
	}

	return { url: '', size: 0, br: Number(br || 320), type: '', message: lastError }
}

const server = http.createServer(async (req, res) => {
	if (req.method === 'OPTIONS') {
		res.writeHead(204, {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type'
		})
		res.end()
		return
	}

	if (req.method !== 'GET') {
		sendJson(res, 405, { ok: false, code: 'METHOD_NOT_ALLOWED', message: '只支持 GET' })
		return
	}

	const requestUrl = new URL(req.url || '/', `http://localhost:${PORT}`)

	try {
		if (requestUrl.pathname === '/health') {
			sendJson(res, 200, { ok: true, service: 'meting-server', platform: 'netease' })
			return
		}

		if (requestUrl.pathname === '/playlists') {
			const result = await getPlaylists()
			sendJson(res, 200, {
				ok: true,
				data: result.data,
				cachedAt: result.cachedAt,
				stale: result.stale,
				cacheHit: result.cacheHit,
				...(result.message ? { message: result.message } : {})
			})
			return
		}

		if (requestUrl.pathname === '/playlist') {
			const id = requestUrl.searchParams.get('id')
			if (!id || !/^\d+$/.test(id)) {
				fail(res, 'INVALID_ID', '歌单 ID 不合法')
				return
			}
			const result = await getPlaylistDetail(id)
			sendJson(res, 200, {
				ok: true,
				data: result.data,
				cachedAt: result.cachedAt,
				stale: result.stale,
				cacheHit: result.cacheHit,
				...(result.message ? { message: result.message } : {})
			})
			return
		}

		if (requestUrl.pathname === '/lyric') {
			const id = requestUrl.searchParams.get('id')
			if (!id) {
				fail(res, 'INVALID_ID', '歌词 ID 不合法')
				return
			}
			const result = await getLyric(id)
			sendJson(res, 200, {
				ok: true,
				data: result.data,
				cachedAt: result.cachedAt,
				stale: result.stale,
				cacheHit: result.cacheHit,
				...(result.message ? { message: result.message } : {})
			})
			return
		}

		if (requestUrl.pathname === '/url') {
			const id = requestUrl.searchParams.get('id')
			if (!id) {
				fail(res, 'INVALID_ID', '歌曲 ID 不合法')
				return
			}
			const br = Number(requestUrl.searchParams.get('br') || 320)
			const data = await getSongUrl(id, br)
			sendJson(res, 200, {
				ok: true,
				data,
				...(data.message ? { message: data.message } : {})
			})
			return
		}

		sendJson(res, 404, { ok: false, code: 'NOT_FOUND', message: '接口不存在' })
	} catch (error) {
		console.error('[meting-server]', error)
		fail(res, 'METING_ERROR', error.message || '音乐服务暂时不可用')
	}
})

server.listen(PORT, '0.0.0.0', () => {
	console.log(`[meting-server] http://localhost:${PORT}`)
})
