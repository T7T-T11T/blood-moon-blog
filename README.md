# 寿冬与秋 - 个人博客系统

基于 Vue 3 + Node.js Express / Cloudflare Workers(Hono) + PostgreSQL(Supabase) 的个人博客系统，采用血月暗黑哥特风格主题，支持文章管理、评论互动、音乐播放等功能。

> 架构说明：生产环境使用 `workers-backend/`（Hono + Supabase JS SDK，部署于 Cloudflare Workers），前端生产环境直连 Workers（跨域）。`backend/`（Express + pg）仅保留作为本地开发后端，两端接口路径保持一致，生产功能以 `workers-backend/` 为准。

## 技术栈

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 前端框架 | Vue 3 | ^3.4.0 | 组合式 API + `<script setup>` |
| 构建工具 | Vite | ^5.0.0 | 开发服务器 + 打包 |
| UI 组件库 | Element Plus | ^2.5.0 | 基于 Vue 3 的组件库 |
| 富文本编辑器 | TipTap | ^3.29.2 | 基于 ProseMirror 的现代编辑器 |
| 状态管理 | Pinia | ^2.1.0 | 全局用户状态管理（持久化） |
| 路由 | Vue Router | ^4.2.0 | History 模式（干净 URL）+ 路由守卫 |
| HTTP 请求 | Axios | ^1.6.0 | 请求/响应拦截器 |
| 图表 | ECharts | ^6.1.0 | 数据可视化 |
| Markdown 渲染 | marked | ^15.0.0 | 博客内容渲染 |
| XSS 防护 | DOMPurify | ^3.4.12 | HTML 消毒 |
| 文件上传 | multer | ^2.2.0 | 后端 multipart/form-data 处理 |
| 后端框架（本地开发） | Express | ^4.18.2 | RESTful API（`backend/` 目录） |
| 后端框架（生产） | Hono | ^4.7.0 | Cloudflare Workers（`workers-backend/` 目录） |
| 数据库驱动（本地开发） | pg | ^8.22.0 | PostgreSQL 连接池 + pgCompat 兼容层 |
| 数据库驱动（生产） | @supabase/supabase-js | ^2.45.0 | Supabase JS SDK |
| 密码加密 | bcryptjs | ^2.4.3 | 注册密码加密 |
| 身份认证 | jsonwebtoken | ^9.0.2 | JWT Token |
| 安全头 | helmet | ^8.3.0 | HTTP 安全响应头 |
| 限流 | express-rate-limit | ^8.6.1 | API 请求限流 |
| 环境变量 | dotenv | ^16.4.5 | 配置管理 |
| 代码规范 | ESLint + Prettier | - | 代码质量保障（lint 零错误） |
| 按需引入 | unplugin-vue-components / unplugin-auto-import | - | Element Plus 按单组件打包（自定义解析器） |
| 代码高亮 | highlight.js（经 lowlight） | - | 文章代码块语法高亮 |
| 数据库 | PostgreSQL | 15+（Supabase） | 11 张数据表 |

## 功能特性

### 🎨 前台展示
- **血月主题**：暗黑哥特风格设计，沉浸式阅读体验
- **文章列表**：分页浏览、分类筛选、标签聚合
- **文章详情**：TipTap 富文本渲染、代码高亮、图片灯箱
- **搜索功能**：关键词搜索、搜索结果高亮
- **归档浏览**：时间线视图、标签云
- **音乐播放**：全局浮动播放器，后台音乐管理
- **友情链接**：友链展示与管理
- **评论互动**：树形评论、点赞、最新/最热/最早排序
- **阅读体验**：字号调节（A-/A+）、复制 Markdown、打印/导出 PDF、明暗主题切换
- **文章导航**：上一篇/下一篇、相关推荐、目录、阅读进度条
- **防垃圾评论**：蜜罐字段 + 关键词过滤 + 审核机制
- **RSS 订阅**：支持 RSS 2.0（`/api/rss`）
- **PWA**：可添加到主屏幕，离线可访问

