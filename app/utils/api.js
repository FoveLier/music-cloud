/**
 * 云端音乐 · 请求封装
 * 三个出口：网络失败 / HTTP 状态异常 / 业务 ok:false。
 * 页面不直接写 uni.request，也不接触个人 Cookie。
 */

export const BASE_URL = 'http://localhost:3000'

export class ApiError extends Error {
	constructor(code, message, statusCode = 0) {
		super(message)
		this.name = 'ApiError'
		this.code = code
		this.statusCode = statusCode
	}
}

export function request(path, options = {}) {
	const { method = 'GET', data, timeout = 10000 } = options
	return new Promise((resolve, reject) => {
		uni.request({
			url: `${BASE_URL}${path}`,
			method,
			data,
			timeout,
			header: {
				'Content-Type': 'application/json'
			},
			success: response => {
				if (response.statusCode !== 200) {
					reject(
						new ApiError(
							'HTTP',
							`服务返回异常（${response.statusCode}），请稍后重试`,
							response.statusCode
						)
					)
					return
				}

				const body = response.data
				if (!body || body.ok !== true) {
					reject(
						new ApiError(
							(body && body.code) || 'BUSINESS',
							(body && body.message) || '音乐服务暂时不可用',
							response.statusCode
						)
					)
					return
				}

				resolve({
					data: body.data,
					stale: Boolean(body.stale),
					cachedAt: Number(body.cachedAt || 0),
					cacheHit: Boolean(body.cacheHit),
					message: body.message || ''
				})
			},
			fail: error => {
				const detail = error && (error.errMsg || error.message)
				console.error('[api] network error', detail)
				reject(
					new ApiError(
						'NETWORK',
						'连接不到 Meting 服务。先在 meting-server 运行 npm start，再重试。'
					)
				)
			}
		})
	})
}

export function getPlaylists() {
	return request('/playlists')
}

export function getPlaylist(id) {
	return request(`/playlist?id=${encodeURIComponent(id)}`)
}

export function getSongUrl(id) {
	return request(`/url?id=${encodeURIComponent(id)}&br=320`)
}

export function getLyric(id) {
	return request(`/lyric?id=${encodeURIComponent(id)}`)
}
