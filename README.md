# 寿冬与秋

一个记录生活、成长与日常灵感的个人博客。前台是轻松明亮的生活手帐风格，后台用于写作、管理内容与维护站点资料。

线上地址：[blood-moon-blog.pages.dev](https://blood-moon-blog.pages.dev)

## 架构

```text
Cloudflare Pages（Vue 3 前台与后台）
        ↓
Cloudflare Workers（Hono API）
        ↓
Supabase（PostgreSQL 与媒体存储）
```

`workers-backend/` 是唯一的生产后端。`backend/` 中的 Express 实现仅保留作历史兼容与离线参考，不参与默认开发或部署。

## 主要功能

- 文章、分类、标签、归档、搜索与 RSS
- Vditor 写作编辑器：支持 Markdown、粘贴内容、图片压缩上传、音频和视频插入、草稿恢复
- 读者评论与无限层回复；评论发布后立即展示，后台可直接删除
- 首页、关于页与后台“公开作者资料”联动；个人中心头像可同步到首页
- 后台内容管理、回收站、数据统计、音乐管理、友链与数据导出
- 猪猪侠素材以贴纸和状态反馈融入页面；音乐默认不自动播放

## 本地开发

要求：Node.js 20 或更新版本。

```bash
cd frontend
npm install
npm run dev
```

开发环境默认直连已部署的 Worker API，地址由 `frontend/.env.development` 配置。修改 Worker 行为时，请在 `workers-backend/` 中进行：

```bash
cd workers-backend
npm install
npm run typecheck
# 如已配置 Cloudflare/Supabase 开发凭据，可运行 npm run dev
```

## 质量检查

```bash
cd frontend
npm run lint
npm run test:unit
npm run build
npm audit --omit=dev

cd ../workers-backend
npm run typecheck
```

`tests/smoke-test.mjs` 会检查已部署的健康接口、公开文章列表、设置、RSS、站点地图与前台首页；每个请求均有超时保护。GitHub Actions 会在部署前执行 lint、单元测试、Worker 类型检查和构建，部署后再运行冒烟测试。

## 媒体规范

- 不要把图片、音频或视频 Base64 写入文章正文；使用上传接口得到 URL。
- 文章列表接口只返回标题、摘要、封面等卡片字段，正文只在详情页读取。
- 猪猪侠动图使用压缩后的动画 WebP。新增或替换 GIF 后运行：

```bash
cd frontend
npm run optimize:assets
```

- 长视频建议使用外部平台嵌入；站内音频和视频应限制体积。

## 部署

推送 `master` 分支会触发 GitHub Actions：

1. 安装依赖并运行 lint、单元测试、Worker 类型检查；
2. 构建前端；
3. 部署 Cloudflare Worker；
4. 部署 Cloudflare Pages；
5. 运行线上冒烟测试。

```bash
git push origin master
```

首次部署所需的 Cloudflare 密钥、Supabase 配置和媒体存储说明见 [DEPLOY.md](DEPLOY.md)。

## 目录

```text
frontend/          Vue 3 应用、页面与写作体验
workers-backend/   Hono + Supabase 生产 API
backend/           Express 历史兼容实现
database/          PostgreSQL 迁移脚本
tests/             冒烟测试与无副作用单元测试
.github/           自动检查、部署与健康检查工作流
```
