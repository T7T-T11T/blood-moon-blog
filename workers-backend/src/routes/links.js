/**
 * 导航/友情链接路由模块（别名 friends 路由）
 *
 * 功能：
 * - GET /api/links      - 获取已通过的链接列表（公开），同 /api/friends
 * - GET /api/links/all  - 获取全部链接（管理员），同 /api/friends/all
 * - POST /api/links     - 创建链接（管理员），同 /api/friends
 * - PUT /api/links/:id  - 更新链接（管理员），同 /api/friends/:id
 * - DELETE /api/links/:id - 删除链接（管理员）
 */

import { Hono } from 'hono'
import { getDatabase } from '../db.js'
import { authMiddleware, adminMiddleware, getClientIp } from '../auth.js'

const linksRouter = new Hono()

/**
 * GET /api/links
 * 获取已通过的链接列表（公开）
 * 查询参数：category - 筛选分类
 */
linksRouter.get('/', async (c) => {
  const db = getDatabase(c.env)

  try {
    const category = c.req.query('category')
    const filters = { status: '已通过' }
    if (category) filters.category = category

    const list = await db.select('friends', filters, {
      order: { column: 'sort_order', ascending: true }
    })

    return c.json({
      code: 200,
      data: {
        list,
        pagination: { page: 1, page_size: list.length, total: list.length }
      }
    })
  } catch (error) {
    console.error('Get links error:', error)
    return c.json({ code: 500, message: '服务器错误' }, 500)
  }
})

/**
 * GET /api/links/all
 * 获取全部链接（含待审核/已拒绝，需管理员）
 */
linksRouter.get('/all', authMiddleware, adminMiddleware, async (c) => {
  const db = getDatabase(c.env)

  try {
    const page = parseInt(c.req.query('page') || '1')
    const pageSize = parseInt(c.req.query('page_size') || '100')
    const status = c.req.query('status')
    const offset = (page - 1) * pageSize

    const filters = {}
    if (status) filters.status = status

    const total = await db.count('friends', filters)
    const list = await db.select('friends', filters, {
      order: { column: 'sort_order', ascending: true },
      offset,
      limit: pageSize
    })

    return c.json({
      code: 200,
      data: { list, pagination: { page, page_size: pageSize, total } }
    })
  } catch (error) {
    console.error('Get all links error:', error)
    return c.json({ code: 500, message: '服务器错误' }, 500)
  }
})

/**
 * POST /api/links
 * 创建链接（管理员）
 * 请求体：{ name, url, description, avatar_url, category, sort_order, status, email }
 */
linksRouter.post('/', authMiddleware, adminMiddleware, async (c) => {
  const db = getDatabase(c.env)
  const user = c.get('user')

  try {
    const body = await c.req.json()
    const { name, url, description, avatar_url, category, sort_order, status, email } = body

    if (!name || !url) {
      return c.json({ code: 400, message: '名称和链接不能为空' }, 400)
    }

    const created = await db.insert('friends', {
      name,
      url,
      description: description || null,
      avatar: avatar_url || null,
      sort_order: parseInt(sort_order) || 0,
      status: status || '待审核'
    })

    try {
      await db.safeInsertLog({
        user_id: user.userId,
        username: user.username,
        action: 'create',
        resource_type: 'link',
        resource_id: created.id,
        details: `创建链接：${name}`
      })
    } catch (_) {}

    return c.json({ code: 200, data: created, message: '创建成功' })
  } catch (error) {
    console.error('Create link error:', error)
    return c.json({ code: 500, message: '服务器错误' }, 500)
  }
})

/**
 * PUT /api/links/:id
 * 更新链接（管理员）
 */
linksRouter.put('/:id', authMiddleware, adminMiddleware, async (c) => {
  const db = getDatabase(c.env)
  const user = c.get('user')

  try {
    const id = parseInt(c.req.param('id'))
    const body = await c.req.json()

    const existing = await db.findOne('friends', { id })
    if (!existing) {
      return c.json({ code: 404, message: '链接不存在' }, 404)
    }

    const updateData = {}
    const allowedKeys = ['name', 'url', 'description', 'sort_order', 'status']
    for (const k of allowedKeys) {
      if (body[k] !== undefined) updateData[k] = body[k]
    }
    if (body.avatar_url !== undefined) updateData.avatar = body.avatar_url

    const updated = await db.update('friends', { id }, updateData)

    try {
      await db.safeInsertLog({
        user_id: user.userId,
        username: user.username,
        action: 'update',
        resource_type: 'link',
        resource_id: id,
        details: `更新链接：${body.name || existing.name}`
      })
    } catch (_) {}

    return c.json({ code: 200, data: updated, message: '更新成功' })
  } catch (error) {
    console.error('Update link error:', error)
    return c.json({ code: 500, message: '服务器错误' }, 500)
  }
})

/**
 * DELETE /api/links/:id
 * 删除链接（管理员）
 */
linksRouter.delete('/:id', authMiddleware, adminMiddleware, async (c) => {
  const db = getDatabase(c.env)
  const user = c.get('user')

  try {
    const id = parseInt(c.req.param('id'))
    const existing = await db.findOne('friends', { id })
    if (!existing) {
      return c.json({ code: 404, message: '链接不存在' }, 404)
    }

    await db.supabase.from('friends').delete().eq('id', id)

    try {
      await db.safeInsertLog({
        user_id: user.userId,
        username: user.username,
        action: 'delete',
        resource_type: 'link',
        resource_id: id,
        details: `删除链接：${existing.name}`
      })
    } catch (_) {}

    return c.json({ code: 200, message: '删除成功' })
  } catch (error) {
    console.error('Delete link error:', error)
    return c.json({ code: 500, message: '服务器错误' }, 500)
  }
})

export default linksRouter
