# 云端音乐 · 工程约定

## 项目
- 一句话：仿网易云音乐的四页移动应用，歌单/歌曲/播放地址/歌词来自本地 Meting HTTP 服务，播放统计来自本地缓存。
- 技术栈：uni-app（Vue3 选项式）+ HBuilderX + 微信小程序/H5；图表用 `qiun-data-charts`。
- 仓库根目录：`music-cloud`；uni-app 工程在 `app/`；Meting 服务在 `meting-server/`，两者分开，避免 HBuilderX 误编译 Node 服务。

## 目录
- `app/pages/index/index`：首页歌单列表
- `app/pages/playlist/playlist`：歌单页
- `app/pages/player/player`：播放页
- `app/pages/stats/stats`：统计页
- `app/utils/`：请求、缓存、播放统计、歌词、格式化
- `app/uni_modules/qiun-data-charts/`：图表组件（不修改组件源码）
- `docs/`：intent / spec / plan / DESIGN / JOURNEY / review / ai-disclosure / prototype
- `meting-server/`：Node.js + `@meting/core` 本地 HTTP 服务

## 约束
- Vue3 选项式 API（data / methods / onLoad / onUnload），不用组合式重写。
- 长度单位统一 rpx；页面级满屏状态可使用 `vh`（DESIGN 明确例外），其余组件尺寸/间距/圆角一律 rpx；颜色、字号、间距、圆角使用 `docs/DESIGN.md` 的 token（含扩展 token）。
- 页面不得散写 `uni.request`；统一走 `app/utils/api.js`。
- 缓存统一走 `app/utils/cache.js`；播放记录统一走 `app/utils/stats.js`。
- 播放器只在播放页创建 `uni.createInnerAudioContext()`，`onUnload` 必须 `destroy()`。
- 不在源码、日志、错误提示、提交历史中出现个人 NetEase Cookie、GitHub Token 或其他密钥。
- 不接入登录、支付、社交、搜索、评论、云同步；不做非目标页面。
- 不修改 `manifest.json` 的平台权限，不引入新的运行时依赖；`qiun-data-charts` 是课程指定组件。
- H5 请求 `localhost` 需服务端 CORS；微信开发者工具需勾选“不校验合法域名”。
- 每个实现步骤必须能独立运行并留下验证证据；提交信息使用 `lab08-*` 前缀。

## AI 工作流
- 使用 `superpowers`：brainstorming / writing-plans / executing-plans / verification-before-completion / requesting-code-review。
- 使用 `mattpocock/skills`：grill-with-docs（grilling + domain-modeling）、prototype、to-spec、to-tickets、implement、code-review。
- 关键提示词、产出、决策与修复记录写入 `docs/JOURNEY.md` 和 `docs/review-lab08.md`。
- 任何 AI 改动需写入 `docs/ai-disclosure-lab08.md`：阶段、工具、模型、用途、技能名。
