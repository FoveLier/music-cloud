# 云端音乐 · Spec

**Status: approved**

## 1. 问题与解决

用户想在一个轻量应用里发现歌单、连续听歌并看到自己的听歌习惯。现有页面型案例的数据是静态的，无法体现“内容随数据变化”。本规格把本地 Meting 服务作为音乐数据源，把播放行为写入本地缓存，再用统计页把行为变成可读的图表。

## 2. 范围

### 2.1 页面

1. 首页 `pages/index/index`：歌单列表。
2. 歌单页 `pages/playlist/playlist`：歌单头 + 曲目列表。
3. 播放页 `pages/player/player`：唱片/歌词、播放控制。
4. 统计页 `pages/stats/stats`：Top 10 柱状图 + 最近 7 天时长折线图。

### 2.2 非目标

登录、支付、评论、私信、关注、搜索、歌单创建/收藏、下载、云同步、音频离线缓存、语音/OCR/视频。

## 3. 用户故事

1. 作为学生，我想在首页看到几个有封面和名称的歌单，以便快速决定听什么。
2. 作为学生，我想点歌单进入详情，看到封面、名称和歌曲总数，确认这是我想要的歌单。
3. 作为学生，我想在歌单里看到序号、歌名、歌手和时长，以便挑一首歌。
4. 作为学生，我想点歌曲进入播放页，看到唱片和歌曲信息。
5. 作为学生，我想播放/暂停，并在暂停时看到唱片停下。
6. 作为学生，我想上一首/下一首，连续听同一歌单。
7. 作为学生，我想在唱片模式和歌词模式之间切换。
8. 作为学生，我想在离开播放页后不留下后台播放器实例。
9. 作为学生，我想每次开始播放一首歌时自动记一次播放，不需要手动打卡。
10. 作为学生，我想在统计页看到播放次数 Top 10 的柱状图。
11. 作为学生，我想看到最近 7 天每天听歌时长的折线图。
12. 作为学生，我想在服务没启动/断网时看到明确提示，而不是空白页。
13. 作为学生，我想在缓存过期但网络失败时继续看到旧数据，并知道它可能不是最新的。
14. 作为学生，我想在歌曲无版权/只有试听/播放地址为空时看到提示，而不是以为正在播放。
15. 作为学生，我想关闭再打开应用后，统计页仍保留我的播放记录。

## 4. 数据契约

### 4.1 本地 Meting 服务

Base URL：`http://localhost:3000`（真机改为电脑内网地址）。所有响应 `Content-Type: application/json; charset=utf-8`，允许 CORS。

```text
GET /health
=> { ok: true, service: 'meting-server' }

GET /playlists
=> { ok: true, data: PlaylistSummary[], cachedAt: number }
PlaylistSummary = {
  id: string, name: string, cover: string,
  trackCount: number, description: string
}

GET /playlist?id=<playlistId>
=> { ok: true, data: PlaylistDetail, cachedAt: number }
PlaylistDetail = {
  id: string, name: string, cover: string,
  description: string, trackCount: number,
  tracks: Track[]
}
Track = {
  id: string, name: string, artist: string, album: string,
  duration: number, cover: string,
  urlId: string, lyricId: string
}

GET /url?id=<songId>&br=320
=> { ok: true, data: { url: string, size: number, br: number, type: string } }
// 无版权/不可播时：data.url = ''，message = '该歌曲暂无可用播放地址'

GET /lyric?id=<songId>
=> { ok: true, data: { lyric: string, tlyric: string } }
```

失败统一：

```json
{ "ok": false, "code": "METING_ERROR|UPSTREAM_TIMEOUT|NOT_FOUND", "message": "用户可读提示" }
```

服务端约定：

- 平台固定 `netease`；不接收/保存用户 Cookie。
- 歌单元数据与曲目来自 Meting `playlist(id)`；封面优先用歌单封面，曲目封面用原始 `al.picUrl`。
- 歌单缓存 10 分钟；歌词缓存 24 小时；播放 URL 不缓存。
- 上游失败时若有过期缓存，返回 `{ok:true, stale:true, data, message:'数据可能不是最新'}`；无缓存返回 `ok:false`。

