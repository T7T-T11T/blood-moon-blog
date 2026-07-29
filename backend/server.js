/**
 * 后端服务器入口
 * 作用：创建 Express 应用，注册中间件和路由，启动 HTTP 服务
 *
 * 配置说明：
 * - 使用 dotenv 加载 .env 文件中的环境变量
 * - 数据库密码、JWT 密钥等敏感信息不硬编码在代码中
 *
 * 中间件：
 * - cors：允许跨域请求（Vite 开发代理已处理生产环境跨域）
 * - express.json：解析 JSON 请求体
 *
 * 路由：
 * 【公开接口】（无需登录）
 * - /api/auth       用户认证（注册/登录）
 * - /api/articles/public  博客文章浏览（含归档）
 * - /api/categories  分类列表
 * - /api/tags        标签列表
 * - /api/comments/:articleId  文章评论浏览
 * - /api/links       友情链接浏览
 * - /api/settings    网站设置读取
 *
 * 【管理接口】（需要登录）
 * - /api/articles    博客文章管理
 * - /api/categories  分类管理
 * - /api/tags        标签管理
 * - /api/comments    评论管理（审核/删除）
 * - /api/links       友链管理（增删改查）
 * - /api/settings    网站设置管理（批量更新）
 * - /api/tasks       任务管理
 * - /api/pomodoro    番茄钟记录
 * - /api/dashboard   仪表盘统计
 * - /api/upload      文件上传
 */

// 加载环境变量（必须在其他 require 之前）
require('dotenv').config()

const express = require('express')
const cors = require('cors')

// 路由模块
const authRoutes = require('./routes/auth')
const taskRoutes = require('./routes/tasks')
const articleRoutes = require('./routes/articles')
const categoryRoutes = require('./routes/categories')
const tagRoutes = require('./routes/tags')
const pomodoroRoutes = require('./routes/pomodoro')
const dashboardRoutes = require('./routes/dashboard')
const uploadRoutes = require('./routes/upload')
const commentRoutes = require('./routes/comments')
const linkRoutes = require('./routes/links')
const settingRoutes = require('./routes/settings')

const path = require('path')
const fs = require('fs')

const app = express()

// ========== 中间件 ==========
app.use(cors())                              // 跨域
app.use(express.json())                      // JSON 请求体解析
app.use(express.urlencoded({ extended: true }))  // URL 编码请求体解析

// ========== 静态资源服务 ==========
// 确保上传目录存在
const uploadDir = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}
// 将 uploads 目录作为静态资源服务，前端可通过 /uploads/xxx 访问
app.use('/uploads', express.static(uploadDir))

// ========== 路由注册 ==========
// 公开接口
app.use('/api/auth', authRoutes)           // 认证
app.use('/api/categories', categoryRoutes) // 分类（公开 + 管理）
app.use('/api/tags', tagRoutes)            // 标签（公开 + 管理）
app.use('/api/articles', articleRoutes)    // 博客（包含公开和管理接口）
app.use('/api/comments', commentRoutes)    // 评论（公开浏览 + 管理）
app.use('/api/links', linkRoutes)          // 友链（公开浏览 + 管理）
app.use('/api/settings', settingRoutes)    // 网站设置（公开读取 + 管理）

// 需要登录的接口
app.use('/api/tasks', taskRoutes)          // 任务
app.use('/api/pomodoro', pomodoroRoutes)   // 番茄钟
app.use('/api/dashboard', dashboardRoutes) // 仪表盘
app.use('/api/upload', uploadRoutes)       // 文件上传

/**
 * 健康检查接口
 * GET /api/health - 用于监控服务是否正常运行
 */
app.get('/api/health', (req, res) => {
  res.json({
    code: 200,
    message: '服务器运行正常',
    time: new Date().toISOString()
  })
})

/**
 * 全局错误处理中间件
 * 捕获所有未处理的错误，返回统一格式的错误响应
 */
app.use((err, req, res, next) => {
  console.error('服务器错误：', err)
  res.status(500).json({
    code: 500,
    message: '服务器错误'
  })
})

// ========== 启动服务 ==========
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log('========================================')
  console.log('  个人博客系统后端已启动')
  console.log(`  地址：http://localhost:${PORT}`)
  console.log(`  健康检查：http://localhost:${PORT}/api/health`)
  console.log('========================================')
})
