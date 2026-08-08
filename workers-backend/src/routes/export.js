/**
 * 数据导出路由（生产环境 Cloudflare Workers）
 *
 * GET /api/export/comments - 导出评论为 JSON（管理员）
 * GET /api/export/articles - 导出文章为 JSON（管理员）
 */

import { Hono } from 'hono'
import { getDatabase } from '../db.js'
import { authMiddleware } from '../auth.js'

const exportRouter = new Hono()

exportRouter.get('/comments', authMiddleware, async (c) => {
  const db = getDatabase(c.env)
  try {
    const status = c.req.query('status')
    const articleId = c.req.query('article_id')
    const filters = {}
    if (status) filters.status = status
    if (articleId) filters.article_id = parseInt(articleId)

    const list = await db.select('comments', filters, {
      order: { column: 'created_at', ascending: false },
      limit: 1000
    })
    return c.json({ code: 200, data: list, message: '导出成功' })
  } catch (error) {
    console.error('Export comments error:', error)
    return c.json({ code: 500, message: '服务器错误' }, 500)
  }
})

exportRouter.get('/articles', authMiddleware, async (c) => {
  const db = getDatabase(c.env)
  try {
    const status = c.req.query('status')
    const filters = {}
    if (status) filters.status = status

    const list = await db.select('articles', filters, {
      order: { column: 'created_at', ascending: false },
      limit: 1000
    })
    return c.json({ code: 200, data: list, message: '导出成功' })
  } catch (error) {
    console.error('Export articles error:', error)
    return c.json({ code: 500, message: '服务器错误' }, 500)
  }
})

export default exportRouter