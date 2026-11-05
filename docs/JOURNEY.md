# 云端音乐 · JOURNEY

记录各阶段的关键提示词、主要产出、决策与修正。不是完整聊天记录，只保留能复现工作流的骨架。

## 阶段 0：确认任务与基线

**关键提示词**

```text
读取 F:\实训8-仿网易云音乐专题实战-学生版.md 与 F:\实训8课件。
检查 F:\skills 下两套技能，选择需要的 skill 安装。
新建 uni-app 工程 music-cloud，Meting 服务单独目录；
不要写入个人网易云 Cookie；先建立 lab08-base。
```

**主要产出**

- `lab08-base`：uni-app 模板、AGENTS、Meting 服务骨架、`qiun-data-charts`、Skills。
- 决策：仓库根目录放 `app/` 与 `meting-server/`，HBuilderX 只打开 `app/`。

**Skill**

- 安装检查：`superpowers`、`mattpocock/skills`；后续阶段按需加载。
- 记录：F 盘 `F:\skills` 下已有 `superpowers-7.0.2`、`skills-1.3.1`。

## 阶段 1：grill-with-docs 边界澄清

**关键提示词**

```text
Use skill grill-with-docs.
目标：仿网易云音乐，四页最小需求集；Meting 本地服务；本地播放记录；图表用 qiun-data-charts。
请先只问会改变实现的问题：页面范围、数据源、播放容错、缓存策略、统计口径、UI 方向。
```

**grilling 设计树（本轮 frontier 与决定）**

| 问题 | 决策 | 理由 |
| --- | --- | --- |
| 页面范围 | 只做首页、歌单、播放、统计 4 页 | 任务卡最小需求集；不扩搜索/登录/评论 |
| 数据来源 | `@meting/core` + 本地 Node HTTP 服务 | 课程指定；不把 Cookie 放前端 |
| 平台 | `netease`，示例歌单 3778678/3779629/19723756 | 课程示例；便于演示 |
| 播放容错 | 全曲/试听/空 URL 都提示；空 URL 不算播放 | 版权现实；避免假记录 |
| 缓存 | 歌单 10 分钟、歌词 24 小时；URL 不缓存 | 封面/歌单变化慢；URL 有时效 |
| 统计口径 | 播放次数=开始播放新歌；时长=实际播放秒数 | 任务卡要求；避免把未播放时长算进去 |
| UI | 夜航云村：墨色 + 云红 + 金色 | 有网易云气质，但不复制版权资产 |
| 图表 | `qiun-data-charts` 柱状图 + 折线图 | 课程指定；跨端 |

**主要产出**

- `GLOSSARY.md`：歌单、曲目、播放记录、播放次数、听歌时长、缓存条目、stale。
- `docs/intent.md`（approved）。

**Skill**

- `mattpocock/skills/grill-with-docs` → 实际加载 `grilling` + `domain-modeling`。
- 备注：任务卡已经给出大部分边界，本轮以“自答 + 记录”代替逐问等待，避免阻塞交付；所有决定可被用户推翻。

## 阶段 2：to-spec 规格

**关键提示词**

```text
Use skill to-spec.
把上面的边界、用户故事、Meting 契约、缓存/错误/统计/图表要求整理成 docs/spec.md。
Status: approved。不要写具体文件路径和代码片段；验收标准要可验证。
```

**主要产出**

- `docs/spec.md`（approved）：4 页、Meting 4 个接口、请求三出口、缓存 TTL、播放记录模型、AC-01..AC-12。

**Skill**

- `mattpocock/skills/to-spec`（按本地 docs 产出，不依赖 GitHub issue）。
- `domain-modeling`：术语统一为“歌单/曲目/播放记录/播放次数/听歌时长”。

## 阶段 3：DESIGN + prototype

**关键提示词**

```text
Use skill prototype (UI branch).
以网易云音乐的暗色/红/唱片气质为参照，但不要复制 Logo/版权插画。
做 docs/DESIGN.md 和 docs/prototype/index.html：
四页手机稿、设计 token、组件、动效、空/错/旧数据状态；
避免“标题+副标题+说明+标签”的 AI 味。
```

**主要产出**

- `docs/DESIGN.md`（approved）：夜航云村 token、四页线框、组件、动效、走查清单。
- `docs/prototype/index.html`：四屏可打开原型；截图 `docs/screenshots/08-prototype.png`。

**Skill**

- `mattpocock/skills/prototype`（UI 分支）。
- 设计决定：墨色 `#0B0B10`、云红 `#FF4D5A`、金 `#F5C86B`；封面优先、红色面积克制。

## 阶段 4：writing-plans 计划

**关键提示词**

```text
Use skill writing-plans.
把 spec + DESIGN + prototype 拆成可独立验证的步骤：
Meting 服务/数据层 → 首页 → 歌单 → 播放 → 统计图表 → 审查修复。
每步写清文件、接口、验证命令、提交名 lab08-*；Status: confirmed。
```

