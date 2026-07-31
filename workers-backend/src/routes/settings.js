/**
 * 系统设置路由模块
 * 
 * 功能：
 * - GET /api/settings - 获取系统设置（公开）
 * - PUT /api/settings - 更新系统设置（需管理员）
 */

import { Hono } from 'hono'
import { getDatabase } from '../db.js'
import { authMiddleware, adminMiddleware } from '../auth.js'

const settingsRouter = new Hono()

/**
 * GET /api/settings
 * 获取系统设置（公开）
 */
settingsRouter.get('/', async (c) => {
  const db = getDatabase(c.env)
  
  try {
    const settings = await db.select('site_settings', {}, {
      order: { column: 'setting_key', ascending: true }
    })

    // 转换为键值对格式
    const result = {}
    for (const item of settings) {
      result[item.setting_key] = item.setting_value
    }

    return c.json({
      code: 200,
      data: result
    })
  } catch (error) {
    console.error('Get settings error:', error)
    // 返回实际错误信息便于调试（生产环境也返回，因为是只读接口）
    return c.json({
      code: 500,
      message: error.message || '服务器错误'
    }, 500)
  }
})

/**
 * PUT /api/settings
 * 批量更新系统设置
 * 请求体：{ key1: value1, key2: value2, ... }
 */
settingsRouter.put('/', authMiddleware, adminMiddleware, async (c) => {
  const db = getDatabase(c.env)
  const user = c.get('user')

  try {
    const body = await c.req.json()
    // 兼容前端 { settings: {...} } 和直接传键值对两种格式
    const data = body.settings || body
    const keys = Object.keys(data)

    if (keys.length === 0) {
      return c.json({
        code: 400,
        message: '没有要更新的设置'
      }, 400)
    }

    // 批量更新
    for (const key of keys) {
      const value = data[key]
      const existing = await db.findOne('site_settings', { setting_key: key })
      
      if (existing) {
        await db.update('site_settings', { setting_key: key }, {
          setting_value: String(value),
          updated_at: new Date().toISOString()
        })
      } else {
        // 注意：site_settings 表无 created_at 字段，使用 updated_at 作为时间戳
        await db.insert('site_settings', {
          setting_key: key,
          setting_value: String(value),
          description: '',
          updated_at: new Date().toISOString()
        })
      }
    }

    await db.safeInsertLog({
      user_id: user.userId,
      action: 'update',
      resource_type: 'settings',
      resource_id: 0,
      details: `更新系统设置：${keys.join(', ')}`,
      username: user.username
    })

    return c.json({
      code: 200,
      message: '更新成功'
    })
  } catch (error) {
    console.error('Update settings error:', error)
    return c.json({
      code: 500,
      message: '服务器错误'
    }, 500)
  }
})

export default settingsRouter
