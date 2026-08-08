/**
 * 评论路由模块
 *
 * 功能：
 * - GET /comments/stats - 获取评论统计
 * - GET /comments/:articleId - 获取评论列表（支持状态筛选）
 * - POST /comments/:articleId - 创建评论
 * - PUT /comments/:id/status - 更新评论状态
 * - DELETE /comments/:id - 删除评论
 */

import { Hono } from 'hono'
import { getDatabase } from '../db.js'
import { authMiddleware, adminMiddleware, getClientIp, verifyToken } from '../auth.js'

const commentsRouter = new Hono()

const STATUS_MAP = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已拒绝'
}

const REVERSE_STATUS_MAP = {
  '待审核': 'pending',
  '已通过': 'approved',
  '已拒绝': 'rejected'
}

const ALLOWED_STATUSES = ['待审核', '已通过', '已拒绝']
// ===== 防垃圾评论：关键词过滤 + 限流 + 长度校验 =====
const COMMENT_MAX_LENGTH = 2000
const NICKNAME_MAX_LENGTH = 30
const SPAM_KEYWORDS = [
  '加微信', '加v信', '代开发票', '开发票', '刷单', '兼职', '博彩', '彩票', '赌博',
  '贷款', '网贷', '小姐', '约炮', '色情', '裸聊', '理财推荐', '股票推荐', '稳赚',
  'a货', '高仿', '外挂', '私服', '低价出售', '担保交易'
]
const RATE_LIMIT_WINDOW = 10 * 60 * 1000
const RATE_LIMIT_MAX = 5
const rateLimitMap = new Map()

function isSpamComment(text) {
  const lower = String(text || '').toLowerCase()
  return SPAM_KEYWORDS.some((kw) => lower.includes(kw))
}

function checkCommentRateLimit(ip) {
  const now = Date.now()
  const records = (rateLimitMap.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW)
  if (records.length >= RATE_LIMIT_MAX) {
    rateLimitMap.set(ip, records)
    return false
  }
  records.push(now)
  rateLimitMap.set(ip, records)
  return true
}

commentsRouter.get('/stats', authMiddleware, adminMiddleware, async (c) => {
  const db = getDatabase(c.env)

  try {
    const [pending, approved, rejected] = await Promise.all([
      db.count('comments', { status: '待审核' }),
      db.count('comments', { status: '已通过' }),
      db.count('comments', { status: '已拒绝' })
    ])

    return c.json({
      code: 200,
      data: { pending, approved, rejected }
    })
  } catch (error) {
    console.error('Get comment stats error:', error)
    return c.json({
      code: 500,
      message: '服务器错误'
    }, 500)
  }
})

/**
 * GET /comments - 管理端获取评论列表（支持分页和状态筛选）
 * 查询参数：status, article_id, page, page_size
 * 说明：使用原生 Supabase 查询以支持 JOIN articles 表获取文章标题
 */
commentsRouter.get('/', authMiddleware, adminMiddleware, async (c) => {
  const db = getDatabase(c.env)

  try {
    const page = parseInt(c.req.query('page') || '1')
    const pageSize = parseInt(c.req.query('page_size') || '10')
    const status = c.req.query('status')
    const articleId = c.req.query('article_id')

    // 构建过滤条件
    let query = db.supabase
      .from('comments')
      .select('id, article_id, nickname, email, avatar_url, content, parent_id, status, ip_address, created_at, articles!inner(title)', { count: 'exact' })

    if (status) query = query.eq('status', status)
    if (articleId) query = query.eq('article_id', articleId)

    const offset = (page - 1) * pageSize
    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (error) throw error

    // 转换结果：将 articles 嵌套对象拍平为 article_title 字段
    const list = (data || []).map(comment => ({
      ...comment,
      article_title: comment.articles?.title || null,
      articles: undefined
    }))

    return c.json({
      code: 200,
      data: {
        list,
        pagination: { page, page_size: pageSize, total: count || 0 }
      }
    })
  } catch (error) {
    console.error('Get comment list error:', error)
    return c.json({ code: 500, message: '服务器错误' }, 500)
  }
})

commentsRouter.get('/:articleId', async (c) => {
  const db = getDatabase(c.env)

  try {
    const articleId = c.req.param('articleId')
    const status = c.req.query('status') || '已通过'
    const page = parseInt(c.req.query('page') || '1')
    const pageSize = parseInt(c.req.query('pageSize') || '20')

    const filters = { status }
    if (articleId) filters.article_id = articleId

    const total = await db.count('comments', filters)
    const offset = (page - 1) * pageSize

    const comments = await db.select('comments', filters, {
      order: { column: 'created_at', ascending: false },
      offset,
      limit: pageSize
    })

    return c.json({
      code: 200,
      data: {
        list: comments,
        pagination: {
          page,
          pageSize,
          total
        }
      }
    })
  } catch (error) {
    console.error('Get comments error:', error)
    return c.json({
      code: 500,
      message: '服务器错误'
    }, 500)
  }
})

