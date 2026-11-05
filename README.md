# 云端音乐 · 仿网易云音乐专题实战

> 实训 8 · 李熹元 · 20241010113
>
> GitHub：https://github.com/FoveLier/music-cloud

## 目录

```text
music-cloud/
├── app/                 uni-app 工程（HBuilderX 打开这一层）
├── meting-server/       本地 Meting HTTP 服务（Node.js + @meting/core）
├── docs/                过程产物、设计、原型、审查、披露、截图
├── .opencode/skills/    本次使用的 Skills（superpowers / mattpocock）
├── AGENTS.md
└── opencode.json
```

## 运行

### 1. 启动 Meting 服务

```bash
cd meting-server
npm install
npm start
```

服务默认监听 `http://localhost:3000`，提供：

- `GET /playlists`：预置歌单元数据
- `GET /playlist?id=3778678`：歌单详情与曲目
- `GET /url?id=<songId>&br=320`：播放地址
- `GET /lyric?id=<songId>`：歌词
- `GET /health`：健康检查

### 2. 运行 uni-app

用 HBuilderX 打开 `app/`，运行到 Chrome（H5）或微信开发者工具。

- H5：`http://localhost:3000` 已设置 CORS。
- 微信开发者工具：详情 → 本地设置 → 勾选“不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书”。
- 真机：把 `app/utils/api.js` 的 `BASE_URL` 改成电脑内网地址。

### 3. 数据说明

- 歌单、歌曲、播放地址、歌词来自本地 Meting 服务；不把网易云个人 Cookie 写入源码。
- 播放地址有时效，缓存只存歌单与歌词，不缓存音频 URL。
- 统计页只读取本机播放记录 `music_history_v1`，不伪造数据。

## 页面

- 首页：预置歌单列表，点击进入歌单页。
- 歌单页：封面、名称、歌曲总数、曲目列表与播放入口。
- 播放页：唱片旋转/暂停、歌词模式、上一首/下一首、离开销毁播放器。
- 统计页：Top 10 播放次数柱状图 + 最近 7 天听歌时长折线图。

## 过程文档

- `docs/intent.md` / `docs/spec.md` / `docs/plan.md`
- `docs/DESIGN.md` / `docs/prototype/index.html`
- `docs/JOURNEY.md` / `docs/review-lab08.md` / `docs/ai-disclosure-lab08.md`
- `docs/screenshots/`：运行与图表截图

## 技能

本项目使用：

- superpowers：brainstorming、writing-plans、executing-plans、verification-before-completion、requesting-code-review、systematic-debugging
- mattpocock/skills：grill-with-docs、grilling、domain-modeling、wayfinder、prototype、to-spec、to-tickets、implement、code-review
