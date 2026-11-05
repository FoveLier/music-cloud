# 云端音乐 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status: confirmed**

**Goal:** 交付一个可运行的仿网易云音乐 uni-app：首页、歌单页、播放页、统计页，数据来自本地 Meting 服务与本机播放记录。

**Architecture:** 仓库分 `app/`（uni-app）与 `meting-server/`（Node.js + @meting/core）。前端通过 `utils/api.js` 访问本地服务，`utils/cache.js` 做 TTL/旧数据降级，`utils/stats.js` 记录并聚合播放行为；播放页持有唯一的 `InnerAudioContext`，统计页用 `qiun-data-charts` 渲染真实聚合数据。

**Tech Stack:** uni-app Vue3 选项式、HBuilderX 5.34、Node.js 24、@meting/core 1.6.2、qiun-data-charts（uCharts）、本地 Storage。

**Spec:** `docs/spec.md`（approved）；**Design:** `docs/DESIGN.md`（approved）；**Prototype:** `docs/prototype/index.html`。

## Global Constraints

- 页面固定 4 个：`pages/index/index`、`pages/playlist/playlist`、`pages/player/player`、`pages/stats/stats`。
- 页面内禁止散写 `uni.request`；统一 `app/utils/api.js`。
- 缓存统一 `app/utils/cache.js`；播放记录统一 `app/utils/stats.js`；播放器只在播放页创建/销毁。
- 长度单位 rpx；颜色/字号/间距/圆角使用 `docs/DESIGN.md` token；不使用紫色渐变、无意义次级标签。
- API Base URL：`http://localhost:3000`；不写入个人 Cookie/Token。
- 播放 URL 不缓存；歌单缓存 10 分钟；歌词缓存 24 小时；弱网用旧缓存并提示。
- 图表使用 `app/uni_modules/qiun-data-charts`，不引入第二套图表库。
- H5 / 微信开发者工具需关闭合法域名校验；真机改内网地址。
- 每个任务结束必须可独立运行、留下验证证据、提交 `lab08-*`。

## Review Focus

1. **Meting 服务未启动/断网**：首页和歌单页必须显示可执行的错误提示，不能空白。
2. **播放地址为空/试听/VIP**：播放页必须提示，不能显示“播放中”，不能写假播放记录。
3. **重复/快速切歌**：上一首/下一首/暂停/离开页面不能叠加播放器或重复计数。
4. **缓存过期 + 网络失败**：必须显示旧数据 + “可能不是最新”，而不是直接报错。
5. **统计空/样本少/跨天**：Top 10 与 7 天折线在 0、1、少量数据时仍能渲染；日期按本地时区。
6. **图表容器高度**：`.chart-box` 必须显式高度，否则 uCharts 画布为 0。
7. **音频自动播放限制**：首次播放必须由用户点击触发；不能页面一进入就无声失败。
8. **歌词滚动/长文本**：当前行高亮、滚动到可视区域；无歌词显示占位。

## File Structure

```text
music-cloud/
├── app/
│   ├── pages/index/index.vue         首页：歌单列表
│   ├── pages/playlist/playlist.vue   歌单：头 + 曲目
│   ├── pages/player/player.vue       播放：唱片/歌词/控制
│   ├── pages/stats/stats.vue         统计：柱状图 + 折线图
│   ├── utils/api.js                  请求封装 + 三个错误出口
│   ├── utils/cache.js                TTL 缓存 + stale
│   ├── utils/stats.js                播放记录 + 聚合
│   ├── utils/lrc.js                  LRC 解析
│   ├── utils/format.js               时长/日期格式化
│   ├── static/tabbar/*.png           原生 tabBar 图标
│   ├── uni_modules/qiun-data-charts/ 图表组件
│   ├── pages.json / manifest.json
│   └── App.vue / main.js / uni.scss
├── meting-server/
│   ├── server.mjs                     HTTP + CORS + 路由 + 缓存
│   └── package.json
├── docs/
│   ├── intent.md / spec.md / plan.md
│   ├── DESIGN.md / prototype/index.html
│   ├── JOURNEY.md / review-lab08.md / ai-disclosure-lab08.md
│   └── screenshots/
└── AGENTS.md / README.md
```