commentsRouter.post('/:articleId', async (c) => {
  const db = getDatabase(c.env)

  try {
    const articleId = parseInt(c.req.param('articleId'))
    const body = await c.req.json()
    const { content, nickname, email, avatar_url, parent_id } = body

    const contentText = String(content || '').trim()
    const nickText = String(nickname || '').trim()

    if (!articleId || !contentText) {
      return c.json({
        code: 400,
        message: '文章ID和评论内容不能为空'
      }, 400)
    }
    if (contentText.length > COMMENT_MAX_LENGTH) {
      return c.json({ code: 400, message: `评论内容不能超过 ${COMMENT_MAX_LENGTH} 字` }, 400)
    }
    if (nickText.length > NICKNAME_MAX_LENGTH) {
      return c.json({ code: 400, message: '昵称不能超过 30 个字符' }, 400)
    }
    if (isSpamComment(contentText) || isSpamComment(nickText)) {
      return c.json({ code: 400, message: '评论内容包含不当词汇' }, 400)
    }
    const clientIp = getClientIp(c)
    if (!checkCommentRateLimit(clientIp)) {
      return c.json({ code: 429, message: '评论过于频繁，请稍后再试' }, 429)
    }

    const article = await db.findOne('articles', { id: articleId })
    if (!article) {
      return c.json({
        code: 404,
        message: '文章不存在'
      }, 404)
    }

    const authHeader = c.req.header('Authorization')
    let userId = null
    /** 最终使用的昵称：优先使用前端传入值；若为空，则区分是否登录（登录用户兜底用数据库里的 username，未登录兜底用 '访客'） */
    let nick = ''
    let avatar = avatar_url || ''

    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const payload = await verifyToken(authHeader.split(' ')[1], c.env.JWT_SECRET)
        if (payload) {
          userId = payload.userId
          const user = await db.findOne('users', { id: userId })
          if (user) {
            // 已登录用户：允许使用自己填的昵称；没填才用 users.username 兜底
            nick = (nickname && nickname.trim()) ? nickname.trim() : user.username
            avatar = user.avatar_url || avatar || ''
          }
        }
      } catch {}
    }

    // 未登录或 token 校验失败：前端填了昵称就用，没填就 '访客'
    if (!nick) {
      nick = (nickname && nickname.trim()) ? nickname.trim() : '访客'
    }

    // 读取站点设置：开启评论审核时，新评论进入待审核
    let commentStatus = '已通过'
    try {
      const settingRows = await db.select('site_settings', {}, {
        order: { column: 'setting_key', ascending: true }
      })
      const settingMap = {}
      for (const row of settingRows) settingMap[row.setting_key] = row.setting_value
      if (settingMap.comments_moderation === 'true') commentStatus = '待审核'
    } catch (_) {}

    const comment = await db.insert('comments', {
      article_id: articleId,
      nickname: nick,
      email: email || '',
      avatar_url: avatar,
      content: contentText,
      parent_id: parent_id ? parseInt(parent_id) : null,
      status: commentStatus,
      ip_address: clientIp,
      created_at: new Date().toISOString()
    })

    return c.json({
      code: 200,
      data: { ...comment, moderated: commentStatus === '待审核' },
      message: commentStatus === '待审核' ? '评论已提交，审核通过后展示' : '评论成功'
    })
  } catch (error) {
    console.error('Create comment error:', error)
    return c.json({
      code: 500,
      message: '服务器错误: ' + error.message,
      detail: error.details || error.stack || String(error)
    }, 500)
  }
})

commentsRouter.put('/:id/status', authMiddleware, adminMiddleware, async (c) => {
  const db = getDatabase(c.env)
  const user = c.get('user')

  try {
    const id = parseInt(c.req.param('id'))
    const body = await c.req.json()
    const comment = await db.findOne('comments', { id })

    if (!comment) {
      return c.json({
        code: 404,
        message: '评论不存在'
      }, 404)
    }

    if (body.status && !ALLOWED_STATUSES.includes(body.status)) {
      return c.json({
        code: 400,
        message: `状态必须是: ${ALLOWED_STATUSES.join(', ')}`
      }, 400)
    }

    const updateData = {}
    if (body.status) updateData.status = body.status

    const updated = await db.update('comments', { id }, updateData)

    await db.safeInsertLog({
      user_id: user.userId,
      action: 'update',
      resource_type: 'comment',
      resource_id: id,
      details: `更新评论状态为：${body.status}`,
      username: user.username
    })

    return c.json({
      code: 200,
      data: updated,
      message: '更新成功'
    })
  } catch (error) {
    console.error('Update comment status error:', error)
    return c.json({
      code: 500,
      message: '服务器错误'
    }, 500)
  }
})

commentsRouter.delete('/:id', authMiddleware, adminMiddleware, async (c) => {
  const db = getDatabase(c.env)
  const user = c.get('user')

  try {
    const id = parseInt(c.req.param('id'))
    const comment = await db.findOne('comments', { id })

    if (!comment) {
      return c.json({
        code: 404,
        message: '评论不存在'
      }, 404)
    }

    await db.supabase.from('comments').delete().eq('parent_id', id)
    await db.supabase.from('comments').delete().eq('id', id)

    await db.safeInsertLog({
      user_id: user.userId,
      action: 'delete',
      resource_type: 'comment',
      resource_id: id,
      details: `删除评论`,
      username: user.username
    })

    return c.json({
      code: 200,
      message: '删除成功'
    })
  } catch (error) {
    console.error('Delete comment error:', error)
    return c.json({
      code: 500,
      message: '服务器错误'
    }, 500)
  }
})

export default commentsRouter
