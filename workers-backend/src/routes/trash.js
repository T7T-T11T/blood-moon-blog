/**
 * 回收站路由模块
 *
 * 功能：
 * - GET /api/trash - 获取回收站文章列表（管理员）
 * - POST /api/trash/:id/restore - 恢复回收站中的文章
 * - DELETE /api/trash/:id - 永久删除回收站中的文章
 * - DELETE /api/trash/clear - 清空回收站
 */

import { Hono } from 'hono'
import { getDatabase } from '../db.js'
import { authMiddleware, adminMiddleware } from '../auth.js'

const trashRouter = new Hono()

/**
 * GET /api/trash
 * 获取回收站文章列表（软删除的文章）
 * 查询参数：page, page_size
 */
trashRouter.get('/', authMiddleware, adminMiddleware, async (c) => {
  const db = getDatabase(c.env)

  try {
    const page = parseInt(c.req.query('page') || '1')
    const pageSize = parseInt(c.req.query('page_size') || '20')
    const offset = (page - 1) * pageSize

    const { data, error, count } = await db.supabase
      .from('articles')
      .select('*', { count: 'exact' })
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (error) throw error

    return c.json({
      code: 200,
      data: {
        list: data || [],
        pagination: { page, page_size: pageSize, total: count || 0 }
      }
    })
  } catch (error) {
    console.error('Get trash error:', error)
    return c.json({ code: 500, message: '服务器错误' }, 500)
  }
})

/**
 * POST /api/trash/:id/restore
 * 恢复回收站中的文章
 */
trashRouter.post('/:id/restore', authMiddleware, adminMiddleware, async (c) => {
  const db = getDatabase(c.env)
  const user = c.get('user')

  try {
    const id = parseInt(c.req.param('id'))

    const { data: article, error } = await db.supabase
      .from('articles')
      .select('*')
      .eq('id', id)
      .not('deleted_at', 'is', null)
      .single()

    if (error || !article) {
      return c.json({ code: 404, message: '文章不存在或不在回收站中' }, 404)
    }

    await db.update('articles', { id }, {
      deleted_at: null,
      updated_at: new Date().toISOString()
    })

    await db.safeInsertLog({
      user_id: user.userId,
      action: 'restore',
      resource_type: 'article',
      resource_id: id,
      details: `恢复文章：${article.title}`,
      username: user.username
    })

    return c.json({ code: 200, message: '恢复成功' })
  } catch (error) {
    console.error('Restore trash error:', error)
    return c.json({ code: 500, message: '服务器错误' }, 500)
  }
})

/**
 * DELETE /api/trash/:id
 * 永久删除回收站中的文章
 */
trashRouter.delete('/:id', authMiddleware, adminMiddleware, async (c) => {
  const db = getDatabase(c.env)
  const user = c.get('user')

  try {
    const id = parseInt(c.req.param('id'))

    const { data: article } = await db.supabase
      .from('articles')
      .select('*')
      .eq('id', id)
      .not('deleted_at', 'is', null)
      .single()

    if (!article) {
      return c.json({ code: 404, message: '文章不存在或不在回收站中' }, 404)
    }

    // 永久删除（硬删除）
    await db.supabase.from('article_tags').delete().eq('article_id', id)
    await db.supabase.from('comments').delete().eq('article_id', id)
    await db.supabase.from('article_likes').delete().eq('article_id', id)
    await db.supabase.from('article_favorites').delete().eq('article_id', id)
    await db.supabase.from('articles').delete().eq('id', id)

    await db.safeInsertLog({
      user_id: user.userId,
      action: 'delete',
      resource_type: 'article',
      resource_id: id,
      details: `永久删除文章：${article.title}`,
      username: user.username
    })

    return c.json({ code: 200, message: '已永久删除' })
  } catch (error) {
    console.error('Delete trash error:', error)
    return c.json({ code: 500, message: '服务器错误' }, 500)
  }
})

/**
 * DELETE /api/trash/clear
 * 清空回收站
 */
trashRouter.delete('/clear', authMiddleware, adminMiddleware, async (c) => {
  const db = getDatabase(c.env)
  const user = c.get('user')

  try {
    // 获取所有软删除的文章ID
    const { data: articles, error } = await db.supabase
      .from('articles')
      .select('id')
      .not('deleted_at', 'is', null)

    if (error) throw error

    if (!articles || articles.length === 0) {
      return c.json({ code: 200, message: '回收站已空' })
    }

    const ids = articles.map((a) => a.id)

    // 批量硬删除关联数据
    await db.supabase.from('article_tags').delete().in('article_id', ids)
    await db.supabase.from('comments').delete().in('article_id', ids)
    await db.supabase.from('article_likes').delete().in('article_id', ids)
    await db.supabase.from('article_favorites').delete().in('article_id', ids)
    await db.supabase.from('articles').delete().in('id', ids)

    await db.safeInsertLog({
      user_id: user.userId,
      action: 'clear',
      resource_type: 'article',
      resource_id: 0,
      details: `清空回收站，共删除 ${ids.length} 篇文章`,
      username: user.username
    })

    return c.json({ code: 200, message: `已清空回收站（${ids.length} 篇文章）` })
  } catch (error) {
    console.error('Clear trash error:', error)
    return c.json({ code: 500, message: '服务器错误' }, 500)
  }
})

export default trashRouter