## Task 0: 基线（完成）

- [x] 创建 `lab08-base 模板与 AGENTS.md`
- [x] 打 `lab08-base` 标签
- [x] 验证 H5 模板编译

## Task 1: Meting 服务 + 前端数据层

**Files:** `meting-server/server.mjs`、`app/utils/api.js`、`app/utils/cache.js`、`app/utils/format.js`、`app/utils/lrc.js`、`app/utils/stats.js`

**Interfaces:**
- `request(path, options) -> Promise<any>`；抛 `ApiError { code, message }`。
- `getPlaylists() -> Promise<PlaylistSummary[]>`、`getPlaylist(id)`、`getSongUrl(id)`、`getLyric(id)`。
- `readCache(key)`、`writeCache(key, data)`、`isFresh(entry, ttl)`、`withStaleFallback`。
- `recordPlay(track)`、`getPlayRecords()`、`aggregateStats(records, now)`。
- `formatDuration(ms)`、`formatClock(seconds)`、`parseLrc(text)`。

- [ ] 实现服务端 `/health`、`/playlists`、`/playlist`、`/url`、`/lyric`，CORS，内存 TTL；上游失败用旧缓存并 `stale:true`。
- [ ] 实现 `api.js` 三出口；`GET`，10 秒超时；错误不含敏感信息。
- [ ] 实现 `cache.js`：`music_playlists_v1` 10 分钟、`music_playlist_<id>_v1` 10 分钟、`music_lyric_<id>_v1` 24 小时；不缓存 URL。
- [ ] 实现 `stats.js`：`music_history_v1`，500 条上限；`aggregateStats` 输出 `totalPlays/uniqueSongs/totalMinutes/topSongs/dailyMinutes`。
- [ ] 实现 `lrc.js`、`format.js`。
- [ ] 验证：`curl http://localhost:3000/playlists`、`/playlist?id=3778678`、`/url?id=...`、`/lyric?id=...`；H5 暂不接页面。
- [ ] 提交 `lab08-impl-api`。

## Task 2: 首页

**Files:** `app/pages/index/index.vue`

**Interfaces:** 使用 `getPlaylists()` + `readCache`/`writeCache`；`onLoad`/`onShow`；`goPlaylist(id)`。

- [ ] 页面结构：eyebrow、标题“今晚，听点什么”、主推歌单、推荐列表、加载骨架、错误卡、旧数据 banner、下拉刷新。
- [ ] 数据：先读缓存渲染，再请求；失败时用缓存，显示“数据可能不是最新”；无缓存显示错误 + 重试。
- [ ] 点击行 `uni.navigateTo({url:'/pages/playlist/playlist?id='+id})`。
- [ ] 验证：3 个歌单可见，封面/名称/数量；点击进入歌单；停服务后重试显示错误/旧数据。
- [ ] 提交 `lab08-impl-home`。

## Task 3: 歌单页

**Files:** `app/pages/playlist/playlist.vue`

**Interfaces:** `onLoad(options.id)`；`getPlaylist(id)`；`goPlayer(track, index)`；缓存键 `music_playlist_<id>_v1`。

- [ ] 页头封面/名称/描述/总数/播放全部；返回按钮。
- [ ] 曲目行序号/歌名/歌手/时长/播放按钮；点击进入播放页，传 `playlistId` + `songId`。
- [ ] 加载/错误/重试/旧数据；歌单不存在显示空状态。
- [ ] 验证：热歌榜 200 首；点击第三首进入播放页；停服务后旧缓存可用。
- [ ] 提交 `lab08-impl-playlist`。

