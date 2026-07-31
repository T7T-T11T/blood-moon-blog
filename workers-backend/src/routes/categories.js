/**
 * 分类路由模块
 * 
 * 功能：
 * - GET /api/categories - 获取所有分类
 * - POST /api/categories - 创建分类（需管理员）
 * - PUT /api/categories/:id - 更新分类（需管理员）
 * - DELETE /api/categories/:id - 删除分类（需管理员）
 */

import { Hono } from 'hono'
import { getDatabase } from '../db.js'
import { authMiddleware, adminMiddleware } from '../auth.js'

const categoriesRouter = new Hono()

/**
 * GET /api/categories
 * 获取所有分类（公开），支持 with_count 查询文章数
 */
categoriesRouter.get('/', async (c) => {
  const db = getDatabase(c.env)

  try {
    const withCount = c.req.query('with_count') === 'true'
    const categories = await db.select('categories', {}, {
      order: { column: 'sort_order', ascending: true }
    })

    if (withCount) {
      // 给每个分类补充文章数
      for (const cat of categories) {
        try {
          cat.article_count = await db.count('articles', {
            category_id: cat.id,
            status: '已发布'
          })
        } catch (_) {
          cat.article_count = 0
        }
      }
    }

    return c.json({
      code: 200,
      data: categories
    })
  } catch (error) {
    console.error('Get categories error:', error)
    return c.json({
      code: 500,
      message: '服务器错误'
    }, 500)
  }
})

/**
 * POST /api/categories
 * 创建分类
 */
categoriesRouter.post('/', authMiddleware, adminMiddleware, async (c) => {
  const db = getDatabase(c.env)
  const user = c.get('user')

  try {
    const body = await c.req.json()
    const { name, description, sort_order = 0 } = body

    if (!name) {
      return c.json({
        code: 400,
        message: '分类名称不能为空'
      }, 400)
    }

    // 检查是否已存在
    const existing = await db.findOne('categories', { name })
    if (existing) {
      return c.json({
        code: 400,
        message: '分类已存在'
      }, 400)
    }

    const slug = name.toLowerCase().replace(/\s+/g, '-')
    const category = await db.insert('categories', {
      name,
      slug,
      description: description || '',
      sort_order,
      created_at: new Date().toISOString()
    })

    // 记录操作日志（捕获异常避免阻断主流程）
    try {
      await db.safeInsertLog({
        user_id: user.userId,
        action: 'create',
        resource_type: 'category',
        resource_id: category.id,
        details: `创建分类：${name}`,
        username: user.username
      })
    } catch (_) {}

    return c.json({
      code: 200,
      data: category,
      message: '创建成功'
    })
  } catch (error) {
    console.error('Create category error:', error)
    return c.json({
      code: 500,
      message: '服务器错误'
    }, 500)
  }
})

/**
 * PUT /api/categories/:id
 * 更新分类
 */
categoriesRouter.put('/:id', authMiddleware, adminMiddleware, async (c) => {
  const db = getDatabase(c.env)
  const user = c.get('user')

  try {
    const id = parseInt(c.req.param('id'))
    const body = await c.req.json()
    const category = await db.findOne('categories', { id })

    if (!category) {
      return c.json({
        code: 404,
        message: '分类不存在'
      }, 404)
    }

    const updateData = { updated_at: new Date().toISOString() }
    const allowedFields = ['name', 'description', 'sort_order']
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    if (body.name) {
      updateData.slug = body.name.toLowerCase().replace(/\s+/g, '-')
    }

    const updated = await db.update('categories', { id }, updateData)

    // 记录操作日志（捕获异常避免阻断主流程）
    try {
      await db.safeInsertLog({
        user_id: user.userId,
        action: 'update',
        resource_type: 'category',
        resource_id: id,
        details: `更新分类：${body.name || category.name}`,
        username: user.username
      })
    } catch (_) {}

    return c.json({
      code: 200,
      data: updated,
      message: '更新成功'
    })
  } catch (error) {
    console.error('Update category error:', error)
    return c.json({
      code: 500,
      message: '服务器错误'
    }, 500)
  }
})

/**
 * DELETE /api/categories/:id
 * 删除分类
 */
categoriesRouter.delete('/:id', authMiddleware, adminMiddleware, async (c) => {
  const db = getDatabase(c.env)
  const user = c.get('user')

  try {
    const id = parseInt(c.req.param('id'))
    const category = await db.findOne('categories', { id })

    if (!category) {
      return c.json({
        code: 404,
        message: '分类不存在'
      }, 404)
    }

    // 检查是否有关联文章
    const articleCount = await db.count('articles', { category_id: id })
    if (articleCount > 0) {
      return c.json({
        code: 400,
        message: `该分类下还有 ${articleCount} 篇文章，无法删除`
      }, 400)
    }

    await db.supabase.from('categories').delete().eq('id', id)

    // 记录操作日志（捕获异常避免阻断主流程）
    try {
      await db.safeInsertLog({
        user_id: user.userId,
        action: 'delete',
        resource_type: 'category',
        resource_id: id,
        details: `删除分类：${category.name}`,
        username: user.username
      })
    } catch (_) {}

    return c.json({
      code: 200,
      message: '删除成功'
    })
  } catch (error) {
    console.error('Delete category error:', error)
    return c.json({
      code: 500,
      message: '服务器错误'
    }, 500)
  }
})

export default categoriesRouter
