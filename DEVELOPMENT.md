# 个人效率中心 - 开发指南

## 一、项目概述

基于 Vue 3 + Node.js Express + MySQL 的个人效率管理工具，集成任务管理、博客、番茄钟、数据统计四大模块。

## 二、技术栈

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 前端框架 | Vue 3 | ^3.4.0 | 组合式 API |
| 构建工具 | Vite | ^5.0.0 | 开发服务器 + 打包 |
| UI 组件库 | Element Plus | ^2.5.0 | 注意：radio 用 value 不用 label |
| 状态管理 | Pinia | ^2.1.0 | 全局用户状态 |
| 路由 | Vue Router | ^4.2.0 | History 模式 |
| HTTP 请求 | Axios | ^1.6.0 | 带请求/响应拦截器 |
| 图表 | ECharts + vue-echarts | ^6.1.0 / ^8.0.1 | 数据可视化 |
| Markdown | marked | ^18.0.7 | 博客内容渲染 |
| 后端框架 | Express | ^4.18.2 | RESTful API |
| 数据库驱动 | mysql2 | ^3.6.0 | 连接池 + Promise |
| 密码加密 | bcryptjs | ^2.4.3 | 注册时加密 |
| 身份认证 | jsonwebtoken | ^9.0.2 | JWT token |
| 跨域处理 | cors | ^2.8.5 | 后端 CORS 中间件 |
| 数据库 | MySQL | 8.0+ | 4 张表 |

## 三、目录结构

```
task_manager_vue/
├── database/
│   └── upgrade.sql              # 建表脚本（users/tasks/articles/pomodoro_sessions）
├── backend/
│   ├── config/
│   │   └── db.js                # MySQL 连接池配置（改密码的地方）
│   ├── middleware/
│   │   └── auth.js              # JWT 认证中间件（生成 token + 验证 token）
│   ├── routes/
│   │   ├── auth.js              # 认证路由（注册/登录/获取用户信息）
│   │   ├── tasks.js             # 任务路由（增删改查 + 状态切换）
│   │   ├── articles.js          # 博客路由（增删改查 + 浏览量）
│   │   ├── pomodoro.js          # 番茄钟路由（记录增删查 + 统计）
│   │   └── dashboard.js         # 仪表盘路由（综合统计数据）
│   ├── package.json
│   └── server.js                # 后端入口（端口 3000）
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── request.js       # Axios 实例（拦截器 + 自动加 token）
│   │   │   ├── auth.js          # 认证 API
│   │   │   ├── tasks.js         # 任务 API
│   │   │   ├── articles.js      # 博客 API
│   │   │   ├── pomodoro.js      # 番茄钟 API
│   │   │   └── dashboard.js     # 仪表盘 API
│   │   ├── router/
│   │   │   └── index.js         # 路由配置（12 个路由 + 路由守卫）
│   │   ├── stores/
│   │   │   └── user.js          # 用户状态（token/username/isLoggedIn）
│   │   ├── views/
│   │   │   ├── Login.vue        # 登录页
│   │   │   ├── Register.vue     # 注册页
│   │   │   ├── Dashboard.vue    # 仪表盘（ECharts 图表）
│   │   │   ├── TaskList.vue     # 任务列表
│   │   │   ├── TaskForm.vue     # 任务新增/编辑（共用组件）
│   │   │   ├── BlogList.vue     # 博客列表
│   │   │   ├── BlogEdit.vue     # 博客新增/编辑（共用组件）
│   │   │   ├── BlogDetail.vue   # 博客详情（Markdown 渲染）
│   │   │   ├── Pomodoro.vue     # 番茄钟计时器
│   │   │   └── Statistics.vue   # 数据统计
│   │   ├── App.vue              # 根组件（侧边栏布局）
│   │   ├── main.js              # 入口（注册 Pinia/Router/ElementPlus）
│   │   └── style.css            # 全局样式
│   ├── vite.config.js           # Vite 配置（代理 /api → localhost:3000）
│   └── package.json
└── README.md
```

## 四、数据库

### 4.1 初始化

