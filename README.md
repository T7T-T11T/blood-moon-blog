# 个人效率中心

基于 Vue 3 + Node.js Express + MySQL 的个人效率管理工具，集成任务管理、博客、番茄钟、数据统计四大模块。

## 技术栈

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 前端框架 | Vue 3 | ^3.4.0 | 组合式 API + `<script setup>` |
| 构建工具 | Vite | ^5.0.0 | 开发服务器 + 打包 |
| UI 组件库 | Element Plus | ^2.5.0 | 基于 Vue 3 的组件库 |
| 状态管理 | Pinia | ^2.1.0 | 全局用户状态管理 |
| 路由 | Vue Router | ^4.2.0 | History 模式 + 路由守卫 |
| HTTP 请求 | Axios | ^1.6.0 | 请求/响应拦截器 |
| 图表 | ECharts | ^6.1.0 | 数据可视化 |
| Markdown 编辑器 | md-editor-v3 | ^4.x | Vue 3 Markdown 富文本编辑器 |
| Markdown 渲染 | marked | ^18.0.7 | 博客内容渲染（支持内联 HTML） |
| 文件上传 | multer | ^1.4.x | 后端 multipart/form-data 处理 |
| 后端框架 | Express | ^4.18.2 | RESTful API |
| 数据库驱动 | mysql2 | ^3.6.0 | 连接池 + Promise |
| 密码加密 | bcryptjs | ^2.4.3 | 注册密码加密 |
| 身份认证 | jsonwebtoken | ^9.0.2 | JWT Token |
| 环境变量 | dotenv | ^16.0.0 | 配置管理 |
| 代码规范 | ESLint + Prettier | - | 代码质量保障 |
| 数据库 | MySQL | 8.0+ | 4 张核心表 |

## 功能特性

### 📝 任务管理
- 任务增删改查
- 状态筛选（待办/进行中/已完成）
- 快捷状态切换
- 优先级标识（高/中/低）
- 截止日期逾期提醒

### 📖 博客系统
- Markdown 富文本编辑（md-editor-v3，支持实时预览）
- 四类媒体上传：图片、音频、视频、文件附件
- 媒体文件自动分类存储，Markdown 自动插入对应语法
- 文章分类（已发布/草稿）
- 浏览量统计
- 标签和摘要支持
- 智能摘要自动截取

### 🍅 番茄钟
- 自定义专注时长（1-120分钟）
- 开始/暂停/继续控制
- 专注历史记录
- 中断/完成状态标记

### 📊 数据统计
- 任务状态分布饼图
- 文章状态分布饼图
- 近7天任务完成趋势折线图
- 近7天专注时长趋势柱状图
- 关键指标卡片（完成率、总专注时长等）
- 文章浏览量排行 TOP5

### 🔐 用户认证
- JWT Token 认证
- bcrypt 密码加密
- 路由守卫（未登录自动跳转）
- Token 自动续期和过期处理

## 项目结构

```
task_manager_vue/
├── database/
│   └── init.sql                 # 建表脚本（全量初始化）
├── backend/
│   ├── config/
│   │   └── db.js                # MySQL 连接池配置
│   ├── middleware/
│   │   └── auth.js              # JWT 认证中间件
│   ├── routes/
│   │   ├── auth.js              # 认证路由
│   │   ├── tasks.js             # 任务路由
│   │   ├── articles.js          # 博客路由
│   │   ├── pomodoro.js          # 番茄钟路由
│   │   ├── dashboard.js         # 仪表盘路由
│   │   └── upload.js            # 文件上传路由（图片/音频/视频/文件）
│   ├── uploads/                 # 上传文件存储目录
│   │   ├── images/              # 图片
│   │   ├── audios/              # 音频
│   │   ├── videos/             # 视频
│   │   └── files/               # 普通文件
│   ├── .env                     # 环境变量（需自行创建）
│   ├── .env.example             # 环境变量示例
│   ├── package.json
│   └── server.js                # 后端入口（端口 3000）
├── frontend/
│   ├── src/
│   │   ├── api/                 # API 封装（7个模块，含 upload）
│   │   ├── components/          # 公共组件（RichEditor 富文本编辑器）
│   │   ├── router/              # 路由配置（12个路由）
│   │   ├── stores/              # Pinia 状态管理
│   │   ├── views/               # 10 个页面组件
│   │   ├── App.vue              # 根组件（侧边栏布局）
│   │   ├── main.js              # 应用入口
│   │   └── style.css            # 全局样式
│   ├── .eslintrc.cjs            # ESLint 配置
│   ├── vite.config.js           # Vite 配置
│   └── package.json
├── .gitignore
├── .prettierrc                  # Prettier 配置
└── README.md
```

## 快速开始

### 1. 环境要求

- Node.js >= 18
- MySQL >= 8.0
- npm 或 yarn

### 2. 数据库初始化

```bash
# 登录 MySQL
mysql -u root -p

# 创建数据库
CREATE DATABASE IF NOT EXISTS task_manager DEFAULT CHARSET utf8mb4;
USE task_manager;

# 执行建表脚本
source /path/to/database/init.sql
```

或手动执行 SQL：

```sql
-- 建表脚本内容请参考 database/init.sql
```

### 3. 配置环境变量

