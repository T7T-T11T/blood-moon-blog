/**
 * Cloudflare Workers 后端主入口
 * 
 * 技术栈：Hono + Supabase PostgreSQL
 * 
 * 功能：
 * - CORS 跨域支持
 * - 全局错误处理
 * - API 路由挂载
 * 
 * 部署：
 * - wrangler deploy 部署到 Cloudflare Workers
 * - wrangler dev 本地开发调试
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { getDatabase } from './db.js'

// 导入路由模块
import authRouter from './routes/auth.js'
import articlesRouter from './routes/articles.js'
import categoriesRouter from './routes/categories.js'
import tagsRouter from './routes/tags.js'
import commentsRouter from './routes/comments.js'
import friendsRouter from './routes/friends.js'
import settingsRouter from './routes/settings.js'
import dashboardRouter from './routes/dashboard.js'
import visitsRouter from './routes/visits.js'
import musicRouter from './routes/music.js'
import favoritesRouter from './routes/favorites.js'
import logsRouter from './routes/logs.js'
import likesRouter from './routes/likes.js'
import linksRouter from './routes/links.js'
import uploadsRouter from './routes/upload.js'
import trashRouter from './routes/trash.js'
import rssRouter from './routes/rss.js'

// 创建 Hono 应用
const app = new Hono()

/**
 * CORS 配置
 * 允许前端 Pages 域名和本地开发跨域访问
 */
app.use('/*', cors({
  origin: (origin, c) => {
    // 允许 Cloudflare Pages 域名和本地开发
    if (origin.includes('.pages.dev') || 
        origin.includes('.workers.dev') ||
        origin.includes('localhost') ||
        origin === c.env.CORS_ORIGIN) {
      return origin
    }
    return c.env.CORS_ORIGIN || '*'
  },
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  maxAge: 86400
}))

// 日志中间件
app.use('/*', logger())

/**
 * 健康检查接口
 * GET /api/health
 */
app.get('/api/health', async (c) => {
  try {
    const db = getDatabase(c.env)
    const { data, error } = await db.supabase.from('users').select('id', { limit: 1 })
    
    if (error) {
      return c.json({
        status: 'error',
        service: 'blood-moon-blog-api',
        database: 'disconnected',
        timestamp: new Date().toISOString()
      }, 500)
    }

    return c.json({
      status: 'ok',
      service: 'blood-moon-blog-api',
      version: '1.0.0',
      environment: c.env.ENVIRONMENT || 'production',
      database: 'connected',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return c.json({
      status: 'error',
      message: error.message
    }, 500)
  }
})

// 挂载 API 路由
app.route('/api/auth', authRouter)
app.route('/api/articles', articlesRouter)
app.route('/api/categories', categoriesRouter)
app.route('/api/tags', tagsRouter)
app.route('/api/comments', commentsRouter)
app.route('/api/friends', friendsRouter)
app.route('/api/settings', settingsRouter)
app.route('/api/dashboard', dashboardRouter)
app.route('/api/visits', visitsRouter)
app.route('/api/music', musicRouter)
app.route('/api/favorites', favoritesRouter)
app.route('/api/logs', logsRouter)
app.route('/api/likes', likesRouter)
app.route('/api/links', linksRouter)
app.route('/api/upload', uploadsRouter)
app.route('/api/trash', trashRouter)
app.route('/api', rssRouter)

/**
 * 404 处理
 */
app.notFound((c) => {
  return c.json({
    code: 404,
    message: '接口不存在'
  }, 404)
})

/**
 * 全局错误处理（生产环境返回通用错误信息）
 */
app.onError((err, c) => {
  console.error('[Error]', err)

  return c.json({
    code: 500,
    message: '服务器内部错误',
    error: c.env.ENVIRONMENT === 'development' ? err.message : undefined
  }, 500)
})

// 导出 Worker
export default app
