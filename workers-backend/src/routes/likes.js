/**
 * 点赞路由模块
 *
 * 功能：
 * - POST /api/likes/article/:id - 切换文章点赞状态（点赞/取消点赞）
 * - GET /api/likes/article/:id/status - 查询当前用户是否已点赞
 * - GET /api/likes/article/:id/count - 查询文章点赞数
 */

import { Hono } from 'hono'
import { getDatabase } from '../db.js'
import { authMiddleware } from '../auth.js'

const likesRouter = new Hono()

/**
 * POST /api/likes/article/:id
 * 切换点赞状态（已点赞则取消，未点赞则添加）
 * 支持登录用户和未登录 IP 两种点赞方式
 */
likesRouter.post('/article/:id', async (c) => {
  const db = getDatabase(c.env)
  const articleId = parseInt(c.req.param('id'))
  const authHeader = c.req.header('Authorization')

  try {
    // 验证文章存在
    const article = await db.findOne('articles', { id: articleId })
    if (!article) {
      return c.json({ code: 404, message: '文章不存在' }, 404)
    }

    // 识别用户（登录 or IP）
    const user = authHeader ? await verifyTokenSilently(authHeader, c.env.JWT_SECRET) : null
    const { user_id, ip } = user
      ? { user_id: user.userId, ip: null }
      : { user_id: null, ip: getClientIp(c) }

    // 检查是否已点赞
    const existing = user_id
      ? await db.findOne('article_likes', { article_id: articleId, user_id })
      : await db.findOne('article_likes', { article_id: articleId, ip })

    if (existing) {
      // 取消点赞
      await db.supabase.from('article_likes').delete().eq('id', existing.id)
      await db.supabase
        .from('articles')
        .update({ like_count: Math.max(0, (article.like_count || 0) - 1) })
        .eq('id', articleId)

      return c.json({
        code: 200,
        data: { liked: false, like_count: Math.max(0, (article.like_count || 0) - 1) },
        message: '已取消点赞'
      })
    }

    // 新增点赞
    await db.insert('article_likes', {
      article_id: articleId,
      user_id,
      ip,
      created_at: new Date().toISOString()
    })

    const newCount = (article.like_count || 0) + 1
    await db.supabase.from('articles').update({ like_count: newCount }).eq('id', articleId)

    return c.json({
      code: 200,
      data: { liked: true, like_count: newCount },
      message: '点赞成功'
    })
  } catch (error) {
    console.error('Toggle like error:', error)
    return c.json({ code: 500, message: '服务器错误' }, 500)
  }
})

/**
 * GET /api/likes/article/:id/status
 * 查询当前用户点赞状态（登录或基于 IP）
 */
likesRouter.get('/article/:id/status', async (c) => {
  const db = getDatabase(c.env)
  const articleId = parseInt(c.req.param('id'))
  const authHeader = c.req.header('Authorization')

  try {
    const user = authHeader ? await verifyTokenSilently(authHeader, c.env.JWT_SECRET) : null
    const { user_id, ip } = user
      ? { user_id: user.userId, ip: null }
      : { user_id: null, ip: getClientIp(c) }

    const existing = user_id
      ? await db.findOne('article_likes', { article_id: articleId, user_id })
      : await db.findOne('article_likes', { article_id: articleId, ip })

    return c.json({
      code: 200,
      data: { liked: !!existing }
    })
  } catch (error) {
    console.error('Get like status error:', error)
    return c.json({ code: 500, message: '服务器错误' }, 500)
  }
})

/**
 * GET /api/likes/article/:id/count
 * 查询文章点赞数
 */
likesRouter.get('/article/:id/count', async (c) => {
  const db = getDatabase(c.env)
  const articleId = parseInt(c.req.param('id'))

  try {
    const article = await db.findOne('articles', { id: articleId })
    if (!article) {
      return c.json({ code: 404, message: '文章不存在' }, 404)
    }

    return c.json({
      code: 200,
      data: { count: article.like_count || 0 }
    })
  } catch (error) {
    console.error('Get like count error:', error)
    return c.json({ code: 500, message: '服务器错误' }, 500)
  }
})

/**
 * 静默 Token 验证（失败返回 null）
 */
async function verifyTokenSilently(authHeader, secret) {
  try {
    const token = authHeader.replace('Bearer ', '')
    const { verifyToken } = await import('../auth.js')
    return await verifyToken(token, secret)
  } catch {
    return null
  }
}

/**
 * 获取客户端 IP
 */
function getClientIp(c) {
  return c.req.header('CF-Connecting-IP') ||
    c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() ||
    c.req.header('X-Real-IP') ||
    '127.0.0.1'
}

export default likesRouter