### 4.2 前端请求封装

`app/utils/api.js`：

```js
request(path, options) -> Promise<data>
```

- `BASE_URL = 'http://localhost:3000'`，集中定义。
- 使用 `uni.request`，`timeout: 10000`。
- 三个出口：
  1. 网络失败/超时：`ApiError('NETWORK', '网络不可用，请确认 Meting 服务已启动')`。
  2. HTTP 状态异常：`ApiError('HTTP', '服务返回异常（status）')`。
  3. 业务失败 `ok:false`：`ApiError(code, message)`。
- 错误只写开发者控制台（不含 Cookie/Token/密钥），页面负责用户提示。

### 4.3 缓存

`app/utils/cache.js`：

- `readCache(key)` / `writeCache(key, data)` / `isFresh(entry, ttl)`。
- 键：`music_playlists_v1`（10 分钟）、`music_playlist_<id>_v1`（10 分钟）、`music_lyric_<id>_v1`（24 小时）。
- 歌单页/首页先读缓存渲染；过期后请求；请求失败则用旧缓存并标记 `stale`。
- 不缓存音频 URL；播放 URL 每次点击/切歌时重新请求。

### 4.4 播放记录

`app/utils/stats.js`：

```js
recordPlay(track) -> PlayRecord[]
getPlayRecords() -> PlayRecord[]
aggregateStats(records, now) -> {
  totalPlays, uniqueSongs, totalMinutes,
  topSongs: [{ name, artist, plays }],
  dailyMinutes: [{ label: '11-01', minutes }]
}
```

- 键：`music_history_v1`；最多保留 500 条。
- 记录字段：`songId, name, artist, cover, playlistId, duration, playedAt`。
- 播放次数在“开始播放一首新歌”时 +1；暂停后继续同一首不重复计数。
- 听歌时长：在播放页 `onTimeUpdate` 累加实际播放秒数，按 `playedAt` 所在日期聚合；不把未播放的整首时长直接计入。
- 统计页读取记录；空记录显示空状态，不伪造演示数据。

## 5. 页面行为

### 5.1 首页

- 进入时读取缓存并请求 `/playlists`。
- 加载：骨架/加载文案；失败：错误卡片 + “重试”；旧缓存：顶部“数据可能不是最新”。
- 歌单行：封面、名称、曲目数/描述、右侧播放入口/箭头。
- 点击行：`uni.navigateTo('/pages/playlist/playlist?id=<id>')`。
- 下拉刷新：重新请求并写缓存。
- 底部 tabBar：发现 / 听歌报告。

### 5.2 歌单页

- `onLoad(options)` 接收 `id`；缺失/非法显示“歌单不存在”。
- 读取缓存 + 请求 `/playlist?id=...`；加载/失败/重试/旧数据提示。
- 头部：封面、名称、描述、歌曲总数、播放全部。
- 曲目行：序号（两位）、歌名、歌手、时长、播放按钮；点击行进入播放页。
- 返回按钮固定左上；页面可滚动；底部安全区。

### 5.3 播放页

- `onLoad` 接收 `playlistId`、`songId`；获取歌单（缓存）与歌词。
- 创建 `uni.createInnerAudioContext()`；`src` 来自 `/url`。
- 状态：`isPlaying`、`isLoading`、`mode`（`vinyl` / `lyric`）、`currentTime`、`duration`、`activeLyricIndex`。
- 播放/暂停按钮；上一首/下一首；进度条/时间。
- 唱片：播放时 CSS `animation-play-state: running`，暂停 `paused`。
- 歌词：LRC 解析为 `{time, text}`；点击歌词模式切换；当前行高亮并滚动到可视区域（用 `scroll-into-view`）。
- 每次切歌/首次播放调用 `recordPlay`；同一首暂停恢复不重复。
- 无 URL/播放失败：toast“该歌曲暂无可用播放地址”，不显示播放中；自动尝试下一首？不自动，避免连续失败；用户可切歌。
- `onUnload`：`innerAudioContext.stop()` + `destroy()`；清空定时器/监听。
- 音频 `onEnded` 自动下一首；最后一首停止/提示。

