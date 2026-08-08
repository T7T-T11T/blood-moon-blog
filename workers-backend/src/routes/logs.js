/**
 * 操作日志路由模块
 * 
 * 功能：
 * - GET /api/logs - 获取操作日志列表（需管理员）
 * - GET /api/logs/my - 获取当前用户日志（需登录）
 * - GET /api/logs/stats - 按操作类型统计日志（需管理员）
 * - DELETE /api/logs/:id - 删除操作日志（需管理员）
 * - DELETE /api/logs - 清空所有日志（需管理员）
 */

import { Hono } from 'hono'
import { getDatabase } from '../db.js'
import { authMiddleware, adminMiddleware } from '../auth.js'
import { runLogBackup } from '../services/logBackup.js'

const logsRouter = new Hono()

/**
 * GET /api/logs
 * 获取操作日志列表
 * 查询参数：page, pageSize, userId, action, resourceType, startDate/start_date, endDate/end_date
 */
logsRouter.get('/', authMiddleware, adminMiddleware, async (c) => {
  const db = getDatabase(c.env)
  
  try {
    const page = parseInt(c.req.query('page') || '1')
    const pageSize = parseInt(c.req.query('pageSize') || '20')
    const userId = c.req.query('userId')
    const action = c.req.query('action')
    const resourceType = c.req.query('resourceType')
    const startDate = c.req.query('startDate') || c.req.query('start_date')
    const endDate = c.req.query('endDate') || c.req.query('end_date')

    // 构建查询条件
    const filters = {}
    if (userId) filters.user_id = userId
    if (action) filters.action = action
    if (resourceType) filters.resource_type = resourceType

    const total = await db.count('operation_logs', filters)
    const offset = (page - 1) * pageSize

    // 获取日志列表
    let query = db.supabase
      .from('operation_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    // 应用过滤器
    if (userId) query = query.eq('user_id', userId)
    if (action) query = query.eq('action', action)
    if (resourceType) query = query.eq('resource_type', resourceType)
    if (startDate) query = query.gte('created_at', startDate)
    if (endDate) query = query.lte('created_at', endDate + 'T23:59:59Z')

    const { data, error } = await query

    if (error) {
      return c.json({
        code: 500,
        message: '查询失败'
      }, 500)
    }

    return c.json({
      code: 200,
      data: {
        list: data || [],
        pagination: {
          page,
          pageSize,
          total
        }
      }
    })
  } catch (error) {
    console.error('Get logs error:', error)
    return c.json({
      code: 500,
      message: '服务器错误'
    }, 500)
  }
})

/**
 * DELETE /api/logs/:id
 * 删除单条操作日志
 */
logsRouter.delete('/:id', authMiddleware, adminMiddleware, async (c) => {
  const db = getDatabase(c.env)
  
  try {
    const id = parseInt(c.req.param('id'))
    
    await db.supabase.from('operation_logs').delete().eq('id', id)

    return c.json({
      code: 200,
      message: '删除成功'
    })
  } catch (error) {
    console.error('Delete log error:', error)
    return c.json({
      code: 500,
      message: '服务器错误'
    }, 500)
  }
})

/**
 * DELETE /api/logs
 * 清空所有操作日志
 */
logsRouter.delete('/', authMiddleware, adminMiddleware, async (c) => {
  const db = getDatabase(c.env)
  const user = c.get('user')

  try {
    await db.supabase.from('operation_logs').delete().neq('id', 0)

    // 记录清空操作
    await db.insert('operation_logs', {
      user_id: user.userId,
      action: 'clear_logs',
      resource_type: 'logs',
      resource_id: 0,
      details: '清空所有操作日志',
      username: user.username
    })

    return c.json({
      code: 200,
      message: '清空成功'
    })
  } catch (error) {
    console.error('Clear logs error:', error)
    return c.json({
      code: 500,
      message: '服务器错误'
    }, 500)
  }
})

/**
 * GET /api/logs/my
 * 获取当前用户的日志
 */
logsRouter.get('/my', authMiddleware, async (c) => {
  const db = getDatabase(c.env)
  const user = c.get('user')

  try {
    const page = parseInt(c.req.query('page') || '1')
    const pageSize = parseInt(c.req.query('pageSize') || '20')
    const action = c.req.query('action')
    const startDate = c.req.query('startDate') || c.req.query('start_date')
    const endDate = c.req.query('endDate') || c.req.query('end_date')

    const filters = { user_id: user.userId }
    if (action) filters.action = action

    const total = await db.count('operation_logs', filters)
    const offset = (page - 1) * pageSize

    let query = db.supabase
      .from('operation_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    query = query.eq('user_id', user.userId)
    if (action) query = query.eq('action', action)
    if (startDate) query = query.gte('created_at', startDate)
    if (endDate) query = query.lte('created_at', endDate + 'T23:59:59Z')

    const { data, error } = await query

    if (error) {
      return c.json({
        code: 500,
        message: '查询失败'
      }, 500)
    }

    return c.json({
      code: 200,
      data: {
        list: data || [],
        pagination: {
          page,
          pageSize,
          total
        }
      }
    })
  } catch (error) {
    console.error('Get my logs error:', error)
    return c.json({
      code: 500,
      message: '服务器错误'
    }, 500)
  }
})

/**
 * GET /api/logs/stats
 * 按操作类型统计日志数量
 */
logsRouter.get('/stats', authMiddleware, adminMiddleware, async (c) => {
  const db = getDatabase(c.env)

  try {
    const startDate = c.req.query('startDate') || c.req.query('start_date')
    const endDate = c.req.query('endDate') || c.req.query('end_date')

    let query = db.supabase
      .from('operation_logs')
      .select('action')

    if (startDate) query = query.gte('created_at', startDate)
    if (endDate) query = query.lte('created_at', endDate + 'T23:59:59Z')

    const { data, error } = await query

    if (error) {
      return c.json({
        code: 500,
        message: '查询失败'
      }, 500)
    }

    const stats = {}
    for (const log of data || []) {
      const action = log.action
      stats[action] = (stats[action] || 0) + 1
    }

    const result = Object.entries(stats).map(([action, count]) => ({
      action,
      count
    }))

    return c.json({
      code: 200,
      data: result
    })
  } catch (error) {
    console.error('Get logs stats error:', error)
    return c.json({
      code: 500,
      message: '服务器错误'
    }, 500)
  }
})


/**
 * POST /api/logs/backup
 * 手动执行日志备份（管理员）：备份到 KV 后清空日志表
 */
logsRouter.post('/backup', authMiddleware, adminMiddleware, async (c) => {
  try {
    const result = await runLogBackup(c.env)
    if (!result.ok) {
      return c.json({ code: 500, message: result.message }, 500)
    }
    return c.json({ code: 200, data: result, message: result.message })
  } catch (error) {
    console.error('Manual log backup error:', error)
    return c.json({ code: 500, message: '服务器错误' }, 500)
  }
})

/**
 * GET /api/logs/backups
 * 获取日志备份列表（管理员）
 */
logsRouter.get('/backups', authMiddleware, adminMiddleware, async (c) => {
  try {
    const kv = c.env.RATE_LIMIT_KV
    if (!kv) return c.json({ code: 200, data: [] })
    const indexRaw = await kv.get('log-backups-index')
    const index = indexRaw ? JSON.parse(indexRaw) : []
    return c.json({ code: 200, data: index })
  } catch (error) {
    console.error('Get log backups error:', error)
    return c.json({ code: 500, message: '服务器错误' }, 500)
  }
})

/**
 * GET /api/logs/backups/:date
 * 下载指定日期的日志备份（管理员）
 */
logsRouter.get('/backups/:date', authMiddleware, adminMiddleware, async (c) => {
  try {
    const kv = c.env.RATE_LIMIT_KV
    const date = c.req.param('date')
    if (!kv) return c.json({ code: 404, message: '未配置备份存储' }, 404)
    const raw = await kv.get(`log-backup-${date}`)
    if (!raw) return c.json({ code: 404, message: '备份不存在' }, 404)
    return c.body(raw, 200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="operation-logs-${date}.json"`
    })
  } catch (error) {
    console.error('Download log backup error:', error)
    return c.json({ code: 500, message: '服务器错误' }, 500)
  }
})

/**
 * DELETE /api/logs/backups/:date
 * 删除指定日期的日志备份（管理员）
 */
logsRouter.delete('/backups/:date', authMiddleware, adminMiddleware, async (c) => {
  try {
    const kv = c.env.RATE_LIMIT_KV
    const date = c.req.param('date')
    if (!kv) return c.json({ code: 404, message: '未配置备份存储' }, 404)
    await kv.delete(`log-backup-${date}`)
    const indexRaw = await kv.get('log-backups-index')
    if (indexRaw) {
      const index = JSON.parse(indexRaw).filter((b) => b.date !== date)
      await kv.put('log-backups-index', JSON.stringify(index), { expirationTtl: 31536000 })
    }
    return c.json({ code: 200, message: '备份已删除' })
  } catch (error) {
    console.error('Delete log backup error:', error)
    return c.json({ code: 500, message: '服务器错误' }, 500)
  }
})
export default logsRouter
