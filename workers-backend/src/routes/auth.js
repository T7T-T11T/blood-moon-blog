/**
 * 认证路由模块
 *
 * 功能：
 * - POST /api/auth/login - 用户登录
 * - GET /api/auth/profile - 获取当前用户信息
 * - PUT /api/auth/password - 修改密码
 * - PUT /api/auth/profile - 更新用户资料
 */

import { Hono } from 'hono'
import { getDatabase } from '../db.js'
import { hashPassword, verifyPassword, generateToken, verifyToken, authMiddleware } from '../auth.js'

const authRouter = new Hono()

/**
 * POST /api/auth/login
 * 用户登录接口
 * 请求体：{ username, password }
 * 返回：{ token, user }
 */
authRouter.post('/login', async (c) => {
  const db = getDatabase(c.env)

  try {
    const body = await c.req.json()
    const { username, password } = body

    if (!username || !password) {
      return c.json({ code: 400, message: '用户名和密码不能为空' }, 400)
    }

    // 查找用户
    const user = await db.findOne('users', { username })
    if (!user) {
      return c.json({ code: 401, message: '用户名或密码错误' }, 401)
    }

    // 验证密码
    const valid = await verifyPassword(password, user.password_hash)
    if (!valid) {
      return c.json({ code: 401, message: '用户名或密码错误' }, 401)
    }

    // 生成 Token
    const token = await generateToken(
      { userId: user.id, username: user.username, role: user.role || 'admin' },
      c.env.JWT_SECRET,
      c.env
    )

    // 记录操作日志（捕获异常避免阻断登录）
    try {
      await db.insert('operation_logs', {
        user_id: user.id,
        username: user.username,
        action: 'login',
        resource_type: 'user',
        resource_id: user.id,
        details: `${username} 登录成功`,
        ip_address: c.req.header('CF-Connecting-IP') || '127.0.0.1'
      })
    } catch (logErr) {
      console.warn('[Login] Failed to write operation_logs (non-fatal):', logErr.message)
    }

    // 返回用户信息（不返回密码）
    const { password_hash, ...userInfo } = user
    return c.json({
      code: 200,
      data: {
        token,
        user: userInfo
      },
      message: '登录成功'
    })
  } catch (error) {
    console.error('Login error:', error)
    return c.json({ code: 500, message: '服务器错误' }, 500)
  }
})

/**
 * GET /api/auth/profile
 * 获取当前用户信息
 */
authRouter.get('/profile', authMiddleware, async (c) => {
  const db = getDatabase(c.env)
  const user = c.get('user')

  try {
    const userInfo = await db.findOne('users', { id: user.userId })
    if (!userInfo) {
      return c.json({ code: 404, message: '用户不存在' }, 404)
    }

    const { password_hash, ...profile } = userInfo
    return c.json({ code: 200, data: profile })
  } catch (error) {
    console.error('Get profile error:', error)
    return c.json({ code: 500, message: '服务器错误' }, 500)
  }
})

/**
 * PUT /api/auth/password
 * 修改密码
 * 请求体：{ oldPassword, newPassword }
 */
authRouter.put('/password', authMiddleware, async (c) => {
  const db = getDatabase(c.env)
  const user = c.get('user')

  try {
    const body = await c.req.json()
    const { oldPassword, newPassword } = body

    if (!oldPassword || !newPassword) {
      return c.json({ code: 400, message: '旧密码和新密码不能为空' }, 400)
    }
    if (newPassword.length < 6) {
      return c.json({ code: 400, message: '新密码至少 6 位' }, 400)
    }

    const userInfo = await db.findOne('users', { id: user.userId })
    if (!userInfo) {
      return c.json({ code: 404, message: '用户不存在' }, 404)
    }

    const valid = await verifyPassword(oldPassword, userInfo.password_hash)
    if (!valid) {
      return c.json({ code: 401, message: '旧密码错误' }, 401)
    }

    const newHash = await hashPassword(newPassword)
    await db.update('users', { id: user.userId }, {
      password_hash: newHash,
      updated_at: new Date().toISOString()
    })

    // 记录日志
    try {
      await db.insert('operation_logs', {
        user_id: user.userId,
        username: user.username,
        action: 'update_password',
        resource_type: 'user',
        resource_id: user.userId,
        details: '修改密码',
        ip_address: c.req.header('CF-Connecting-IP') || '127.0.0.1'
      })
    } catch (_) {}

    return c.json({ code: 200, message: '密码修改成功' })
  } catch (error) {
    console.error('Update password error:', error)
    return c.json({ code: 500, message: '服务器错误' }, 500)
  }
})

/**
 * PUT /api/auth/profile
 * 更新用户资料
 * 请求体：{ avatar_url, bio, email, github_url, qq_url, wechat }
 */
authRouter.put('/profile', authMiddleware, async (c) => {
  const db = getDatabase(c.env)
  const user = c.get('user')

  try {
    const body = await c.req.json()
    const allowedFields = ['avatar_url', 'bio', 'email', 'github_url', 'qq_url', 'wechat']
    const updateData = {}

    for (const field of allowedFields) {
      if (body[field] !== undefined) updateData[field] = body[field]
    }
    if (Object.keys(updateData).length === 0) {
      return c.json({ code: 400, message: '没有要更新的字段' }, 400)
    }

    updateData.updated_at = new Date().toISOString()
    await db.update('users', { id: user.userId }, updateData)

    return c.json({ code: 200, message: '更新成功' })
  } catch (error) {
    console.error('Update profile error:', error)
    return c.json({ code: 500, message: '服务器错误' }, 500)
  }
})

export default authRouter
