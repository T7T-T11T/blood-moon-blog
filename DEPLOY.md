# 寿冬与秋 - Cloudflare 部署指南

## 架构总览

```
┌─────────────────────────────────────────────────────────┐
│                    Cloudflare Pages                      │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Vue 3 前端 (静态文件)               │   │
│  │  ├── JavaScript/CSS/HTML                          │   │
│  │  ├── 图片资源                                      │   │
│  │  └── _redirects (SPA 路由回退)                    │   │
│  └──────────────────────────────────────────────────┘   │
│                          │                               │
│                          ▼                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │         Cloudflare Pages Functions (代理)         │   │
│  │  /api/*    → 代理到后端 API                       │   │
│  │  /uploads/* → 代理到后端静态文件                  │   │
│  └──────────────────────────────────────────────────┘   │
│                          │                               │
└──────────────────────────┼──────────────────────────────┘
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    Render.com (后端)                      │
│  ┌──────────────────────────────────────────────────┐   │
│  │         Express.js 后端                            │   │
│  │  ├── /api/auth     认证接口                       │   │
│  │  ├── /api/articles 文章管理                       │   │
│  │  ├── /api/categories 分类管理                     │   │
│  │  ├── /api/tags     标签管理                       │   │
│  │  ├── /api/comments 评论管理                       │   │
│  │  └── ...其他接口                                  │   │
│  └──────────────────────────────────────────────────┘   │
│                          │                               │
│                          ▼                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │         MySQL 数据库 (本地/云数据库)               │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## 第一步：注册 Cloudflare 账号

1. 访问 [https://dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up)
2. 填写邮箱和密码注册账号
3. 完成邮箱验证

## 第二步：安装 wrangler CLI

```bash
# 已安装（本项目已完成）
npm install -g wrangler

# 验证安装
wrangler --version
```

## 第三步：登录 Cloudflare

```bash
# 打开浏览器进行登录授权
wrangler login
```

执行后会：
1. 自动打开浏览器
2. 选择你的 Cloudflare 账号
3. 点击「Allow」授权
4. 终端显示登录成功

## 第四步：部署后端到 Render.com

### 4.1 注册 Render

1. 访问 [https://render.com](https://render.com)
2. 用 GitHub 账号注册（一键登录）

### 4.2 部署后端服务

**方式一：Render Dashboard 手动创建**

1. 登录 Render Dashboard
2. 点击「New +」→「Web Service」
3. 连接 GitHub 账号，选择 `blood-moon-blog` 仓库
4. 配置服务：
   - **Name**: `blood-moon-blog-api`
   - **Region**: `Singapore`（新加坡，国内延迟低）
   - **Branch**: `master`
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
5. 点击「Advanced」→ 配置环境变量：
   ```
   NODE_ENV=production
   DB_HOST=你的MySQL地址
   DB_PORT=3306
   DB_USER=你的MySQL用户名
   DB_PASSWORD=你的MySQL密码
   DB_NAME=task_manager
   JWT_SECRET=你的JWT密钥（至少32字符随机字符串）
   CORS_ORIGIN=*
   ```
6. 选择 Free 套餐
7. 点击「Create Web Service」

**方式二：使用 render.yaml 自动配置**

仓库根目录已有 `render.yaml` 配置文件，Render 会自动识别：
- 确保 `backend/render.yaml` 存在
- 在 Render 创建服务时勾选「Use render.yaml」

### 4.3 获取后端地址

部署成功后，Render 会分配一个 HTTPS 地址：
```
https://blood-moon-blog-api.onrender.com
```

**记录这个地址，后面要用到。**

## 第五步：设置 Cloudflare 环境变量

```bash
# 设置后端地址（替换为你实际的 Render 后端地址）
wrangler pages secret put BACKEND_URL
# 提示时输入：https://blood-moon-blog-api.onrender.com

