# 云端音乐 · 审查与修复记录（实训 8）

- 固定点：`lab08-base`（tag）
- 审查范围：`git diff lab08-base...HEAD`
- 审查方式：`mattpocock/skills/code-review`，Standards 轴与 Spec 轴分别由独立只读子智能体完成；不合并为总体评价。
- 审查时间：2026-11-05
- 代码版本：`lab08-chart` + 工作区入口修正

## 一、Standards 轴原文

> P=`app/pages`；S=`meting-server/server.mjs`；U=`app/utils`。
>
> **硬规范（必须修复）**
> - `docs/ai-disclosure-lab08.md`、`review-lab08.md` 缺失（AGENTS:33-34）。
> - P 四页用 `vh`（index:192、playlist:208、player:451/517/792、stats:209），非 rpx。
> - player:634 `var(--ease)` 未定义，歌词转场失效。
> - 非 token：index:204/223/285/421、playlist:302/327/381、player:453/638/687/747、stats:259；偏离 DESIGN token 与 4.2-4.4。
> - 封面无 `@error`：index:40、playlist:34、player:25/36；失败无渐变+首字（DESIGN §5/§8）。
> - 骨架 shimmer 无限循环：index:469、playlist:477/490（DESIGN 3.4）。
>
> **建议（判断性异味）**
> - 重复：index:11-31 与 playlist:11-30 状态块；S:172-263 缓存回退（Duplicated Code）。
> - S:206-215 失败时伪造 0 首摘要（数据不诚实）。
> - U/format.js:17、U/cache.js:9/15 未用（Speculative Generality）；player:180-445 兼管缓存/音频/歌词/模式/导航（Divergent Change）。
> - 未提交入口：playlist:178-190、player:166/218 的 autoplay 改动仍在工作区。

## 二、Spec 轴原文

> (a) 歌词缓存：player.vue:312-323 未读写 cache.js:9/15 的 lyric 键；spec:88/112「歌词缓存 24 小时」/AC-09。必须修复。
> (b) index.vue:49「EDITOR'S PICK」违反 DESIGN:103「唯一英文 eyebrow」。建议。
> (c) /playlists 上游失败被吞掉，返回假歌单并写缓存（server.mjs:204-220；spec:89「无缓存返回 ok:false」）。必须修复。
> (c) onUnload 未作废 in-flight load，异步返回仍建实例（player.vue:176-179,194-218；spec:165「destroy()」）；未提交 autoplay=1 不冲突，但放大此路径，曲目行 ▶ 仍不播（playlist.vue:85；spec:152「播放按钮」）。必须修复。

## 三、分级与人工分流

| 来源 | 条目 | 审查分级 | 人工处理 |
| --- | --- | --- | --- |
| Standards | 缺失 review / AI 披露 | 必须修复 | 接受；本文件 + `ai-disclosure-lab08.md` |
| Standards | 页面 `vh` | 必须修复 | 接受为“页面级满屏例外”；写入 DESIGN/AGENTS，普通组件仍 rpx |
| Standards | `var(--ease)` 未定义 | 必须修复 | 接受；player `.page` 定义 `--ease` |
| Standards | 非 token 颜色/间距 | 必须修复 | 接受；DESIGN 扩展 `text-faint/red-light/chart-grid/skeleton` 与 4rpx 微调栅格 |
| Standards | 封面无 `@error` | 必须修复 | 接受；首页/歌单/播放页封面失败回退渐变+首字 |
| Standards | 骨架无限 shimmer | 必须修复 | 接受；移除无限动画，保留静态骨架 |
| Standards | 重复状态块/播放器职责多 | 建议 | 记录；本轮不拆页面壳与播放器，避免扩大改动 |
| Spec | 歌词缓存未接 | 必须修复 | 接受；播放页接 `music_lyric_<id>_v1` 24h |
| Spec | `/playlists` 伪造 0 首 | 必须修复 | 接受；全失败返回 `ok:false`，部分失败标记 stale |
| Spec | onUnload in-flight | 必须修复 | 接受；`pageAlive` + `playSession` 守卫 |
| Spec | 曲目行 ▶ 不播 | 必须修复 | 接受；入口传 `autoplay=1` |
| Spec | EDITOR'S PICK 第二英文 eyebrow | 建议 | 接受；改为“本周精选” |

> 说明：`vh` 与设计 token 的冲突不是“让代码迁就文档”，也不是“让文档迁就代码”，而是把页面级视口高度、4rpx 光学微调、深色图表网格写成显式例外；组件内部仍按 token 执行。

## 四、修复对照