### 🛠️ 后台管理
- **仪表盘**：数据统计、趋势图表、快捷操作
- **文章管理**：创建/编辑/删除/置顶/草稿
- **富文本编辑器**：TipTap 编辑器，支持代码块、图片、链接、表格
- **分类/标签**：完整的 CRUD 操作
- **评论审核**：评论管理、审核、删除
- **媒体库**：图片/音乐/视频/文件上传管理
- **系统设置**：站点配置、个人信息
- **数据统计**：文章/评论/访问数据可视化
- **操作日志**：管理员操作审计记录
- **回收站**：软删除恢复、永久删除
- **数据导出**：文章/评论一键导出 JSON
- **友链审核**：访客自助申请，后台审核后展示

### 🔒 安全特性
- JWT Token 认证 + bcrypt 密码加密
- Helmet 安全响应头（CSP/HSTS/X-Frame-Options）
- CORS 白名单跨域
- API 请求限流（登录/评论/上传）
- SQL 注入防护（参数化查询）
- XSS 防护（DOMPurify HTML 消毒）
- 软删除支持（可恢复）
- 评论防垃圾：蜜罐字段 + 关键词过滤 + Cloudflare KV 跨节点限流
- 评论审核开关：开启后新评论进入待审核，审核通过才展示

### 🚀 性能与运维
- **首屏体积**：约 858 KB（gzip 252 KB），对比初版降低约 2/3
- **懒加载**：路由级按需加载，编辑器/图表/高亮库不进首屏
- **缓存**：CDN 长缓存 + Service Worker 预缓存，二次访问秒开
- **自动化测试**：部署后自动运行 API 冒烟测试（`tests/smoke-test.mjs`）
- **定时监控**：每小时健康检查（GitHub Actions），异常自动通知

## 项目结构

```
task_manager_vue/
├── database/
│   └── migrations/              # 数据库迁移脚本
├── backend/                     # 本地开发后端（Express + pg）
│   ├── config/
│   │   └── db.js                # PostgreSQL 连接池配置
│   ├── controllers/             # 请求控制器
│   ├── middleware/
│   │   ├── auth.js              # JWT 认证中间件
│   │   └── logAction.js         # 操作日志中间件
│   ├── routes/                  # API 路由
│   ├── services/                # 业务逻辑层
│   ├── .env.example             # 环境变量示例
│   └── server.js                # 后端入口（端口 3000）
├── workers-backend/             # 生产后端（Hono + Supabase JS SDK，部署到 Cloudflare Workers）
│   ├── src/
│   │   ├── routes/              # API 路由（与 backend/ 接口路径对齐）
│   │   ├── auth.js              # 认证（Web Crypto API）
│   │   ├── db.js                # Supabase 客户端封装
│   │   └── index.js             # Workers 入口
│   └── wrangler.toml            # Cloudflare Workers 部署配置
├── frontend/
│   ├── src/
│   │   ├── api/                 # API 请求封装
│   │   ├── components/          # 公共组件
│   │   │   ├── common/          # 通用组件
│   │   │   ├── front/           # 前台组件
│   │   │   └── tiptap-extensions/ # TipTap 扩展
│   │   ├── directives/          # 自定义指令
│   │   ├── layouts/             # 布局组件
│   │   ├── router/              # 路由配置
│   │   ├── stores/              # Pinia 状态管理
│   │   ├── utils/               # 工具函数
│   │   ├── views/               # 页面组件
│   │   │   ├── admin/           # 后台管理页面
│   │   │   └── front/           # 前台展示页面
│   │   ├── App.vue              # 根组件
│   │   └── main.js              # 应用入口
│   ├── .env.development         # 开发环境配置（Vite proxy → localhost:3000）
│   ├── .env.production          # 生产环境配置（直连 Workers URL）
│   ├── vite.config.js           # Vite 配置
│   └── package.json
├── .github/workflows/       # GitHub Actions（部署 + 冒烟测试 + 每小时监控）
├── .gitignore
├── .prettierrc
├── DEPLOY.md                # 部署指南
├── history.md               # 版本历史
└── README.md
```

## 快速开始

### 1. 环境要求

- Node.js >= 18
- PostgreSQL >= 15（推荐使用 Supabase 免费托管）
- npm 或 yarn

### 2. 数据库初始化

本项目使用 PostgreSQL（推荐 Supabase 免费托管）。在 Supabase 项目控制台 → SQL Editor 中依次执行迁移脚本：