## Task 4: 播放页

**Files:** `app/pages/player/player.vue`

**Interfaces:** `onLoad({playlistId,songId})`；`uni.createInnerAudioContext()`；`getPlaylist`、`getSongUrl`、`getLyric`、`recordPlay`、`parseLrc`。

- [ ] 加载歌单与歌词；创建唯一 `innerAudioContext`，`onUnload` `stop()` + `destroy()`。
- [ ] 播放/暂停、上一首/下一首、进度/时间；同一首暂停恢复不重复记录。
- [ ] 唱片模式：播放旋转、暂停停；歌词模式：当前行高亮、滚动。
- [ ] 空 URL/播放失败：toast，不显示播放中；`onEnded` 自动下一首。
- [ ] 播放开始写 `recordPlay`；`onTimeUpdate` 累加实际秒数到记录（按当前 `songId` 更新）。
- [ ] 验证：播放/暂停/切歌/模式切换；离开后再进不叠加声音；检查 storage。
- [ ] 提交 `lab08-impl-player`。

## Task 5: 统计页与图表

**Files:** `app/pages/stats/stats.vue`

**Interfaces:** `getPlayRecords()`、`aggregateStats()`；`qiun-data-charts` 的 `type="column"` / `type="line"`；`chartData`。

- [ ] 顶部三段统计数字；空状态 + “去发现”。
- [ ] Top 10 柱状图：`categories` 取歌名，`series[0].data` 取播放次数；`chart-box` 显式高度 420rpx。
- [ ] 最近 7 天折线图：补 0，日期标签 `MM-DD`；`series[0].data` 取分钟。
- [ ] 图表主题色取 DESIGN token（红/金），不修改组件源码。
- [ ] 验证：播放 3 首后图表有真实数据；清空记录后显示空状态；H5 截图。
- [ ] 提交 `lab08-chart`。

## Task 6: 审查、修复、验收

**Files:** `docs/review-lab08.md`、`docs/ai-disclosure-lab08.md`、`docs/JOURNEY.md`、`docs/screenshots/*`、必要代码修复

- [ ] 用 `mattpocock/skills/code-review` 对 `lab08-base...HEAD` 做规范轴 + 规格轴独立审查；输出原文、分级、修复对照写入 `docs/review-lab08.md`。
- [ ] 只修必须修复项；复审修复差异；记录残余风险。
- [ ] 走查失败路径：停 Meting、断网、空 URL、歌单不存在；截图。
- [ ] 四页面运行截图、图表截图、git log 截图。
- [ ] 提交 `lab08-fix`，推送公开云端仓库。

## 提交链

```text
lab08-base       模板与 AGENTS.md
lab08-spec       intent + spec
lab08-plan       plan + DESIGN + prototype
lab08-impl-api   本地 Meting + 请求/缓存/统计工具
lab08-impl-home  首页歌单
lab08-impl-playlist 歌单页
lab08-impl-player 播放页
lab08-chart      统计页 + 柱状图/折线图
lab08-fix        审查修复与验收
```

## 风险与处理

| 风险 | 处理 |
| --- | --- |
| Meting 上游不稳定/被限流 | 服务端 10 分钟缓存；失败返回旧缓存 + stale；前端可重试 |
| 网易云 VIP/版权导致空 URL | 播放页 toast；不写播放记录；演示选全曲曲目 |
| H5 音频自动播放限制 | 播放页由用户点击进入/点击播放后 `play()` |
| 小程序 request 域名限制 | 开发者工具关闭校验；真机改内网地址；README 写明 |
| 图表容器高度 0 | `.chart-box` 显式 `height: 420rpx`，图表组件 `canvas2d`/默认 |
| 快速切歌竞态 | 用请求序号/当前 `songId` 判断，过期响应丢弃 |
| 统计跨天/时区 | 用本地 `new Date(playedAt)` 的年月日 key |