| # | 问题 | 修复位置 | 做法 | 验证 |
| --- | --- | --- | --- | --- |
| 1 | 歌词未缓存 | `app/pages/player/player.vue` | `loadLyric()` 读 `music_lyric_<id>_v1`，24h 内不请求；过期失败用旧缓存 | H5 storage 出现 `music_lyric_3456047164_v1`；断网仍能显示已缓存歌词 |
| 2 | `/playlists` 上游全失败伪造数据 | `meting-server/server.mjs` | 记录 failed 数；全失败抛错/有旧缓存则 stale；部分失败返回 stale 提示 | 停 Meting 上游/停服务时页面显示错误或旧数据 banner |
| 3 | 卸载后异步建播放器 | `app/pages/player/player.vue` | `pageAlive`、`playSession` 守卫；异步返回后不再写 audio/src | 进入播放页立即返回，无控制台 audio 错误、无残留实例 |
| 4 | 曲目行 ▶ 不播 | `app/pages/playlist/playlist.vue` | 行/▶/播放全部统一传 `autoplay=1`；播放页 onLoad 读取 | H5 点击曲目后自动播放，按钮显示暂停 |
| 5 | 封面失败无回退 | 首页/歌单/播放页 | 所有 `<image>` 加 `@error`，清空 cover 走渐变+首字 | 断网/坏封面 URL 时显示渐变占位 |
| 6 | 骨架无限动画 | 首页/歌单 | 移除 `animation: shimmer` 与 keyframes | 加载时静态骨架，无循环闪烁 |
| 7 | `--ease` 未定义 | 播放页 | `.page { --ease: cubic-bezier(...) }` | 歌词行切换有过渡 |
| 8 | 设计 token 覆盖不全 | `docs/DESIGN.md`、`AGENTS.md` | 增加 faint/red-light/chart-grid/skeleton token；4rpx 微调栅格；页面级 vh 例外 | 设计走查逐项对照 |
| 9 | 文档缺失 | `docs/review-lab08.md`、`docs/ai-disclosure-lab08.md` | 新建并填写 | 文件存在、三段审查/披露表完整 |
| 10 | 播放页环境遮罩盖住内容 | `app/pages/player/player.vue` | 给内容块统一 `position:relative; z-index:2`，背景/遮罩留在 z-index 0/1 | 重截 `08-player-vinyl.png`，文字/唱片恢复亮色 |
| 11 | 歌词模式歌名重复 | `app/pages/player/player.vue` | 歌词模式隐藏下方 `.song-block`，只保留顶部小封面标题 | 重截 `08-player-lyric.png`，标题只出现一次 |
| 12 | 图表标签裁切/Y 轴小数 | `app/pages/stats/stats.vue` | 短标签、Top 10 动态整数轴；折线图按最大分钟数动态 splitNumber | 重截 `08-stats.png`，柱状图 0/1/2、折线图 0/1 |
| 13 | stale banner 显示“刚刚更新”自相矛盾 | 首页/歌单 | 固定提示“数据可能不是最新 · 使用上次缓存” | 重截 `08-failure-stale.png` |

## 五、复审

复审范围：`git diff lab08-chart...HEAD`（修复提交 `lab08-fix`），只复审 1–9 项，不重新评审全量。

### 复审结论（子智能体输出摘要）

- 1 歌词缓存：**已解决**。`player.vue` 读写 `music_lyric_<id>_v1`；24h 命中，过期请求失败用旧缓存。
- 2 `/playlists` 全失败：**已解决**。`server.mjs` 全失败抛错且不写假缓存；有旧缓存返回 stale，否则 `ok:false`。
- 3 卸载竞态：**已解决**。`pageAlive`/`playSession` 守卫；卸载后异步不创建/操作 audio。
- 4 曲目行 ▶：**已解决**。行/▶/播放全部传 `autoplay=1`，播放页读取并播放。
- 5 封面回退：**已解决**。首页/歌单/播放页 image 均有 `@error`，失败走渐变+首字。
- 6 骨架动画：**已解决**。移除 shimmer 与 keyframes。
- 7 `--ease`：**已解决**。播放页 `.page` 定义变量。
- 8 vh/token：**已解决**。DESIGN/AGENTS 写明页面级 vh 例外、4rpx 微调、扩展 token。
- 9 文档：**部分解决 → 已解决**。复审时 review 的结论仍为“待补”；本文件完成本节与修复对照后，文档完整。

### 追加截图验收（不属于原 9 条）

- 播放页首次截图发现环境遮罩层级错误，已修复并重截；这是审查未覆盖的渲染问题，记录为 #10。
- 歌词模式发现歌名重复，按 DESIGN“布局解释层级”修复；记录为 #11。
- 图表首次截图发现标签裁切/Y 轴小数，修复动态轴；记录为 #12。
- stale 文案与“刚刚更新”矛盾，修复为固定提示；记录为 #13。

### 截图清单

```text
docs/screenshots/08-home.png
docs/screenshots/08-playlist.png
docs/screenshots/08-player-vinyl.png
docs/screenshots/08-player-lyric.png
docs/screenshots/08-stats.png
docs/screenshots/08-failure-service.png
docs/screenshots/08-failure-stale.png
docs/screenshots/08-prototype.png
```

提交记录截图作为外部附件 `08-git-log.png`，不放进仓库，避免“截图中的提交哈希”与提交自引用。截图内容为 `git log --oneline --decorate -n 30`，包含 `lab08-base` 标签和完整链路。

统计截图来自本机真实播放：`music_history_v1` 中的 `listenedSeconds` 与 `playedAt` 聚合；不是硬编码图表。失败截图通过停 Meting 服务、清歌单缓存/保留旧缓存分别构造。
