/**
 * 评论路由模块
 *
 * 功能：
 * - GET /comments/:articleId - 获取文章评论列表
 * - POST /comments/:articleId - 创建评论
 * - DELETE /comments/:id - 删除评论
 */

import { Hono } from 'hono'
import { getDatabase } from '../db.js'
import { authMiddleware, adminMiddleware, getClientIp, verifyToken } from '../auth.js'

const commentsRouter = new Hono()

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

async function checkCommentRateLimit(c, ip) {
  const now = Date.now()
  const kv = c.env.RATE_LIMIT_KV

  // 无 KV 绑定（本地开发等）：回退到内存 Map
  if (!kv) {
    const records = (rateLimitMap.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW)
    if (records.length >= RATE_LIMIT_MAX) {
      rateLimitMap.set(ip, records)
      return false
    }
    records.push(now)
    rateLimitMap.set(ip, records)
    return true
  }

  // KV 跨节点计数（10 分钟窗口，最多 5 条）
  try {
    const key = `comment-${ip}`
    const raw = await kv.get(key)
    const records = (raw ? JSON.parse(raw) : []).filter((t) => now - t < RATE_LIMIT_WINDOW)
    if (records.length >= RATE_LIMIT_MAX) {
      await kv.put(key, JSON.stringify(records), { expirationTtl: 600 })
      return false
    }
    records.push(now)
    await kv.put(key, JSON.stringify(records), { expirationTtl: 600 })
    return true
  } catch {
    // KV 异常时放行，避免误伤正常用户
    return true
  }
}

/**
 * GET /comments - 管理端获取评论列表（支持分页）
 * 查询参数：article_id, page, page_size
 * 说明：使用原生 Supabase 查询以支持 JOIN articles 表获取文章标题
 */
commentsRouter.get('/', authMiddleware, adminMiddleware, async (c) => {
  const db = getDatabase(c.env)

  try {
    const page = parseInt(c.req.query('page') || '1')
    const pageSize = parseInt(c.req.query('page_size') || '10')
    const articleId = c.req.query('article_id')

    // 构建过滤条件
    let query = db.supabase
      .from('comments')
      .select('id, article_id, nickname, email, avatar_url, content, parent_id, status, ip_address, created_at, articles!inner(title)', { count: 'exact' })

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
    const page = parseInt(c.req.query('page') || '1')
    const pageSize = parseInt(c.req.query('pageSize') || '20')
    const offset = (page - 1) * pageSize

    // 新评论直接展示；保留历史明确拒绝的隐藏记录，避免误恢复已处理的垃圾评论。
    const { data: comments, count: total, error } = await db.supabase
      .from('comments')
      .select('id, article_id, nickname, avatar_url, content, parent_id, created_at', { count: 'exact' })
      .eq('article_id', articleId)
      .or('status.is.null,status.neq.已拒绝')
      .order('created_at', { ascending: true })
      .range(offset, offset + pageSize - 1)

    if (error) throw error

    return c.json({
      code: 200,
      data: {
        list: comments || [],
        pagination: {
          page,
          pageSize,
          total: total || 0
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
    if (!(await checkCommentRateLimit(c, clientIp))) {
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

    const comment = await db.insert('comments', {
      article_id: articleId,
      nickname: nick,
      email: email || '',
      avatar_url: avatar,
      content: contentText,
      parent_id: parent_id ? parseInt(parent_id) : null,
      status: '已通过',
      ip_address: clientIp,
      created_at: new Date().toISOString()
    })

    return c.json({
      code: 200,
      data: { id: comment.id, article_id: comment.article_id, nickname: comment.nickname, avatar_url: comment.avatar_url, content: comment.content, parent_id: comment.parent_id, created_at: comment.created_at },
      message: '评论成功'
    })
  } catch (error) {
    console.error('Create comment error:', error)
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
