# 云端音乐 · AI 使用披露表（实训 8）

**姓名：** 李熹元  
**学号：** 20241010113  
**工具：** OpenCode（桌面端）  
**模型：** DeepSeek V4.1 Flash（provider：opencode-go，model：deepseek-v4.1-flash，variant：max）  
**Skills 来源：** `F:\skills\superpowers-7.0.2`、`F:\skills\skills-1.3.1`  
**项目：** `F:\HBuilderX\program\01\实训8\music-cloud`

## 各阶段使用

| 阶段 | 使用工具/模型 | 使用 Skills | 用途 | 主要产出/人工核对 |
| --- | --- | --- | --- | --- |
| 0 基线 | OpenCode / DeepSeek V4.1 Flash；HBuilderX 5.34 | `superpowers/using-superpowers`（方法论） | 读取任务卡与课件、检查两套 Skills、建立 uni-app + Meting 服务骨架 | `lab08-base`、AGENTS、模板；人工确认 H5 编译 |
| 1 意图与澄清 | OpenCode / DeepSeek V4.1 Flash | `mattpocock/grill-with-docs` → `grilling`、`domain-modeling` | 用 grilling 设计树确定四页边界、Meting 选型、缓存/统计口径 | `docs/intent.md`（approved）、`GLOSSARY.md`；人工确认不扩页 |
| 2 规格 | OpenCode / DeepSeek V4.1 Flash | `mattpocock/to-spec` | 把对话与边界整理为用户故事、数据契约、AC-01..AC-12 | `docs/spec.md`（approved）；人工核对 Meting 四接口 |
| 3 设计与原型 | OpenCode / DeepSeek V4.1 Flash；Chrome headless | `mattpocock/prototype`（UI 分支） | 设计“夜航云村”token、四页线框、可打开 HTML 原型 | `docs/DESIGN.md`（approved）、`docs/prototype/index.html`、原型截图 |
| 4 计划 | OpenCode / DeepSeek V4.1 Flash | `superpowers/writing-plans` | 拆 Task 1–6、文件/接口/验证/提交链/风险 | `docs/plan.md`（confirmed） |
| 5 实现-API | OpenCode / DeepSeek V4.1 Flash；Node 24 | `superpowers/executing-plans` | 实现 Meting HTTP 服务、请求三出口、TTL、统计、LRC | `lab08-impl-api`；curl + Node 纯函数测试 |
| 5 实现-首页 | 同上 | `superpowers/executing-plans` | 歌单列表、骨架/错误/旧数据、真实封面、跳转 | `lab08-impl-home`；H5 检查 4 个歌单 |
| 5 实现-歌单 | 同上 | `superpowers/executing-plans` | 页头、200 首曲目、时长、播放入口 | `lab08-impl-playlist`；H5 检查 |
| 5 实现-播放 | 同上 | `superpowers/executing-plans` | `innerAudioContext`、唱片/歌词、切歌、写播放记录、销毁 | `lab08-impl-player`；H5 播放/暂停/切歌 |
| 5 实现-统计 | 同上；`qiun-data-charts` 2.5.0 | `superpowers/executing-plans` | Top 10 柱状图、7 天折线图、空状态、真实聚合 | `lab08-chart`；H5 两个 canvas 渲染 |
| 6 审查 | OpenCode / DeepSeek V4.1 Flash；两个只读子智能体 | `mattpocock/code-review`；`superpowers/requesting-code-review`（方法论） | Standards/Spec 双轴独立审查，不合并 | `docs/review-lab08.md` 原文 + 分级 |
| 7 修复与复审 | OpenCode / DeepSeek V4.1 Flash | `superpowers/systematic-debugging`（按需）、`superpowers/verification-before-completion` | 修歌词缓存、上游失败、卸载竞态、播放入口、token/封面/骨架；复跑页面 | `lab08-fix`；review 修复对照 |
| 8 云端发布 | OpenCode / Edge / GitHub API | 无（发布操作为人工授权） | 创建公开仓库、推送代码与文档 | GitHub `FoveLier/music-cloud` |

## 使用的 Skills 清单

- `superpowers`：`brainstorming`、`writing-plans`、`executing-plans`、`verification-before-completion`、`requesting-code-review`、`systematic-debugging`。
- `mattpocock/skills`：`grill-with-docs`、`grilling`、`domain-modeling`、`wayfinder`、`prototype`、`to-spec`、`to-tickets`、`implement`、`code-review`。
- 实际安装位置：项目 `.opencode/skills/`，同时在当前 OpenCode 工作区 `.opencode/skills/` 注册；`opencode.json` 的 `skills` 数组指向项目目录。

## 人工决策与边界

- 页面范围、Meting 方案、图表库、统计口径由本人确认；AI 不自行扩大页面。
- 所有 UI 文案、设计 token、原型稿经本人走查；不接受无意义次级标签。
- 个人网易云 Cookie 未使用；音频 URL 不缓存；个人 GitHub Token 只用于本地 CLI/API 发布，不写入源码、日志或提交历史。
- AI 生成的代码在 H5/Node 环境实际运行验证；微信小程序端待开发者工具复验。
- 失败路径由本人构造：停 Meting 服务、错误/空 URL、歌单不存在；截图见 `docs/screenshots/`。

## 不披露的个人数据

- 未收集/上传用户播放记录；统计只存本机 Storage。
- 未接入登录、手机号、支付、社交账号。
- 未在代码或文档中保存 NetEase Cookie、GitHub Token 或任何密钥。