**主要产出**

- `docs/plan.md`（confirmed）：Task 1–6、提交链、风险表、Review Focus。
- 计划中的提交名：`lab08-impl-api`、`lab08-impl-home`、`lab08-impl-playlist`、`lab08-impl-player`、`lab08-chart`、`lab08-fix`。

**Skill**

- `superpowers/writing-plans`。

## 阶段 5：implement

**关键提示词**

```text
Use skill executing-plans.
按 docs/plan.md 的 Task 1–5 逐项执行；每步先实现，后运行验证，再提交 lab08-*。
不扩大页面范围；不改 manifest 平台权限；不把 Cookie/Token 写入代码。
```

**主要产出与提交**

| 步骤 | 提交 | 验证 |
| --- | --- | --- |
| Meting 服务 + 数据层 | `6f1120c lab08-impl-api` | `curl /health`、`/playlists`（4 个）、`/playlist?id=3778678`（200 首）、`/url`、`/lyric`；Node 纯函数测试。 |
| 首页 | `d1cd901 lab08-impl-home` | H5 显示热歌榜/新歌榜/飙升榜/原创榜，封面加载，点击进入歌单。 |
| 歌单页 | `91542d8 lab08-impl-playlist` | H5 显示热歌榜 200 首、序号/歌名/歌手/时长/▶；点击进入播放页。 |
| 播放页 | `4604e23 lab08-impl-player` | H5 播放/暂停、上一首/下一首、唱片旋转、歌词模式；`music_history_v1` 写入。 |
| 统计页 | `fb5e6bc lab08-chart` | H5 两个 canvas 渲染；柱状图/折线图容器显式 420rpx。 |

**实际决策**

- 服务端 `@meting/core` 用两个实例分别固定 `format(false)` / `format(true)`，避免并发切换格式。
- 播放 URL 不缓存；歌单/歌词缓存；`url` 返回空时播放页提示，不写播放记录。
- 统计口径：开始播放新歌 → 播放次数 +1；暂停/切歌/离开时把实际 `currentTime` 写入 `listenedSeconds`；暂停恢复同一首不重复。
- 首页 4 个歌单：3778678 热歌榜、3779629 新歌榜、19723756 飙升榜、2884035 原创榜。
- H5 `innerAudioContext` 播放实测可用；微信开发者工具待复验。

## 阶段 6：review / fix

**关键提示词**

```text
Use skill code-review.
Fixed point: lab08-base。Standards 轴读 AGENTS.md/DESIGN.md，Spec 轴读 docs/spec.md；
两个只读子智能体分别输出，不合并；每条带文件:行、依据、严重度。
输出原文、分级、修复对照写入 docs/review-lab08.md。
```

**审查输出摘要**

- Standards：缺 review/披露文档；页面 `vh`；`--ease` 未定义；token 覆盖不全；封面无 `@error`；骨架无限 shimmer；重复状态块/播放器职责多。
- Spec：歌词缓存未接；`/playlists` 失败伪造 0 首；`onUnload` in-flight 竞态；曲目行 ▶ 不播；`EDITOR'S PICK` 第二英文 eyebrow。
- 人工分流：必须修复项全部处理；重复状态块/播放器职责记录为后续重构；`vh`/token 写成显式设计例外。

**修复**

- 见 `docs/review-lab08.md` 第四、五节的对照；修复提交 `lab08-fix`。
- 复审使用 `git diff lab08-chart...HEAD` 只审修复差异；子智能体确认 1–8 已解决，9 文档在补完后已解决。
- 截图验收又发现并修复 4 个渲染问题：播放页环境遮罩盖住内容（z-index）、歌词模式歌名重复（隐藏下方歌名块）、图表标签裁切/Y 轴小数（动态轴）、stale 文案矛盾（固定“使用上次缓存”）。

**截图**

- 四页面：`08-home.png`、`08-playlist.png`、`08-player-vinyl.png`、`08-player-lyric.png`。
- 图表：`08-stats.png`（真实播放记录聚合）。
- 失败：`08-failure-service.png`（服务停止）、`08-failure-stale.png`（旧缓存降级）。
- 原型：`08-prototype.png`。

## 阶段 7：云端发布

**关键提示词**

```text
使用 FoveLier 的 GitHub 账号，创建公开仓库 music-cloud，推送完整 git 历史/代码与 docs。
不把 Token 写入仓库；发布后用 git ls-remote 或仓库页确认可访问。
```

**主要产出**

- 云端仓库：`https://github.com/FoveLier/music-cloud`（public）。
- 本地提交链：`lab08-base` → `lab08-spec` → `lab08-plan` → `lab08-impl-*` → `lab08-chart` → `lab08-fix`。
- 发布方式：由于本机 `github.com` 解析到本地代理、Git smart HTTP 返回 502，使用 GitHub REST API 上传最终快照；本地完整提交链与 `08-git-log.png` 保留。
