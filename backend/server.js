/**
 * 后端服务器入口
 * 作用：创建 Express 应用，注册中间件和路由，启动 HTTP 服务
 *
 * 配置说明：
 * - 使用 dotenv 加载 .env 文件中的环境变量
 * - 数据库密码、JWT 密钥等敏感信息不硬编码在代码中
 *
 * 中间件：
 * - helmet：设置安全响应头（X-Frame-Options/CSP/HSTS 等）
 * - cors：跨域请求控制（支持白名单配置）
 * - express.json：解析 JSON 请求体（限制 100KB 防 body 炸弹）
 * - express-rate-limit：API 限流（登录/评论/上传分别限速）
 *
 * 路由：
 * 【公开接口】（无需登录）
 * - /api/auth       用户认证（登录）
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
 * - /api/dashboard   仪表盘统计
 * - /api/upload      文件上传
 */

// 加载环境变量（必须在其他 require 之前）
require('dotenv').config()

const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')

// 路由模块
const authRoutes = require('./routes/auth')
const articleRoutes = require('./routes/articles')
const categoryRoutes = require('./routes/categories')
const tagRoutes = require('./routes/tags')
const dashboardRoutes = require('./routes/dashboard')
const uploadRoutes = require('./routes/upload')
const commentRoutes = require('./routes/comments')
const linkRoutes = require('./routes/links')
const settingRoutes = require('./routes/settings')
const musicRoutes = require('./routes/music')
const rssRoutes = require('./routes/rss')
const sitemapRoutes = require('./routes/sitemap')
const likeRoutes = require('./routes/likes')
const favoriteRoutes = require('./routes/favorites')
const visitRoutes = require('./routes/visits')
const trashRoutes = require('./routes/trash')
const logsRoutes = require('./routes/logs')
const exportRoutes = require('./routes/export')

const path = require('path')
const fs = require('fs')
const pool = require('./config/db')

const app = express()

// ========== 安全中间件 ==========

/**
 * helmet：设置安全响应头
 * 包括 X-Content-Type-Options、X-Frame-Options、HSTS、CSP 等
 * 生产环境必须开启，防止点击劫持、MIME 嗅探等攻击
 *
 * CSP 策略说明：
 * - defaultSrc：默认只允许同源
 * - connectSrc：允许同源及 HTTP/HTTPS（支持前后端分离部署）
 * - imgSrc：允许同源图片及 data/blob URI（头像、封面等）
 * - mediaSrc：允许同源及远程媒体资源（音频/视频 CDN）
 * - scriptSrc/styleSrc：允许 unsafe-inline（兼容 Element Plus/Vue）
 */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", 'http:', 'https:'],
      imgSrc: ["'self'", 'data:', 'blob:', 'http:', 'https:'],
      mediaSrc: ["'self'", 'data:', 'blob:', 'http:', 'https:'],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'http:', 'https:'],
      fontSrc: ["'self'", 'data:'],
      frameSrc: ["'self'"]
    }
  },
  frameguard: { action: 'sameorigin' }
}))

/**
 * CORS 跨域配置
 * 开发环境：允许 localhost:5173（Vite 默认端口）
 * 生产环境：通过 CORS_ORIGIN 环境变量配置白名单域名，逗号分隔
 */
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
  : ['http://localhost:5173', 'http://localhost:4173']

app.use(cors({
  origin: corsOrigins,
  credentials: true
}))

// ========== 请求体解析（限制大小防止 body 炸弹） ==========
app.use(express.json({ limit: '10mb' }))                          // JSON 请求体（文章内容可能较大，限 10MB）
app.use(express.urlencoded({ extended: true, limit: '10mb' }))    // URL 编码请求体

// ========== 限流中间件 ==========

/**
 * 登录接口限流：5 次/15 分钟/IP
 * 防止暴力破解管理员密码
 */
// eslint-disable-next-line no-unused-vars
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { code: 429, message: '登录尝试过于频繁，请15分钟后再试' },
  standardHeaders: true,
  legacyHeaders: false
})

/**
 * 评论读取接口限流：30 次/分钟/IP
 * 用于后台仪表盘自动轮询评论统计、管理端翻页浏览
 * 宽松限流，防止频繁刷新触发误报
 * 评论提交（POST）的严格限流在 comments.js 内部挂载
 */
const commentReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { code: 429, message: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false
})

/**
 * 上传接口限流：10 次/分钟/IP
 * 防止恶意大量上传消耗磁盘
 */
// eslint-disable-next-line no-unused-vars
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { code: 429, message: '上传请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false
})

/**
 * 搜索接口限流：10 次/分钟/IP
 * 防止恶意搜索消耗数据库资源（LIKE 模糊查询开销较大）
 */
// eslint-disable-next-line no-unused-vars
const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { code: 429, message: '搜索过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false
})

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
app.use('/api/auth', authRoutes)                                   // 认证（登录限流在 auth.js 内部挂载）
app.use('/api/categories', categoryRoutes)                         // 分类（公开 + 管理）
app.use('/api/tags', tagRoutes)                                    // 标签（公开 + 管理）
app.use('/api/articles', articleRoutes)                            // 博客（包含公开和管理接口）
// 评论统计单独注册（无限流，仅简单计数查询，供后台仪表盘 15s 轮询）
app.use('/api/comments', commentReadLimiter, commentRoutes)       // 评论（读取用宽松限流，写入严格限流在 comments.js 内）
app.use('/api/links', linkRoutes)                                  // 友链（公开浏览 + 管理）
app.use('/api/settings', settingRoutes)                            // 网站设置（公开读取 + 管理）
app.use('/api/music', musicRoutes)                                 // 音乐（公开播放 + 管理）
app.use('/api/rss', rssRoutes)                                    // RSS 订阅（公开）
app.use('/api/sitemap.xml', sitemapRoutes)                        // Sitemap（公开）
app.use('/api/likes', likeRoutes)                                 // 文章点赞（公开 + IP 去重）
app.use('/api/favorites', favoriteRoutes)                         // 文章收藏（需登录）
app.use('/api/visits', visitRoutes)                               // 访问统计（记录公开 / 查询需登录）

// 需要登录的接口
app.use('/api/dashboard', dashboardRoutes)                         // 仪表盘
app.use('/api/upload', uploadRoutes)                             // 文件上传（POST 上传限流在 upload.js 路由内部挂载）
app.use('/api/trash', trashRoutes)                               // 回收站（需登录）
app.use('/api/logs', logsRoutes)                                 // 操作日志（需登录）
app.use('/api/export', exportRoutes)                             // 数据导出（需登录）

/**
 * 健康检查接口
 * GET /api/health - 用于监控服务是否正常运行
 * 包含：服务器状态、数据库连接状态、磁盘空间
 */
app.get('/api/health', async (req, res) => {
  const startTime = Date.now()

  // 检查数据库连接
  let dbStatus = { status: 'unknown', message: '' }
  try {
    const [rows] = await pool.execute('SELECT 1 as test')
    if (rows && rows[0] && rows[0].test === 1) {
      dbStatus = { status: 'ok', message: '数据库连接正常' }
    } else {
      dbStatus = { status: 'error', message: '数据库连接异常' }
    }
  } catch (err) {
    dbStatus = { status: 'error', message: `数据库连接失败: ${err.message}` }
  }

  // 检查上传目录状态
  let uploadStatus = { status: 'unknown', message: '' }
  try {
    if (fs.existsSync(uploadDir)) {
      uploadStatus = { status: 'ok', message: '上传目录正常' }
    } else {
      uploadStatus = { status: 'warning', message: '上传目录不存在' }
    }
  } catch (err) {
    uploadStatus = { status: 'error', message: `上传目录检查失败: ${err.message}` }
  }

  const responseTime = Date.now() - startTime
  const isHealthy = dbStatus.status === 'ok' && uploadStatus.status === 'ok'

  res.json({
    code: isHealthy ? 200 : 503,
    status: isHealthy ? 'healthy' : 'unhealthy',
    message: isHealthy ? '服务器运行正常' : '部分服务异常',
    time: new Date().toISOString(),
    uptime: process.uptime(),
    version: require('./package.json').version || '1.0.0',
    checks: {
      database: dbStatus,
      uploads: uploadStatus
    },
    responseTime: `${responseTime}ms`
  })
})

/**
 * 全局错误处理中间件
 * 捕获所有未处理的错误，返回统一格式的错误响应
 */
// eslint-disable-next-line no-unused-vars
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
