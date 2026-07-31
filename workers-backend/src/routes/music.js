/**
 * 音乐管理路由模块
 * 
 * 功能：
 * - GET /api/music - 获取音乐列表（公开）
 * - POST /api/music - 添加音乐（需管理员）
 * - DELETE /api/music/:id - 删除音乐（需管理员）
 */

import { Hono } from 'hono'
import { getDatabase } from '../db.js'
import { authMiddleware, adminMiddleware } from '../auth.js'

const musicRouter = new Hono()

/**
 * GET /api/music
 * 获取音乐列表（公开）
 * 返回兼容两种格式：
 *   res.data = [..] 或 res.data.list = [..]
 */
musicRouter.get('/', async (c) => {
  const db = getDatabase(c.env)

  try {
    const music = await db.select('music', {}, {
      order: { column: 'sort_order', ascending: true }
    })

    // 统一歌词字段，返回 { list, ... } 结构
    const list = (music || []).map(m => ({
      id: m.id,
      title: m.title,
      artist: m.artist || null,
      cover: m.cover || null,
      url: m.url || null,
      lyric: m.lyric || m.lrc || null,
      sort_order: m.sort_order || 0,
      status: m.status || '已通过',
      created_at: m.created_at
    }))

    // 返回同时兼容 res.data（数组）和 res.data.list
    return c.json({
      code: 200,
      data: list,
      list: list,
      pagination: { page: 1, page_size: list.length, total: list.length }
    })
  } catch (error) {
    console.error('Get music error:', error)
    return c.json({
      code: 500,
      message: '服务器错误'
    }, 500)
  }
})

/**
 * GET /api/music/all
 * 获取所有音乐（管理员，带分页）
 */
musicRouter.get('/all', authMiddleware, adminMiddleware, async (c) => {
  const db = getDatabase(c.env)

  try {
    const page = parseInt(c.req.query('page') || '1')
    const pageSize = parseInt(c.req.query('pageSize') || '20')

    const total = await db.count('music', {})
    const offset = (page - 1) * pageSize

    const list = await db.select('music', {}, {
      order: { column: 'sort_order', ascending: true },
      offset,
      limit: pageSize
    })

    return c.json({
      code: 200,
      data: {
        list,
        pagination: { page, pageSize, total }
      }
    })
  } catch (error) {
    console.error('Get all music error:', error)
    return c.json({
      code: 500,
      message: '服务器错误',
      error: error.message
    }, 500)
  }
})

/**
 * 将 Uint8Array 高效转为 base64 字符串
 * 使用分块处理避免大文件 O(n²) 性能问题
 * @param {Uint8Array} bytes - 字节数组
 * @returns {string} base64 编码字符串
 */
function uint8ToBase64(bytes) {
  const CHUNK_SIZE = 0x8000 // 32KB 分块，防止栈溢出
  let binary = ''
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, i + CHUNK_SIZE)
    binary += String.fromCharCode.apply(null, chunk)
  }
  return btoa(binary)
}

/**
 * POST /api/music
 * 添加音乐
 * 支持两种请求方式：
 *   1. application/json: 直接传 url / cover_url
 *   2. multipart/form-data: 传文件字段，自动转为 base64 data URL
 */
musicRouter.post('/', authMiddleware, adminMiddleware, async (c) => {
  const db = getDatabase(c.env)
  const user = c.get('user')

  try {
    const contentType = c.req.header('Content-Type') || ''
    let title, artist, url, cover_url, lyric, sort_order

    // 兼容 JSON 请求和 multipart/form-data 上传
    if (contentType.includes('multipart/form-data')) {
      const formData = await c.req.raw.formData()
      title = formData.get('title')
      artist = formData.get('artist')
      url = formData.get('url')
      cover_url = formData.get('cover_url')
      lyric = formData.get('lyric')
      sort_order = parseInt(formData.get('sort_order')) || 0

      // 如果有文件字段，内联转 base64（复用 upload 降级方案）
      const file = formData.get('file')
      if (file && (file instanceof File || (file.type && file.arrayBuffer))) {
        const bytes = await file.arrayBuffer()
        const fileType = file.type || 'application/octet-stream'
        const base64 = uint8ToBase64(new Uint8Array(bytes))
        url = url || `data:${fileType};base64,${base64}`
      }
    } else {
      const body = await c.req.json()
      title = body.title
      artist = body.artist
      url = body.url
      cover_url = body.cover_url
      lyric = body.lyric
      sort_order = body.sort_order || 0
    }

    if (!title || !url) {
      return c.json({
        code: 400,
        message: '歌曲名和音乐链接不能为空'
      }, 400)
    }

    // 注意：music 表的 created_at 有默认值 NOW()，不需要手动指定
    const music = await db.insert('music', {
      title,
      artist: artist || '',
      url,
      cover_url: cover_url || '',
      lyric: lyric || '',
      sort_order
    })

    await db.safeInsertLog({
      user_id: user.userId,
      action: 'create',
      resource_type: 'music',
      resource_id: music.id,
      details: `添加音乐：${title}`,
      username: user.username
    })

    return c.json({
      code: 200,
      data: music,
      message: '添加成功'
    })
  } catch (error) {
    console.error('Create music error:', error)
    return c.json({
      code: 500,
      message: '服务器错误',
      error: error.message
    }, 500)
  }
})

/**
 * PUT /api/music/:id
 * 更新音乐
 */
musicRouter.put('/:id', authMiddleware, adminMiddleware, async (c) => {
  const db = getDatabase(c.env)
  const user = c.get('user')

  try {
    const id = parseInt(c.req.param('id'))
    const body = await c.req.json()
    const music = await db.findOne('music', { id })

    if (!music) {
      return c.json({
        code: 404,
        message: '音乐不存在'
      }, 404)
    }

    const allowedFields = ['title', 'artist', 'sort_order', 'url', 'cover_url', 'lyric']
    const updateData = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    const updated = await db.update('music', { id }, updateData)

    await db.safeInsertLog({
      user_id: user.userId,
      action: 'update',
      resource_type: 'music',
      resource_id: id,
      details: `更新音乐：${body.title || music.title}`,
      username: user.username
    })

    return c.json({
      code: 200,
      data: updated,
      message: '更新成功'
    })
  } catch (error) {
    console.error('Update music error:', error)
    return c.json({
      code: 500,
      message: '服务器错误'
    }, 500)
  }
})

/**
 * DELETE /api/music/:id
 * 删除音乐
 */
musicRouter.delete('/:id', authMiddleware, adminMiddleware, async (c) => {
  const db = getDatabase(c.env)
  const user = c.get('user')

  try {
    const id = parseInt(c.req.param('id'))
    const music = await db.findOne('music', { id })

    if (!music) {
      return c.json({
        code: 404,
        message: '音乐不存在'
      }, 404)
    }

    // 使用 update 方式删除（将 deleted_at 设置，实际为物理删除）
    // music 表没有软删除字段，直接物理删除
    const { error } = await db.supabase.from('music').delete().eq('id', id)
    if (error) throw error

    await db.safeInsertLog({
      user_id: user.userId,
      action: 'delete',
      resource_type: 'music',
      resource_id: id,
      details: `删除音乐：${music.title}`,
      username: user.username
    })

    return c.json({
      code: 200,
      message: '删除成功'
    })
  } catch (error) {
    console.error('Delete music error:', error)
    return c.json({
      code: 500,
      message: '服务器错误',
      error: error.message
    }, 500)
  }
})

export default musicRouter
