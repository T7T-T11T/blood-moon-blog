# 血月博客 - Cloudflare Workers 后端

基于 Cloudflare Workers + Hono + Supabase PostgreSQL 的博客后端 API。

## 技术栈

- **运行时**: Cloudflare Workers
- **框架**: Hono (Express 兼容)
- **数据库**: Supabase PostgreSQL
- **认证**: JWT (bcryptjs + jsonwebtoken)
- **部署**: Wrangler CLI

## 快速开始

### 1. 安装依赖

```bash
cd workers-backend
npm install
```

### 2. 配置环境变量

```bash
# 设置 Supabase URL
wrangler secret put SUPABASE_URL
# 输入: postgresql://postgres.heeyjtujnylqktuqkkxg:wHKL3711%40CTT@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres

# 设置 Supabase Anon Key
wrangler secret put SUPABASE_ANON_KEY
# 在 Supabase Dashboard → Settings → API 中获取

# 设置 JWT Secret
wrangler secret put JWT_SECRET
# 输入: blood-moon-blog-jwt-secret-key-2026-x9k2m7p4
```

### 3. 本地开发

```bash
npm run dev
# 服务会启动在 http://localhost:8787
```

### 4. 部署上线

```bash
npm run deploy
# 会部署到 Cloudflare Workers，获得生产环境 URL
```

## API 接口

### 认证相关
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/profile` - 获取当前用户信息 (需认证)
- `PUT /api/auth/profile` - 更新用户资料 (需认证)
- `PUT /api/auth/password` - 修改密码 (需认证)

### 文章相关
- `GET /api/articles` - 获取文章列表
- `GET /api/articles/:id` - 获取文章详情
- `POST /api/articles` - 创建文章 (需管理员)
- `PUT /api/articles/:id` - 更新文章 (需管理员)
- `DELETE /api/articles/:id` - 删除文章 (需管理员)
- `POST /api/articles/:id/like` - 点赞
- `POST /api/articles/:id/favorite` - 收藏 (需认证)
- `DELETE /api/articles/:id/favorite` - 取消收藏 (需认证)

### 其他接口
- `GET /api/categories` - 获取分类列表
- `GET /api/tags` - 获取标签列表
- `GET /api/comments` - 获取评论列表
- `POST /api/comments` - 创建评论
- `GET /api/friends` - 获取友情链接
- `GET /api/settings` - 获取系统设置
- `GET /api/dashboard/stats` - 仪表盘统计 (需管理员)
- `GET /api/visits/stats` - 访问统计 (需管理员)
- `GET /api/music` - 获取音乐列表
- `GET /api/favorites` - 我的收藏 (需认证)
- `GET /api/logs` - 操作日志 (需管理员)

## 环境变量

| 变量名 | 说明 | 必填 |
|--------|------|------|
| `SUPABASE_URL` | Supabase 项目 URL | 是 |
| `SUPABASE_ANON_KEY` | Supabase 匿名 Key | 是 |
| `JWT_SECRET` | JWT 签名密钥 | 是 |
| `CORS_ORIGIN` | 允许的跨域源 | 否 (默认 *) |
| `ENVIRONMENT` | 环境标识 | 否 |

## 目录结构

```
workers-backend/
├── src/
│   ├── index.js          # 主入口
│   ├── db.js             # 数据库连接层
│   ├── auth.js           # 认证工具
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
├── package.json
├── wrangler.toml
└── tsconfig.json
```

## 默认账号

- 用户名: `admin`
- 密码: `admin123`

⚠️ 登录后请尽快修改密码！

## 注意事项

1. **Supabase 连接**: 本项目使用 Supabase JavaScript SDK，通过 REST API 操作数据库
2. **Workers 限制**: Cloudflare Workers 不支持原生 TCP 连接，因此使用 Supabase SDK
3. **免费额度**: Workers 免费版提供 10 万次请求/天，足够个人博客使用
4. **冷启动**: Workers 没有冷启动问题，首次访问也很快 (10ms 以内)
