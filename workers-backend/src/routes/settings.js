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
 * 公开设置白名单：仅返回前端实际展示/管理端可编辑的键。
 * 其余键（含潜在敏感配置）一律不对外返回，避免泄露。
 */
const PUBLIC_SETTING_KEYS = [
  'site_name',
  'site_description',
  'site_url',
  'site_keywords',
  'site_icp',
  'footer_text',
  'author_name',
  'author_bio',
  'author_github',
  'author_email',
  'author_avatar',
  'author_qq',
  'author_wechat',
  'author_skills',
  'allow_comments',
  'comments_moderation'
]
const PUBLIC_KEY_SET = new Set(PUBLIC_SETTING_KEYS)

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

    // 转换为键值对格式（仅返回白名单内的公开键）
    const result = {}
    for (const item of settings) {
      if (PUBLIC_KEY_SET.has(item.setting_key)) {
        result[item.setting_key] = item.setting_value
      }
    }

    return c.json({
      code: 200,
      data: result
    })
  } catch (error) {
    console.error('Get settings error:', error)
    // 仅返回通用错误信息，避免泄露内部细节
    return c.json({
      code: 500,
      message: '服务器错误'
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
