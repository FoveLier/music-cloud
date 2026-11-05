import assert from 'node:assert/strict'
import { parseLrc, findActiveLyricIndex } from '../utils/lrc.js'
import { formatDuration, formatClock, dateKey } from '../utils/format.js'
import { aggregateStats } from '../utils/stats.js'

const lrc = parseLrc('[00:01.00]第一行\n[00:03.50][00:05.00]重复行\n[00:07.25]')
assert.equal(lrc.length, 3)
assert.equal(lrc[0].text, '第一行')
assert.equal(lrc[1].text, '重复行')
assert.equal(lrc[2].time, 5)
assert.equal(findActiveLyricIndex(lrc, 3.6), 1)
assert.equal(findActiveLyricIndex(lrc, 8), 2)

assert.equal(formatDuration(216993), '03:36')
assert.equal(formatClock(72), '01:12')

const now = new Date(2026, 10, 5, 12, 0, 0).getTime()
const records = [
	{ songId: 'a', name: 'A', artist: 'X', playedAt: now, listenedSeconds: 120 },
	{ songId: 'a', name: 'A', artist: 'X', playedAt: now - 1000, listenedSeconds: 60 },
	{ songId: 'b', name: 'B', artist: 'Y', playedAt: now - 24 * 60 * 60 * 1000, listenedSeconds: 180 }
]
const stats = aggregateStats(records, now)
assert.equal(stats.totalPlays, 3)
assert.equal(stats.uniqueSongs, 2)
assert.equal(stats.totalMinutes, 6)
assert.equal(stats.topSongs[0].songId, 'a')
assert.equal(stats.topSongs[0].plays, 2)
assert.equal(stats.dailyMinutes.length, 7)
assert.equal(stats.dailyMinutes[6].key, dateKey(now))
assert.equal(stats.dailyMinutes[6].minutes, 3)
assert.equal(stats.dailyMinutes[5].minutes, 3)

console.log('core tests passed:', JSON.stringify({ lrc: lrc.length, stats: stats.totalPlays }))