```bash
# 迁移脚本位于 database/migrations/ 目录，按编号顺序在 Supabase SQL Editor 执行：
# 001_init.sql           初始化表结构（users/articles/categories/tags/comments/links 等）
# 002_friends.sql        友情链接表
# 003_likes_favorites.sql 点赞与收藏表
# 004_soft_delete.sql    文章软删除字段
# 005_operation_logs.sql 操作日志表
# 006_article_top.sql    文章置顶字段
# 007_comments_avatar_text.sql  评论头像字段改 TEXT（容纳 base64）
```

> 注意：`database/init_postgres.sql` 为全量建表脚本（PostgreSQL 语法），新建库时可一次性执行。

### 3. 配置环境变量

```bash
# 复制示例文件
cp backend/.env.example backend/.env

# 编辑 backend/.env，修改数据库密码和 JWT 密钥
# DB_HOST=localhost
# DB_USER=root
# DB_PASSWORD=你的密码
# DB_NAME=task_manager
# JWT_SECRET=你的密钥
```

### 4. 启动后端

```bash
cd backend
npm install
npm start
```

启动成功输出：
```
========================================
  寿冬与秋 后端已启动
  地址：http://localhost:3000
  健康检查：http://localhost:3000/api/health
========================================
```

### 5. 启动前端

```bash
cd frontend
npm install
npm run dev
```

浏览器自动打开 `http://localhost:5173`

### 6. 默认账号

- 用户名：`admin`
- 密码：初始为 `admin123`，**首次登录后请立即在"个人中心"修改**

## API 接口

详细的 API 接口请参考各路由模块源文件。

### 认证接口
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/login | 管理员登录 |
| GET | /api/auth/profile | 获取用户信息 |
| PUT | /api/auth/profile | 更新个人资料 |
| PUT | /api/auth/password | 修改密码 |

### 文章接口
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/articles/public | 公开文章列表（分页） |
| GET | /api/articles/public/:id | 文章详情（含上一篇/下一篇） |
| GET | /api/articles/public/hot | 热门文章 |
| GET | /api/articles/public/latest | 最新文章 |
| GET | /api/articles/public/search | 搜索文章 |
| GET | /api/articles/public/category/:slug | 分类文章 |
| GET | /api/articles/public/tag/:slug | 标签文章 |
| GET | /api/articles/public/archives | 文章归档 |
| GET | /api/articles/public/related/:id | 相关文章推荐 |
| GET | /api/articles | 管理文章列表 |
| POST | /api/articles | 创建文章 |
| PUT | /api/articles/:id | 更新文章 |
| DELETE | /api/articles/:id | 删除文章 |
| PUT | /api/articles/:id/toggle-top | 切换置顶 |
| GET | /api/articles/:id/export | 导出文章（管理员） |

### 分类/标签接口
| 方法 | 路径 | 说明 |
|------|------|------|
| GET/POST | /api/categories | 分类列表/创建 |
| PUT/DELETE | /api/categories/:id | 分类更新/删除 |
| GET/POST | /api/tags | 标签列表/创建 |
| PUT/DELETE | /api/tags/:id | 标签更新/删除 |

### 评论接口
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/comments/:articleId | 文章评论树（公开） |
| POST | /api/comments/:articleId | 发表评论（含防垃圾校验） |
| GET | /api/comments | 评论列表（管理） |
| PUT | /api/comments/:id/status | 审核/修改评论状态 |
| DELETE | /api/comments/:id | 删除评论 |

### 其他接口
| 模块 | 路径 | 说明 |
|------|------|------|
| 友情链接 | /api/friends、/api/links | 友链 CRUD（管理） |
| 友链申请 | POST /api/links/apply | 访客自助申请（进入待审核） |
| 音乐管理 | /api/music | 音乐 CRUD + 上传 |
| 系统设置 | /api/settings | 读取/更新设置 |
| 仪表盘 | /api/dashboard/stats | 统计数据 |
| 回收站 | /api/trash | 软删除恢复 |
| 操作日志 | /api/logs | 日志查询 |
| 数据导出 | /api/export/comments、/api/export/articles | JSON 导出（管理） |
| 访问统计 | /api/visits | PV/UV 统计 |
| RSS | /api/rss、/api/rss.xml | RSS 2.0 订阅 |
| Sitemap | /api/sitemap.xml | 站点地图 |

