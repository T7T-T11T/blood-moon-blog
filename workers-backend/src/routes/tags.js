/**
 * 标签路由模块
 *
 * 功能：
 * - GET /api/tags - 获取所有标签（公开，含文章数量）
 * - POST /api/tags - 创建标签（需管理员）
 * - PUT /api/tags/:id - 更新标签（需管理员）
 * - DELETE /api/tags/:id - 删除标签（需管理员）
 */

import { Hono } from 'hono'
import { getDatabase } from '../db.js'
import { authMiddleware, adminMiddleware } from '../auth.js'

const tagsRouter = new Hono()

/**
 * GET /api/tags
 * 获取所有标签（含已发布文章数量）
 */
tagsRouter.get('/', async (c) => {
  const db = getDatabase(c.env)

  try {
    // 查询所有标签
    const tags = await db.select('tags', {}, {
      order: { column: 'id', ascending: true }
    })

    // 统计每个标签关联的已发布文章（无关联返回0，整个接口永远200）
    let counts = {}
    try {
      // 统计每个标签的所有文章关联
      const { data: atList } = await db.supabase.from('article_tags').select('tag_id, article_id')
      // 批量获取文章状态（避免 N+1）
      const { data: pubArticles } = await db.supabase
        .from('articles')
        .select('id, status, deleted_at')
        .is('deleted_at', null)
        .eq('status', '已发布')
      const pubSet = new Set((pubArticles || []).map(a => a.id))
      for (const at of (atList || [])) {
        if (pubSet.has(at.article_id)) {
          counts[at.tag_id] = (counts[at.tag_id] || 0) + 1
        }
      }
    } catch (e) {
      console.warn('[tags] 统计关联文章失败，返回 0:', e?.message || String(e))
      counts = {}
    }

    const result = (tags || []).map(t => ({ ...t, article_count: counts[t.id] || 0 }))
    return c.json({ code: 200, data: result })
  } catch (error) {
    console.error('Get tags error:', error)
    return c.json({ code: 500, message: '服务器错误' }, 500)
  }
})

/**
 * POST /api/tags
 * 创建标签（管理员）
 */
tagsRouter.post('/', authMiddleware, adminMiddleware, async (c) => {
  const db = getDatabase(c.env)
  const user = c.get('user')

  try {
    const body = await c.req.json()
    const { name } = body
    if (!name) return c.json({ code: 400, message: '标签名称不能为空' }, 400)

    const existing = await db.findOne('tags', { name })
    if (existing) return c.json({ code: 400, message: '标签已存在' }, 400)

    const slug = name.toLowerCase().replace(/\s+/g, '-')
    const tag = await db.insert('tags', {
      name, slug,
      created_at: new Date().toISOString()
    })

    try {
      await db.safeInsertLog({
        user_id: user.userId,
        username: user.username,
        action: 'create',
        resource_type: 'tag',
        resource_id: tag.id,
        details: `创建标签：${name}`
      })
    } catch (_) {}

    return c.json({ code: 200, data: tag, message: '创建成功' })
  } catch (error) {
    console.error('Create tag error:', error)
    return c.json({ code: 500, message: '服务器错误' }, 500)
  }
})

/**
 * PUT /api/tags/:id
 * 更新标签（管理员）
 */
tagsRouter.put('/:id', authMiddleware, adminMiddleware, async (c) => {
  const db = getDatabase(c.env)
  const user = c.get('user')

  try {
    const id = parseInt(c.req.param('id'))
    const body = await c.req.json()
    const tag = await db.findOne('tags', { id })
    if (!tag) return c.json({ code: 404, message: '标签不存在' }, 404)

    const updateData = {}
    if (body.name) {
      updateData.name = body.name
      updateData.slug = body.name.toLowerCase().replace(/\s+/g, '-')
    }

    const updated = await db.update('tags', { id }, updateData)

    try {
      await db.safeInsertLog({
        user_id: user.userId,
        username: user.username,
        action: 'update',
        resource_type: 'tag',
        resource_id: id,
        details: `更新标签：${body.name || tag.name}`
      })
    } catch (_) {}

    return c.json({ code: 200, data: updated, message: '更新成功' })
  } catch (error) {
    console.error('Update tag error:', error)
    return c.json({ code: 500, message: '服务器错误' }, 500)
  }
})

/**
 * DELETE /api/tags/:id
 * 删除标签（管理员）
 */
tagsRouter.delete('/:id', authMiddleware, adminMiddleware, async (c) => {
  const db = getDatabase(c.env)
  const user = c.get('user')

  try {
    const id = parseInt(c.req.param('id'))
    const tag = await db.findOne('tags', { id })
    if (!tag) return c.json({ code: 404, message: '标签不存在' }, 404)

    // 删除关联
    try { await db.supabase.from('article_tags').delete().eq('tag_id', id) } catch (_) {}
    try { await db.supabase.from('tags').delete().eq('id', id) } catch (_) {}

    try {
      await db.safeInsertLog({
        user_id: user.userId,
        username: user.username,
        action: 'delete',
        resource_type: 'tag',
        resource_id: id,
        details: `删除标签：${tag.name}`
      })
    } catch (_) {}

    return c.json({ code: 200, message: '删除成功' })
  } catch (error) {
    console.error('Delete tag error:', error)
    return c.json({ code: 500, message: '服务器错误' }, 500)
  }
})

export default tagsRouter