```bash
# 复制示例文件
cp backend/.env.example backend/.env

# 编辑 backend/.env，修改数据库密码和 JWT 密钥
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
  个人效率中心后端已启动
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
- 密码：`admin123`

## API 接口

详细的 API 接口请参考 `backend/server.js` 中注册的路由模块及各 `backend/routes/*.js` 文件头注释。

### 认证接口
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/register | 用户注册 |
| POST | /api/auth/login | 用户登录 |
| GET | /api/auth/profile | 获取用户信息（需 token）|

### 业务接口（均需 token）
| 模块 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 任务 | GET | /api/tasks | 获取任务列表 |
| 任务 | POST | /api/tasks | 新增任务 |
| 任务 | PUT | /api/tasks/:id | 编辑任务 |
| 任务 | DELETE | /api/tasks/:id | 删除任务 |
| 任务 | PATCH | /api/tasks/:id/status | 快捷改状态 |
| 博客 | GET | /api/articles | 获取文章列表 |
| 博客 | POST | /api/articles | 新增文章 |
| 博客 | GET | /api/articles/:id | 文章详情 |
| 番茄钟 | GET | /api/pomodoro | 获取记录列表 |
| 番茄钟 | POST | /api/pomodoro | 新增记录 |
| 仪表盘 | GET | /api/dashboard/stats | 综合统计数据 |
| 上传 | POST | /api/upload/image | 上传图片 |
| 上传 | POST | /api/upload/audio | 上传音频 |
| 上传 | POST | /api/upload/video | 上传视频 |
| 上传 | POST | /api/upload/file | 上传普通文件 |
| 上传 | DELETE | /api/upload | 删除已上传文件 |

## 前端路由

| 路径 | 页面 | 需登录 |
|------|------|--------|
| /login | 登录 | 否 |
| /register | 注册 | 否 |
| / | 仪表盘 | 是 |
| /tasks | 任务列表 | 是 |
| /task/add | 新增任务 | 是 |
| /blog | 博客列表 | 是 |
| /pomodoro | 番茄钟 | 是 |
| /statistics | 数据统计 | 是 |

## 架构说明

### 认证流程
```
注册 → bcrypt 加密密码 → 存入 users 表
登录 → 验证密码 → 生成 JWT token → 返回给前端
前端 → token 存入 localStorage + Pinia
请求 → Axios 拦截器自动加 Authorization: Bearer <token>
后端 → authMiddleware 验证 token → 提取 user.id
过期 → 响应拦截器收到 401 → 清除 token → 跳转登录页
```

### 前后端通信
- 开发环境：Vite 代理 `/api` → `http://localhost:3000`
- 生产环境：CORS 跨域或同域部署
- 统一响应格式：`{ code, message, data }`

### 数据安全
- 所有 SQL 查询带 `user_id` 过滤（防越权）
- 参数化查询（防 SQL 注入）
- 密码使用 bcrypt 加密存储

## 代码规范

### 后端新增路由
1. 在 `backend/routes/` 下新建文件
2. 引入 express、pool、authMiddleware
3. 编写路由处理函数
4. 在 `server.js` 中注册路由

### 前端新增页面
1. 在 `frontend/src/views/` 下新建 `.vue` 文件
2. 在 `frontend/src/router/index.js` 中添加路由
3. 如需 API，在 `frontend/src/api/` 下新建封装
4. 在 `App.vue` 导航栏添加菜单

## 开发命令

```bash
# 后端
cd backend
npm install       # 安装依赖
npm start         # 启动服务
npm run dev       # 开发模式（自动重启）

# 前端
cd frontend
npm install       # 安装依赖
npm run dev       # 启动开发服务器
npm run build     # 构建生产版本
npm run preview   # 预览生产版本

# 代码检查
cd frontend
npx eslint src/   # ESLint 检查
npx prettier --write src/  # Prettier 格式化
```

## 版本说明

| 版本 | 日期 | 改动 |
|------|------|------|
| 1.0.0 | 2026-07-28 | 初始版本：任务管理 + 用户认证 |
| 1.1.0 | 2026-07-28 | 新增：仪表盘 + 博客 + 番茄钟 + 数据统计 |
| 2.0.0 | 2026-07-28 | 代码优化：环境变量、代码规范、内存泄漏修复 |
| 2.1.0 | 2026-07-28 | 博客增强：富文本编辑器 + 四类媒体上传（图片/音频/视频/文件） |

## 简历亮点

> **个人效率中心（Vue 3 + Express + MySQL）**
> - 独立完成全栈开发，基于 Vue 3 Composition API + Element Plus 构建任务管理、博客、番茄钟、数据统计四大模块
> - 使用 Node.js Express + mysql2 搭建后端 RESTful API，通过 JWT + bcrypt 实现用户认证与权限控制
> - 采用 Pinia 管理全局状态，Axios 拦截器统一处理 token 注入和 401 异常
> - 使用 ECharts 实现数据可视化，包含柱状图、折线图、饼图等多种图表类型
> - 实现 ECharts 实例的正确生命周期管理（dispose + resize 监听），避免内存泄漏
> - 博客系统集成 md-editor-v3 富文本编辑器，支持图片/音频/视频/文件四类媒体上传
> - 使用 multer 处理 multipart/form-data 文件上传，按类型自动分类存储并生成安全访问 URL
> - 配置 dotenv 环境变量，敏感信息（数据库密码、JWT密钥）不硬编码在代码中
> - 引入 ESLint + Prettier 代码规范工具，保障团队协作代码质量