### 5.4 统计页

- 进入时读取 `music_history_v1`，聚合：总播放次数、去重歌曲数、总分钟数、Top 10、最近 7 天每日分钟。
- 柱状图：`qiun-data-charts` `type="column"`；`chartData = {categories, series:[{name:'播放次数',data}]}`；`.chart-box` 显式高度。
- 折线图：`type="line"`；`categories` 为最近 7 天（含今天），`series` 为分钟数；不足 7 天补 0。
- 空状态：插画/文案 + “去听一首”按钮返回首页；不显示假图表。
- 图表容器宽度/高度固定；H5 与小程序都能渲染。
- “清空统计”可选；如实现需二次确认，并只清 `music_history_v1`。

## 6. 设计约束

- 以 `docs/DESIGN.md` 为唯一视觉源：夜航云村（Ink + Cloud Red + Gold）。
- 不使用网易云 Logo/版权插画；用唱片、几何封面、排版表达“云村”气质。
- 避免无意义次级标签和说明文字；让布局解释层级。
- 颜色、字号、间距、圆角、动效全部走 token；详见 DESIGN。
- 触控目标 >= 88rpx；正文对比度满足可读性；播放按钮有 `hover-class` 反馈。

## 7. 验收标准（Done when）

| 编号 | 验收标准 | 证据 |
| --- | --- | --- |
| AC-01 | HBuilderX 编译 H5；四个页面可访问，tabBar 正常 | 运行截图 |
| AC-02 | 首页展示 >=3 个歌单，含封面/名称/歌曲数或描述 | 首页截图 |
| AC-03 | 点歌单进入歌单页，页头显示封面/名称/总数 | 歌单截图 |
| AC-04 | 歌单每行含序号/歌名/歌手/时长/播放入口 | 歌单截图 |
| AC-05 | 播放页可播放/暂停/上一首/下一首；唱片旋转/暂停；歌词/唱片切换；离开销毁 | 播放页截图 + 代码 |
| AC-06 | 每次开始播放新歌，`music_history_v1` 增加一条；暂停恢复不重复 | 统计页 + 控制台/存储证据 |
| AC-07 | 统计页柱状图 Top 10 与折线图最近 7 天，由真实记录聚合 | 图表截图 |
| AC-08 | 页面无散写 `uni.request`；请求封装覆盖网络/状态码/业务三出口 | 代码 + 审查 |
| AC-09 | 歌单/歌词缓存有 TTL；失败用旧缓存提示；音频 URL 不缓存 | 代码 + 失败截图 |
| AC-10 | 服务未启动/断网/空 URL/歌单不存在有用户可读提示 | 失败路径截图 |
| AC-11 | 实现与 DESIGN 对应；无明显 AI 味/无意义次级标签 | 设计走查 |
| AC-12 | docs 产物、JOURNEY、review、AI 披露、提交链、云端仓库完整 | 文件 + git log |

## 8. 测试与验证决策

- 外部行为优先：页面可通过 H5 手工走查；不需要为 UI 细节写快照测试。
- 纯函数（LRC 解析、统计聚合、时长格式化）可通过 Node 小脚本验证；验证命令写入 `docs/JOURNEY.md`。
- 真实数据验证：启动 `meting-server`，用歌单 `3778678` 播放至少 3 首，检查统计页；断网/停服务构造失败路径。
- 缓存验证：首次请求后停服务，再进页面应显示旧数据 + “可能不是最新”；清缓存后应显示错误卡片。
- 播放器验证：播放/暂停/切歌/离开页面后检查 `destroy` 日志或再次进入不叠加音频。

## 9. 交付

- `docs/intent.md` / `docs/spec.md` / `docs/plan.md`（Status 到位）
- `docs/DESIGN.md` + `docs/prototype/index.html`
- `docs/JOURNEY.md`
- `docs/review-lab08.md`
- `docs/ai-disclosure-lab08.md`
- `docs/screenshots/`：四页面、图表、失败路径
- 本地 Meting 服务代码
- 公开云端仓库