## 前端路由

| 路径 | 页面 | 需登录 |
|------|------|--------|
| /login | 管理员登录 | 否 |
| / | 首页 | 否 |
| /article/:id | 文章详情 | 否 |
| /category/:slug | 分类归档 | 否 |
| /tag/:slug | 标签归档 | 否 |
| /tags | 标签云 | 否 |
| /archive | 文章归档 | 否 |
| /search | 搜索结果 | 否 |
| /links | 友情链接 | 否 |
| /about | 关于我 | 否 |
| /admin/dashboard | 仪表盘 | 是 |
| /admin/articles | 文章管理 | 是 |
| /admin/articles/new | 创建文章 | 是 |
| /admin/articles/:id/edit | 编辑文章 | 是 |
| /admin/categories | 分类管理 | 是 |
| /admin/tags | 标签管理 | 是 |
| /admin/comments | 评论管理 | 是 |
| /admin/friends | 友链管理 | 是 |
| /admin/music | 音乐管理 | 是 |
| /admin/statistics | 数据统计 | 是 |
| /admin/settings | 系统设置 | 是 |
| /admin/profile | 个人中心 | 是 |
| /admin/media | 媒体库 | 是 |
| /admin/trash | 回收站 | 是 |
| /admin/logs | 操作日志 | 是 |

## 自动化测试

生产环境 API 冒烟测试：

```bash
node tests/smoke-test.mjs
```

部署流水线（.github/workflows/deploy.yml）会在发布后自动执行；每小时定时健康检查见 .github/workflows/uptime.yml。

## 开发命令

```bash
# 后端
cd backend
npm install       # 安装依赖
npm start         # 启动服务
npm run dev       # 开发模式（自动重启）
npm run lint      # ESLint 检查

# 前端
cd frontend
npm install       # 安装依赖
npm run dev       # 启动开发服务器
npm run build     # 构建生产版本
npm run preview   # 预览生产版本
npm run lint      # ESLint 检查
npm run format    # Prettier 格式化
```

## 架构说明

### 认证流程
```
登录 → bcrypt 验证密码 → 生成 JWT token → 返回给前端
前端 → token 存入 localStorage + Pinia（持久化）
请求 → Axios 拦截器自动加 Authorization: Bearer <token>
后端 → authMiddleware 验证 token → 提取 user.id
过期 → 响应拦截器收到 401 → 清除 token → 跳转登录页
```

### 前后端通信
- 开发环境：Vite 代理 `/api` → `http://localhost:3000`
- 生产环境：CORS 跨域或同域部署
- 统一响应格式：`{ code, message, data }`

### 数据安全
- 所有 SQL 使用参数化查询（防 SQL 注入）
- 密码使用 bcrypt 加密存储
- Helmet 设置安全响应头
- API 接口限流保护
- 软删除支持，可恢复误删数据

## 版本说明

> 完整版本历史请查看 [history.md](./history.md)。

| 版本 | 日期 | 改动 |
|------|------|------|
| 1.0.0 | 2026-07-28 | 初始版本：任务管理 + 用户认证 |
| 1.3.0 | 2026-07-29 | 重构为个人博客系统 |
| 1.4.0 | 2026-07-30 | UI 重写：血月暗黑主题 + TipTap 编辑器 |
| 1.7.0 | 2026-07-30 | 安全加固：Helmet + CORS + 限流 |
| 1.10.0 | 2026-07-30 | SEO 优化 + 标签云 + 相关文章 + 回收站 + 操作日志 |
| 1.13.0 | 2026-07-31 | 首次开源发布 + 完整测试 |
| 1.14.0 | 2026-07-31 | 迁移到 Cloudflare Workers + Supabase PostgreSQL |
| 1.15.0 | 2026-08-05 | 代码精简：删除死代码 + 提取重复工具函数 |
| 1.16.0 | 2026-08-05 | 修复评论昵称显示为 admin 的问题 |
| 1.17.0 | 2026-08-05 | 评论体验优化 + 后台评论列表修复 + GitHub Actions CI |
| 1.18.0 | 2026-08-08 | 全面接管优化：性能、SEO、RSS/Sitemap、防垃圾、PWA、新功能、自动化测试与监控 |

## License

MIT License
