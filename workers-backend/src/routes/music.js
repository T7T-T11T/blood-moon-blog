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
      select: 'id,title,artist,cover_url,lyric,sort_order,created_at',
      order: { column: 'sort_order', ascending: true }
    })
    const origin = new URL(c.req.url).origin

    // 统一歌词字段，返回 { list, ... } 结构
    const list = (music || []).map(m => ({
      id: m.id,
      title: m.title,
      artist: m.artist || null,
      cover: m.cover_url || null,
      url: `${origin}/api/music/${m.id}/audio`,
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
      select: 'id,title,artist,cover_url,lyric,sort_order,created_at',
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

/** 将旧的 data URL 音频按需转换为支持 Range 的媒体响应。 */
export function createMusicAudioResponse(source, rangeHeader = '') {
  if (/^https?:\/\//i.test(source)) return Response.redirect(source, 302)

  const match = /^data:([^;,]+);base64,([\s\S]+)$/.exec(source)
  if (!match) return new Response('音乐地址无效', { status: 404 })

  const binary = atob(match[2])
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)

  const headers = {
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=3600',
    'Content-Type': match[1]
  }

  if (!rangeHeader) {
    headers['Content-Length'] = String(bytes.byteLength)
    return new Response(bytes, { headers })
  }

  const range = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader)
  if (!range || (!range[1] && !range[2])) {
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${bytes.byteLength}` } })
  }

  const requestedLength = Number(range[2])
  const start = range[1]
    ? Number(range[1])
    : Math.max(bytes.byteLength - requestedLength, 0)
  const end = range[1]
    ? Math.min(range[2] ? Number(range[2]) : bytes.byteLength - 1, bytes.byteLength - 1)
    : bytes.byteLength - 1

  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || start > end || start >= bytes.byteLength) {
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${bytes.byteLength}` } })
  }

  const chunk = bytes.slice(start, end + 1)
  headers['Content-Length'] = String(chunk.byteLength)
  headers['Content-Range'] = `bytes ${start}-${end}/${bytes.byteLength}`
  return new Response(chunk, { status: 206, headers })
}

/**
 * GET /api/music/:id/audio
 * 旧 Base64 音频按单曲加载；新存储 URL 直接跳转到媒体存储。
 */
musicRouter.get('/:id/audio', async (c) => {
  const db = getDatabase(c.env)
  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id) || id <= 0) {
    return c.json({ code: 400, message: '音乐 ID 无效' }, 400)
  }

  const [music] = await db.select('music', { id }, {
    select: 'url',
    limit: 1
  })

  if (!music?.url) return c.json({ code: 404, message: '音乐不存在' }, 404)
  return createMusicAudioResponse(music.url, c.req.header('Range'))
})

/**
 * POST /api/music
 * 添加音乐
 * 音频文件先通过 /api/upload/audio 保存，再把公开 URL 写入音乐表。
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

      const file = formData.get('file')
      if (file && (file instanceof File || (file.type && file.arrayBuffer))) {
        return c.json({
          code: 400,
          message: '请先通过 /api/upload/audio 上传文件，再提交音乐 URL'
        }, 400)
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
    const [music] = await db.select('music', { id }, { select: 'id,title', limit: 1 })

    if (!music) {
      return c.json({
        code: 404,
        message: '音乐不存在'
      }, 404)
    }

    const allowedFields = ['title', 'artist', 'sort_order', 'url', 'cover_url', 'lyric', 'status']
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
    const [music] = await db.select('music', { id }, { select: 'id,title', limit: 1 })

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
