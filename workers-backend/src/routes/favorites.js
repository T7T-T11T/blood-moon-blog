/**
 * 收藏路由模块
 * 
 * 功能：
 * - GET /api/favorites - 获取当前用户的收藏列表（需登录）
 * - DELETE /api/favorites/:id - 取消收藏（需登录）
 */

import { Hono } from 'hono'
import { getDatabase } from '../db.js'
import { authMiddleware } from '../auth.js'

const favoritesRouter = new Hono()

/**
 * GET /api/favorites
 * 获取当前用户的收藏列表
 */
favoritesRouter.get('/', authMiddleware, async (c) => {
  const db = getDatabase(c.env)
  const user = c.get('user')

  try {
    const page = parseInt(c.req.query('page') || '1')
    const pageSize = parseInt(c.req.query('pageSize') || '10')

    const total = await db.count('article_favorites', { user_id: user.userId })
    const offset = (page - 1) * pageSize

    // 先获取收藏记录
    const favorites = await db.select('article_favorites', { user_id: user.userId }, {
      order: { column: 'created_at', ascending: false },
      offset,
      limit: pageSize
    })

    // 获取对应的文章详情
    const result = []
    for (const fav of favorites) {
      const article = await db.findOne('articles', { id: fav.article_id })
      if (article) {
        result.push({
          ...fav,
          article
        })
      }
    }

    return c.json({
      code: 200,
      data: {
        list: result,
        pagination: {
          page,
          pageSize,
          total
        }
      }
    })
  } catch (error) {
    console.error('Get favorites error:', error)
    return c.json({
      code: 500,
      message: '服务器错误'
    }, 500)
  }
})

/**
 * DELETE /api/favorites/:id
 * 取消收藏
 */
favoritesRouter.delete('/:id', authMiddleware, async (c) => {
  const db = getDatabase(c.env)
  const user = c.get('user')

  try {
    const articleId = parseInt(c.req.param('id'))
    
    await db.supabase
      .from('article_favorites')
      .delete()
      .eq('article_id', articleId)
      .eq('user_id', user.userId)

    return c.json({
      code: 200,
      message: '取消收藏成功'
    })
  } catch (error) {
    console.error('Delete favorite error:', error)
    return c.json({
      code: 500,
      message: '服务器错误'
    }, 500)
  }
})

export default favoritesRouter