```sql
-- 创建数据库
CREATE DATABASE IF NOT EXISTS task_manager DEFAULT CHARSET utf8mb4;
USE task_manager;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id            INT AUTO_INCREMENT PRIMARY KEY COMMENT '用户ID',
    username      VARCHAR(50)  NOT NULL UNIQUE   COMMENT '用户名',
    password_hash VARCHAR(255) NOT NULL          COMMENT '密码哈希（bcrypt）',
    created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- 任务表
CREATE TABLE IF NOT EXISTS tasks (
    id          INT AUTO_INCREMENT PRIMARY KEY COMMENT '任务ID',
    title       VARCHAR(200) NOT NULL          COMMENT '任务标题',
    description TEXT                            COMMENT '任务描述',
    status      VARCHAR(20)  NOT NULL DEFAULT '待办' COMMENT '状态：待办/进行中/已完成',
    priority    VARCHAR(10)  NOT NULL DEFAULT '中'   COMMENT '优先级：高/中/低',
    due_date    DATE                            COMMENT '截止日期',
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    user_id     INT          NOT NULL          COMMENT '用户ID',
    CONSTRAINT fk_task_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='任务表';

-- 博客文章表
CREATE TABLE IF NOT EXISTS articles (
    id          INT AUTO_INCREMENT PRIMARY KEY COMMENT '文章ID',
    title       VARCHAR(200) NOT NULL          COMMENT '标题',
    content     LONGTEXT     NOT NULL          COMMENT '内容（Markdown）',
    summary     VARCHAR(500)                   COMMENT '摘要',
    tags        VARCHAR(200)                   COMMENT '标签',
    status      VARCHAR(20)  NOT NULL DEFAULT '已发布' COMMENT '状态：已发布/草稿',
    view_count  INT          NOT NULL DEFAULT 0 COMMENT '浏览量',
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    user_id     INT          NOT NULL          COMMENT '用户ID',
    CONSTRAINT fk_article_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='博客文章表';

-- 番茄钟记录表
CREATE TABLE IF NOT EXISTS pomodoro_sessions (
    id         INT AUTO_INCREMENT PRIMARY KEY COMMENT '记录ID',
    duration   INT          NOT NULL DEFAULT 25 COMMENT '专注时长（分钟）',
    task_name  VARCHAR(200)                    COMMENT '任务名称',
    started_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP COMMENT '开始时间',
    completed  TINYINT(1)   NOT NULL DEFAULT 1 COMMENT '是否完成：1完成 0中断',
    user_id    INT          NOT NULL          COMMENT '用户ID',
    CONSTRAINT fk_pomodoro_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='番茄钟记录表';

-- 初始用户（密码: admin123）
INSERT INTO users (username, password_hash) VALUES
('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MrqK3a8MjLr9mF0wY5uQ4jUwQ3Z5uOm');
```

### 4.2 数据库连接配置

文件位置：`backend/config/db.js`

```javascript
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '你的MySQL密码',  // ← 改这里
    database: 'task_manager',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};
```

## 五、后端 API 接口文档

### 5.1 统一响应格式

```json
{ "code": 200, "message": "操作成功", "data": {} }
```

| code | 含义 |
|------|------|
| 200 | 成功 |
| 400 | 参数错误 |
| 401 | 未登录 / token 过期 |
| 404 | 资源不存在 |
| 500 | 服务器错误 |

### 5.2 认证接口（无需 token）

| 方法 | 路径 | 说明 | 请求体 |
|------|------|------|--------|
| POST | /api/auth/register | 注册 | { username, password, confirm } |
| POST | /api/auth/login | 登录 | { username, password } |
| GET | /api/auth/profile | 获取用户信息 | 需 token |

### 5.3 任务接口（需 token）

| 方法 | 路径 | 说明 | 请求体/参数 |
|------|------|------|-------------|
| GET | /api/tasks | 获取任务列表 | query: { status } 可选 |
| POST | /api/tasks | 新增任务 | { title, description, status, priority, due_date } |
| PUT | /api/tasks/:id | 编辑任务 | { title, description, status, priority, due_date } |
| DELETE | /api/tasks/:id | 删除任务 | - |
| PATCH | /api/tasks/:id/status | 快捷改状态 | { status } |

### 5.4 博客接口（需 token）

| 方法 | 路径 | 说明 | 请求体/参数 |
|------|------|------|-------------|
| GET | /api/articles | 获取文章列表 | query: { status } 可选 |
| GET | /api/articles/:id | 获取文章详情 | - |
| POST | /api/articles | 新增文章 | { title, content, summary, tags, status } |
| PUT | /api/articles/:id | 编辑文章 | { title, content, summary, tags, status } |
| DELETE | /api/articles/:id | 删除文章 | - |
| PATCH | /api/articles/:id/view | 增加浏览量 | - |

### 5.5 番茄钟接口（需 token）

| 方法 | 路径 | 说明 | 请求体/参数 |
|------|------|------|-------------|
| GET | /api/pomodoro | 获取记录列表 | query: { limit } 可选 |
| POST | /api/pomodoro | 新增记录 | { duration, task_name, completed } |
| DELETE | /api/pomodoro/:id | 删除记录 | - |
| GET | /api/pomodoro/stats | 获取7天统计 | - |

### 5.6 仪表盘接口（需 token）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/dashboard/stats | 获取综合统计数据 |

返回数据结构：
```json
{
  "taskStats": { "total": 10, "completed": 3, "in_progress": 2, "todo": 5 },
  "articleStats": { "total": 5, "published": 4, "draft": 1, "total_views": 128 },
  "todayFocus": { "total_duration": 75, "session_count": 3 },
  "taskTrend": [{ "date": "2026-07-22", "completed_count": 2 }],
  "focusTrend": [{ "date": "2026-07-22", "total_duration": 50 }],
  "upcomingTasks": [{ "id": 1, "title": "...", "due_date": "...", "status": "...", "priority": "..." }],
  "latestArticles": [{ "id": 1, "title": "...", "summary": "...", "created_at": "..." }]
}
```

### 5.7 健康检查

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/health | 检查后端是否运行 |

