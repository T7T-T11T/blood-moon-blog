# 寿冬与秋 - Cloudflare 部署指南

## 架构总览

```
┌─────────────────────────────────────────────┐
│            Cloudflare Pages                  │
│   Vue 3 前端（静态文件 + SPA 路由回退）       │
└──────────────────┬──────────────────────────┘
                   │ HTTPS（CORS 跨域直连）
                   ▼
┌─────────────────────────────────────────────┐
│         Cloudflare Workers（生产后端）        │
│   Hono + Supabase JS SDK                    │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│         Supabase（PostgreSQL 数据库）         │
└─────────────────────────────────────────────┘
```

> 本地开发：前端（Vite dev server）→ Vite proxy `/api` → `backend/`（Express + pg，端口 3000）→ Supabase。

---

## 方式一：GitHub Actions 自动部署（推荐）

推送到 `master` 分支时自动构建前端并部署到 Cloudflare Pages。

### 1. 配置 GitHub Secret

在仓库 **Settings → Secrets and variables → Actions** 中添加：

| Secret 名称 | 值 | 说明 |
|-------------|-----|------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Token | 需 Pages:Edit 权限 |

创建 Token：[dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens) → Create Token → Edit Cloudflare Workers → 添加 Pages:Edit 权限。

### 2. 推送代码

```bash
git push origin master
```

CI 会自动执行：检出代码 → 安装依赖 → 构建前端 → 部署到 Pages。

### 3. 验证

部署成功后访问 `https://<项目名>.pages.dev`。

---

## 方式二：手动部署

### 前提

```bash
# 安装 wrangler CLI
npm install -g wrangler

# 登录 Cloudflare（浏览器授权）
wrangler login
```

### 部署后端（Workers）

```bash
cd workers-backend

# 设置 Secrets（首次部署时）
wrangler secret put SUPABASE_URL        # Supabase 项目 URL
wrangler secret put SUPABASE_ANON_KEY   # Supabase Anon Key
wrangler secret put JWT_SECRET          # JWT 签名密钥

# 部署
npm run deploy
```

部署成功后获得 Workers 地址：`https://blood-moon-blog-api.2198789717.workers.dev`

### 部署前端（Pages）

```bash
# 构建前端
cd frontend
npm install
npm run build

# 部署到 Pages
wrangler pages deploy frontend/dist --project-name=blood-moon-blog
```

### 配置前端生产环境

确保 `frontend/.env.production` 中的 API 地址指向 Workers：

```
VITE_API_BASE_URL=https://blood-moon-blog-api.2198789717.workers.dev
```

---

## Workers 环境变量

| 变量名 | 说明 | 设置方式 |
|--------|------|----------|
| `SUPABASE_URL` | Supabase 项目 URL | `wrangler secret put` |
| `SUPABASE_ANON_KEY` | Supabase 匿名 Key | `wrangler secret put` |
| `JWT_SECRET` | JWT 签名密钥（至少 32 字符） | `wrangler secret put` |
| `CORS_ORIGIN` | 允许的前端域名 | `wrangler.toml [vars]` |
| `RATE_LIMIT_KV` | KV 命名空间（评论/友链跨节点限流） | `wrangler kv namespace create` 后写入 `wrangler.toml` |

---

## 验证部署

```bash
# 健康检查
curl https://blood-moon-blog-api.2198789717.workers.dev/api/health

# 登录测试
curl -X POST https://blood-moon-blog-api.2198789717.workers.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

检查项：
- [ ] 自动化冒烟测试通过（部署流水线自动执行；也可手动运行 `node tests/smoke-test.mjs`）
- [ ] 每小时健康检查工作流（.github/workflows/uptime.yml）已注册
- [ ] 前端页面正常加载
- [ ] 登录功能正常
- [ ] 文章列表正常显示
- [ ] 评论功能正常
- [ ] 管理后台正常

---

## 绑定自定义域名（可选）

1. Cloudflare Pages → 项目 → Custom domains
2. 输入域名，按提示配置 DNS
3. 更新 `wrangler.toml` 中 `CORS_ORIGIN` 为新域名

---

## 常见问题

**Q: CI 部署失败？**
检查 GitHub Secret `CLOUDFLARE_API_TOKEN` 是否正确配置，Token 是否有 Pages:Edit 权限。

**Q: 前端请求报 CORS 错误？**
确认 `wrangler.toml` 中 `CORS_ORIGIN` 与前端实际域名一致。

**Q: 如何更新代码？**
推送到 `master` 分支自动触发 CI；或手动 `wrangler pages deploy` / `wrangler deploy`。

---

*文档版本：v2.0 | 更新时间：2026-08-05*
