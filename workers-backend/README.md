# 血月博客 - Cloudflare Workers 后端

基于 Cloudflare Workers + Hono + Supabase PostgreSQL 的博客后端 API。

## 快速开始

### 1. 安装依赖

```bash
cd workers-backend
npm install
```

### 2. 配置 Secrets

```bash
# 设置 Supabase 连接信息（在 Supabase Dashboard → Settings → API 获取）
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_ANON_KEY

# 设置 JWT 密钥（自定义，至少 32 字符）
wrangler secret put JWT_SECRET
```

### 3. 本地开发

```bash
npm run dev
# 服务启动在 http://localhost:8787
```

### 4. 部署

```bash
npm run deploy
```

## 环境变量

| 变量名 | 说明 | 必填 | 设置方式 |
|--------|------|------|----------|
| `SUPABASE_URL` | Supabase 项目 URL | 是 | `wrangler secret put` |
| `SUPABASE_ANON_KEY` | Supabase 匿名 Key | 是 | `wrangler secret put` |
| `JWT_SECRET` | JWT 签名密钥 | 是 | `wrangler secret put` |
| `CORS_ORIGIN` | 允许的前端域名 | 否 | `wrangler.toml [vars]` |
| `ENVIRONMENT` | 环境标识 | 否 | `wrangler.toml [vars]` |

## API 接口

详细的接口列表请参考 [README.md](../README.md) 中的 API 接口章节，或直接查看 `src/routes/` 下各路由模块源码。

## 目录结构

```
workers-backend/
├── src/
│   ├── index.js          # 主入口
│   ├── db.js             # 数据库连接层（Supabase SDK 封装）
│   ├── auth.js           # 认证工具（Web Crypto API）
│   └── routes/           # 路由模块
│       ├── auth.js       # 认证路由
│       ├── articles.js   # 文章路由
│       ├── categories.js # 分类路由
│       ├── tags.js       # 标签路由
│       ├── comments.js   # 评论路由
│       ├── friends.js    # 友情链接路由
│       ├── settings.js   # 系统设置路由
│       ├── dashboard.js  # 仪表盘路由
│       ├── visits.js     # 访问统计路由
│       ├── music.js      # 音乐路由
│       ├── favorites.js  # 收藏路由
│       └── logs.js       # 操作日志路由
├── wrangler.toml         # Cloudflare Workers 部署配置
└── package.json
```

## 注意事项

1. **Supabase 连接**：使用 Supabase JavaScript SDK，通过 REST API 操作数据库（Workers 不支持原生 TCP）
2. **免费额度**：Workers 免费版 10 万次请求/天，足够个人博客使用
3. **冷启动**：Workers 无冷启动问题，首次访问 10ms 以内