## 六、前端路由

| 路径 | 页面 | 需登录 |
|------|------|--------|
| /login | 登录 | 否 |
| /register | 注册 | 否 |
| / | 仪表盘 | 是 |
| /tasks | 任务列表 | 是 |
| /task/add | 新增任务 | 是 |
| /task/edit/:id | 编辑任务 | 是 |
| /blog | 博客列表 | 是 |
| /blog/add | 写文章 | 是 |
| /blog/edit/:id | 编辑文章 | 是 |
| /blog/:id | 文章详情 | 是 |
| /pomodoro | 番茄钟 | 是 |
| /statistics | 数据统计 | 是 |

## 七、启动流程

### 7.1 数据库

```bash
# 登录 MySQL
mysql -u root -p

# 执行建表脚本
source C:\Users\你的用户名\Desktop\task_manager_vue\database\upgrade.sql
```

### 7.2 后端

```bash
cd C:\Users\ctt37\Desktop\task_manager_vue\backend

# 首次：安装依赖
npm install

# 修改数据库密码：打开 config/db.js，把 password 改成你的

# 启动
npm start          # 或 node server.js
# 开发模式（文件变动自动重启）
npm run dev        # 或 node --watch server.js
```

启动成功输出：
```
========================================
  个人效率中心后端已启动
  地址：http://localhost:3000
  健康检查：http://localhost:3000/api/health
========================================
```

### 7.3 前端

```bash
cd C:\Users\ctt37\Desktop\task_manager_vue\frontend

# 首次：安装依赖
npm install

# 启动开发服务器
npm run dev
```

启动后浏览器自动打开 `http://localhost:5173`。

### 7.4 Vite 代理说明

前端请求 `/api/xxx` 会被 Vite 代理转发到 `http://localhost:3000/api/xxx`，解决跨域问题。

配置文件：`frontend/vite.config.js`
```javascript
proxy: {
    '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
    }
}
```

## 八、认证流程

```
注册 → 后端 bcrypt 加密密码 → 存入 users 表
登录 → 后端验证密码 → 生成 JWT token → 返回给前端
前端 → token 存入 localStorage + Pinia
请求 → Axios 拦截器自动加 Authorization: Bearer <token>
后端 → authMiddleware 验证 token → 提取 user.id 挂到 req.user
过期 → 响应拦截器收到 401 → 清除 token → 跳转登录页
```

关键配置：
- JWT 密钥：`backend/middleware/auth.js` 中的 `JWT_SECRET`
- Token 有效期：7 天
- 前端存储：`localStorage.getItem('token')`

## 九、开发规范

### 9.1 后端新增路由步骤

1. 在 `backend/routes/` 下新建文件，如 `notes.js`
2. 引入 express、pool、authMiddleware
3. 编写路由处理函数
4. 在 `server.js` 中注册路由
5. 在 `frontend/src/api/` 下新建对应的 API 封装文件

示例模板：
```javascript
const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

router.use(authMiddleware);  // 所有接口都需登录

router.get('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const [rows] = await pool.execute(
            'SELECT * FROM 表名 WHERE user_id = ?',
            [userId]
        );
        res.json({ code: 200, data: rows });
    } catch (err) {
        console.error('查询失败：', err);
        res.status(500).json({ code: 500, message: '服务器错误' });
    }
});

module.exports = router;
```

### 9.2 前端新增页面步骤

1. 在 `frontend/src/views/` 下新建 `.vue` 文件
2. 在 `frontend/src/router/index.js` 中添加路由配置
3. 如需 API，在 `frontend/src/api/` 下新建封装文件
4. 如需导航入口，在 `App.vue` 的 `el-menu` 中添加菜单项

### 9.3 注意事项

**mysql2 LIMIT 参数必须传字符串：**
```javascript
// 正确
pool.execute('SELECT * FROM t LIMIT ?', [userId, String(limit)])

// 错误（会报 ER_WRONG_ARGUMENTS）
pool.execute('SELECT * FROM t LIMIT ?', [userId, limit])
```

**Element Plus radio 用 value 不用 label：**
```html
<!-- 正确 -->
<el-radio value="已发布">立即发布</el-radio>
<el-radio-button value="全部" />

<!-- 错误（会有废弃警告） -->
<el-radio label="已发布">立即发布</el-radio>
```

**所有 SQL 查询必须带 user_id 过滤：**
```sql
-- 正确：用户只能操作自己的数据
SELECT * FROM tasks WHERE id = ? AND user_id = ?

-- 错误：越权风险
SELECT * FROM tasks WHERE id = ?
```

**端口冲突 EADDRINUSE：**
```bash
# 查看占用进程
netstat -ano | findstr :3000

# 杀掉进程（替换 PID）
Stop-Process -Id <PID> -Force
```

## 十、版本说明

| 版本 | 日期 | 改动 |
|------|------|------|
| 1.0.0 | 2026-07-28 | 初始版本：任务管理 + 用户认证 |
| 1.1.0 | 2026-07-28 | 新增：仪表盘 + 博客 + 番茄钟 + 数据统计 |
