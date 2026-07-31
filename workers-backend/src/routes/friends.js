/**
 * 友情链接路由模块
 *
 * 功能：
 * - GET /api/friends      - 获取已通过的链接（公开）
 * - GET /api/friends/all  - 获取全部链接（管理员）
 * - POST /api/friends     - 创建链接（管理员）
 * - PUT /api/friends/:id  - 更新链接（管理员）
 * - DELETE /api/friends/:id - 删除链接（管理员）
 */

import { Hono } from 'hono'
import { getDatabase } from '../db.js'
import { authMiddleware, adminMiddleware, getClientIp } from '../auth.js'

const friendsRouter = new Hono()

/**
 * GET /api/friends
 * 获取已通过友情链接（公开），兼容 data 数组和 data.list 两种结构
 */
friendsRouter.get('/', async (c) => {
  const db = getDatabase(c.env)

  try {
    const category = c.req.query('category')
    const filters = { status: '已通过' }
    if (category) filters.category = category

    const rawList = await db.select('friends', filters, {
      order: { column: 'sort_order', ascending: true }
    })

    /** 字段映射：avatar → avatar_url，兼容前端模板 */
    const list = rawList.map(item => ({
      ...item,
      avatar_url: item.avatar || null
    }))

    return c.json({
      code: 200,
      data: list,
      list,
      pagination: { page: 1, page_size: list.length, total: list.length }
    })
  } catch (error) {
    console.error('Get friends error:', error)
    return c.json({ code: 500, message: '服务器错误' }, 500)
  }
})

/**
 * GET /api/friends/all
 * 获取全部友情链接（含待审核/已拒绝，需管理员）
 */
friendsRouter.get('/all', authMiddleware, adminMiddleware, async (c) => {
  const db = getDatabase(c.env)

  try {
    const page = parseInt(c.req.query('page') || '1')
    const pageSize = parseInt(c.req.query('page_size') || '100')
    const status = c.req.query('status')
    const offset = (page - 1) * pageSize

    const filters = {}
    if (status) filters.status = status

    const total = await db.count('friends', filters)
    const rawList = await db.select('friends', filters, {
      order: { column: 'sort_order', ascending: true },
      offset,
      limit: pageSize
    })

    /** 字段映射：avatar → avatar_url */
    const list = rawList.map(item => ({
      ...item,
      avatar_url: item.avatar || null
    }))

    return c.json({
      code: 200,
      data: { list, pagination: { page, page_size: pageSize, total } }
    })
  } catch (error) {
    console.error('Get all friends error:', error)
    return c.json({ code: 500, message: '服务器错误' }, 500)
  }
})

/**
 * POST /api/friends
 * 创建友情链接（管理员）
 */
friendsRouter.post('/', authMiddleware, adminMiddleware, async (c) => {
  const db = getDatabase(c.env)
  const user = c.get('user')

  try {
    const body = await c.req.json()
    const { name, url, description, avatar, avatar_url, sort_order, status, email, category } = body
    if (!name || !url) return c.json({ code: 400, message: '名称和链接不能为空' }, 400)

    const created = await db.insert('friends', {
      name, url,
      description: description || null,
      avatar: avatar || avatar_url || null,
      category: category || null,
      sort_order: parseInt(sort_order) || 0,
      status: status || '待审核',
      email: email || null,
      ip_address: getClientIp(c)
    })

    try {
      await db.safeInsertLog({
        user_id: user.userId,
        username: user.username,
        action: 'create',
        resource_type: 'friend',
        resource_id: created.id,
        details: `创建友情链接：${name}`
      })
    } catch (_) {}

    return c.json({ code: 200, data: created, message: '创建成功' })
  } catch (error) {
    console.error('Create friend error:', error)
    return c.json({ code: 500, message: '服务器错误' }, 500)
  }
})

/**
 * PUT /api/friends/:id
 * 更新友情链接（管理员）
 */
friendsRouter.put('/:id', authMiddleware, adminMiddleware, async (c) => {
  const db = getDatabase(c.env)
  const user = c.get('user')

  try {
    const id = parseInt(c.req.param('id'))
    const body = await c.req.json()
    const existing = await db.findOne('friends', { id })
    if (!existing) return c.json({ code: 404, message: '友情链接不存在' }, 404)

    const updateData = {}
    const allowed = ['name', 'url', 'description', 'sort_order', 'status']
    for (const k of allowed) if (body[k] !== undefined) updateData[k] = body[k]
    if (body.avatar !== undefined) updateData.avatar = body.avatar
    if (body.avatar_url !== undefined) updateData.avatar = body.avatar_url

    const updated = await db.update('friends', { id }, updateData)

    try {
      await db.safeInsertLog({
        user_id: user.userId,
        username: user.username,
        action: 'update',
        resource_type: 'friend',
        resource_id: id,
        details: `更新友情链接：${body.name || existing.name}`
      })
    } catch (_) {}

    return c.json({ code: 200, data: updated, message: '更新成功' })
  } catch (error) {
    console.error('Update friend error:', error)
    return c.json({ code: 500, message: '服务器错误' }, 500)
  }
})

/**
 * DELETE /api/friends/:id
 * 删除友情链接（管理员）
 */
friendsRouter.delete('/:id', authMiddleware, adminMiddleware, async (c) => {
  const db = getDatabase(c.env)
  const user = c.get('user')

  try {
    const id = parseInt(c.req.param('id'))
    const existing = await db.findOne('friends', { id })
    if (!existing) return c.json({ code: 404, message: '友情链接不存在' }, 404)

    await db.supabase.from('friends').delete().eq('id', id)

    try {
      await db.safeInsertLog({
        user_id: user.userId,
        username: user.username,
        action: 'delete',
        resource_type: 'friend',
        resource_id: id,
        details: `删除友情链接：${existing.name}`
      })
    } catch (_) {}

    return c.json({ code: 200, message: '删除成功' })
  } catch (error) {
    console.error('Delete friend error:', error)
    return c.json({ code: 500, message: '服务器错误' }, 500)
  }
})

export default friendsRouter