# 设置项目名
wrangler pages secret put PROJECT_NAME
# 输入：blood-moon-blog
```

或者通过 Cloudflare Dashboard：
1. 访问 [Pages Dashboard](https://dash.cloudflare.com/?to=/:account/pages)
2. 点击「Create a project」→「Direct Upload」
3. 项目名填：`blood-moon-blog`
4. 创建后进入项目 → Settings → Environment variables
5. 添加：`BACKEND_URL` = 你的 Render 后端地址

## 第六步：部署前端到 Cloudflare Pages

### 方式一：命令行部署（推荐）

```bash
# 确保在项目根目录
cd task_manager_vue

# 部署前端（使用 wrangler.toml 配置）
wrangler pages deploy

# 或指定目录
wrangler pages deploy frontend/dist --project-name=blood-moon-blog
```

### 方式二：Git 集成自动部署

1. 访问 [Pages Dashboard](https://dash.cloudflare.com/?to=/:account/pages)
2. 点击「Create a project」→「Connect to Git」
3. 选择 GitHub 仓库 `blood-moon-blog`
4. 配置：
   - **Production branch**: `master`
   - **Build command**: `cd frontend && npm install && npm run build`
   - **Build output directory**: `frontend/dist`
5. 点击「Save and Deploy」

## 第七步：验证部署

### 7.1 获取 Cloudflare Pages 地址

部署成功后，Cloudflare 会分配一个地址：
```
https://blood-moon-blog.pages.dev
```

### 7.2 验证功能

```bash
# 健康检查（通过 Cloudflare 代理到后端）
curl https://blood-moon-blog.pages.dev/api/health

# 登录接口
curl -X POST https://blood-moon-blog.pages.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### 7.3 检查点

- [ ] 前端页面正常加载
- [ ] 登录功能正常
- [ ] 文章列表正常显示
- [ ] 分类/标签正常
- [ ] 评论功能正常
- [ ] 音乐播放正常
- [ ] 管理后台正常

## 第八步：绑定自定义域名（可选）

1. 在 Cloudflare Pages 项目 → Custom domains
2. 输入你的域名（如 `blog.yourdomain.com`）
3. 按提示配置 DNS 记录
4. 等待 DNS 生效（通常几分钟）

## 常见问题

### Q: 后端 Render 服务会休眠吗？

A: 是的，Render Free 套餐在空闲 15 分钟后会休眠。首次请求需要 30 秒冷启动。
   解决方案：
   - 升级到 $7/月的 Starter 套餐（不会休眠）
   - 用 UptimeRobot 等免费服务每 10 分钟访问一次健康检查接口

### Q: Cloudflare Pages Functions 有请求大小限制吗？

A: 是的，单个请求限制 100MB。对于博客系统足够（图片 5MB、音乐 50MB）。

### Q: 国内访问速度如何？

A: Cloudflare 在香港、日本、新加坡有节点，国内访问延迟约 50-150ms，比 Vercel 快。

### Q: 如何更新代码？

A: 推送到 GitHub 后：
- Git 集成模式：自动部署
- 手动模式：重新运行 `wrangler pages deploy`

### Q: Backend 忘记配置 BACKEND_URL？

A: 前端会显示「500 - BACKEND_URL 未配置」错误。
   解决：`wrangler pages secret put BACKEND_URL` 重新设置。

## 费用说明

| 服务 | 费用 | 免费额度 |
|------|------|---------|
| Cloudflare Pages | 免费 | 无限带宽 + 无限请求 |
| Cloudflare Functions | 免费 | 10万次请求/天 |
| Render 后端 | 免费 | 750小时/月（单实例） |
| MySQL 数据库 | 自费 | 本地或云数据库 |

## 下一步

完成本指南后，建议继续：
1. **Phase 2**: 将 Express 后端迁移到 Cloudflare Workers（Hono 框架）
2. **Phase 3**: 迁移数据库到 PlanetScale（Serverless MySQL）
3. 迁移完成后即可实现全栈 Cloudflare 部署，永不休眠

---

*文档版本：v1.0 | 更新时间：2026-07-31*
