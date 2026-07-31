/**
 * 文章路由模块 - 匹配前端 API 路径
 * 
 * 前端 API 路径：
 * - GET /api/articles/public - 获取文章列表
 * - GET /api/articles/public/:id - 获取文章详情
 * - GET /api/articles/public/latest - 获取最新文章
 * - GET /api/articles/public/hot - 获取热门文章
 * - GET /api/articles/public/category/:slug - 分类文章
 * - GET /api/articles/public/tag/:slug - 标签文章
 * - GET /api/articles/public/search - 搜索文章
 * - GET /api/articles/public/archives - 归档列表
 * - GET /api/articles/public/related/:id - 相关文章
 * 
 * 管理接口：
 * - GET /api/articles - 文章列表（含草稿）
 * - POST /api/articles - 创建文章
 * - GET /api/articles/:id - 文章详情
 * - PUT /api/articles/:id - 更新文章
 * - DELETE /api/articles/:id - 删除文章
 * - PUT /api/articles/:id/toggle-top - 切换置顶
 */

import { Hono } from 'hono'
import { getDatabase } from '../db.js'
import { authMiddleware, adminMiddleware, verifyToken } from '../auth.js'

const articlesRouter = new Hono()

// ==================== 公开接口 ====================

/**
 * GET /articles/public
 * 获取已发布文章列表
 */
articlesRouter.get('/public', async (c) => {
  const db = getDatabase(c.env)
  
  try {
    const page = parseInt(c.req.query('page') || '1')
    const pageSize = parseInt(c.req.query('page_size') || '10')
    const categoryId = c.req.query('category_id')
    const keyword = c.req.query('keyword')

    const filters = { status: '已发布', deleted_at: null }
    if (categoryId) filters.category_id = categoryId

    const total = await db.count('articles', filters)
    const offset = (page - 1) * pageSize

    let articles = await db.select('articles', filters, {
      order: { column: 'is_top', ascending: false },
      offset,
      limit: pageSize
    })

    if (keyword) {
      articles = articles.filter(a => 
        a.title.includes(keyword) || 
        (a.content && a.content.includes(keyword))
      )
    }

    // 获取分类名称
    const result = []
    for (const article of articles) {
      if (article.category_id) {
        const category = await db.findOne('categories', { id: article.category_id })
        article.category_name = category ? category.name : ''
      }
      result.push(article)
    }

    return c.json({
      code: 200,
      data: {
        list: result,
        pagination: {
          page,
          page_size: pageSize,
          total
        }
      }
    })
  } catch (error) {
    console.error('Get articles error:', error)
    return c.json({ code: 500, message: '服务器错误' }, 500)
  }
})

/**
 * GET /articles/public/hot
 * 获取热门文章
 */
articlesRouter.get('/public/hot', async (c) => {
  const db = getDatabase(c.env)
  
  try {
    const limit = parseInt(c.req.query('limit') || '5')
    const { data, error } = await db.supabase
      .from('articles')
      .select('id, title, summary, cover_image, view_count, like_count, created_at')
      .eq('status', '已发布')
      .eq('deleted_at', null)
      .order('view_count', { ascending: false })
      .limit(limit)

    return c.json({
      code: 200,
      data: data || []
    })
  } catch (error) {
    console.error('Get hot articles error:', error)
    return c.json({ code: 500, message: '服务器错误' }, 500)
  }
})

/**
 * GET /articles/public/latest
 * 获取最新文章
 */
articlesRouter.get('/public/latest', async (c) => {
  const db = getDatabase(c.env)
  
  try {
    const limit = parseInt(c.req.query('limit') || '5')
    const { data, error } = await db.supabase
      .from('articles')
      .select('id, title, summary, cover_image, created_at')
      .eq('status', '已发布')
      .eq('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit)

    return c.json({
      code: 200,
      data: data || []
    })
  } catch (error) {
    console.error('Get latest articles error:', error)
    return c.json({ code: 500, message: '服务器错误' }, 500)
  }
})

/**
 * GET /articles/public/category/:slug
 * 按分类获取文章
 */
articlesRouter.get('/public/category/:slug', async (c) => {
  const db = getDatabase(c.env)
  
  try {
    const slug = c.req.param('slug')
    const page = parseInt(c.req.query('page') || '1')
    const pageSize = parseInt(c.req.query('page_size') || '10')

    const category = await db.findOne('categories', { slug })
    if (!category) {
      return c.json({ code: 404, message: '分类不存在' }, 404)
    }

    const filters = { 
      status: '已发布', 
      deleted_at: null,
      category_id: category.id 
    }

    const total = await db.count('articles', filters)
    const offset = (page - 1) * pageSize

    const articles = await db.select('articles', filters, {
      order: { column: 'created_at', ascending: false },
      offset,
      limit: pageSize
    })

    return c.json({
      code: 200,
      data: {
        list: articles,
        category,
        pagination: { page, page_size: pageSize, total }
      }
    })
  } catch (error) {
    console.error('Get category articles error:', error)
    return c.json({ code: 500, message: '服务器错误' }, 500)
  }
})

/**
 * GET /articles/public/search
 * 搜索文章
 */
articlesRouter.get('/public/search', async (c) => {
  const db = getDatabase(c.env)
  
  try {
    const keyword = c.req.query('keyword') || ''
    const page = parseInt(c.req.query('page') || '1')
    const pageSize = parseInt(c.req.query('page_size') || '10')

    const filters = { status: '已发布', deleted_at: null }
    const allArticles = await db.select('articles', filters, {
      order: { column: 'created_at', ascending: false }
    })

    // 客户端搜索（简单实现）
    const results = allArticles.filter(a => 
      !keyword || 
      (a.title && a.title.includes(keyword)) ||
      (a.summary && a.summary.includes(keyword)) ||
      (a.content && a.content.includes(keyword))
    )

    const total = results.length
    const offset = (page - 1) * pageSize
    const pagedResults = results.slice(offset, offset + pageSize)

    return c.json({
      code: 200,
      data: {
        list: pagedResults,
        pagination: { page, page_size: pageSize, total }
      }
    })
  } catch (error) {
    console.error('Search articles error:', error)
    return c.json({ code: 500, message: '服务器错误' }, 500)
  }
})

/**
 * GET /articles/public/archives
 * 获取归档列表
 * 返回格式：[{ year, month, label, articles: [] }]（按年月倒序）
 * 与本地 backend articleService.getArchives() 输出格式保持一致
 */
articlesRouter.get('/public/archives', async (c) => {
  const db = getDatabase(c.env)
  
  try {
    const { data: articles, error } = await db.supabase
      .from('articles')
      .select('id, title, summary, created_at')
      .eq('status', '已发布')
      .eq('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Get archives supabase error:', error)
      return c.json({ code: 500, message: '服务器错误' }, 500)
    }

    /** 按年月分组的临时映射：key 为 "YYYY-MM" */
    const archivesMap = {}
    for (const article of (articles || [])) {
      const date = new Date(article.created_at)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const key = `${year}-${month}`

      // 初次遇到该年月时，初始化分组结构
      if (!archivesMap[key]) {
        archivesMap[key] = {
          year,
          month: parseInt(month, 10),
          label: `${year}年${parseInt(month, 10)}月`,
          articles: []
        }
      }
      archivesMap[key].articles.push(article)
    }

    /** 将映射转为数组并按年月倒序排序（年份优先，其次月份） */
    const archivesList = Object.values(archivesMap).sort(
      (a, b) => b.year - a.year || b.month - a.month
    )

    return c.json({
      code: 200,
      data: archivesList
    })
  } catch (error) {
    console.error('Get archives error:', error)
    return c.json({ code: 500, message: '服务器错误' }, 500)
  }
})

/**
 * GET /articles/public/tag/:slug
 * 按标签获取文章
 */
articlesRouter.get('/public/tag/:slug', async (c) => {
  const db = getDatabase(c.env)
  
  try {
    const slug = c.req.param('slug')
    const page = parseInt(c.req.query('page') || '1')
    const pageSize = parseInt(c.req.query('page_size') || '10')

    const tag = await db.findOne('tags', { slug })
    if (!tag) {
      return c.json({ code: 404, message: '标签不存在' }, 404)
    }

    const articleTags = await db.select('article_tags', { tag_id: tag.id })
    const articleIds = articleTags.map(t => t.article_id)

    if (articleIds.length === 0) {
      return c.json({
        code: 200,
        data: {
          list: [],
          tag,
          pagination: { page, page_size: pageSize, total: 0 }
        }
      })
    }

    const { data, error } = await db.supabase
      .from('articles')
      .select('*')
      .eq('status', '已发布')
      .eq('deleted_at', null)
      .in('id', articleIds)
      .order('created_at', { ascending: false })

    const allArticles = data || []
    const total = allArticles.length
    const offset = (page - 1) * pageSize
    const pagedArticles = allArticles.slice(offset, offset + pageSize)

    return c.json({
      code: 200,
      data: {
        list: pagedArticles,
        tag,
        pagination: { page, page_size: pageSize, total }
      }
    })
  } catch (error) {
    console.error('Get tag articles error:', error)
    return c.json({ code: 500, message: '服务器错误' }, 500)
  }
})

/**
 * GET /articles/public/related/:id
 * 获取相关文章
 */
articlesRouter.get('/public/related/:id', async (c) => {
  const db = getDatabase(c.env)
  
  try {
    const id = parseInt(c.req.param('id'))
    const limit = parseInt(c.req.query('limit') || '5')

    const article = await db.findOne('articles', { id })
    if (!article) {
      return c.json({ code: 404, message: '文章不存在' }, 404)
    }

    const filters = {
      status: '已发布',
      deleted_at: null
    }
    if (article.category_id) {
      filters.category_id = article.category_id
    }

    const { data, error } = await db.supabase
      .from('articles')
      .select('id, title, summary, cover_image, created_at')
      .eq('status', '已发布')
      .eq('deleted_at', null)
      .neq('id', id)
      .order('created_at', { ascending: false })
      .limit(limit)

    return c.json({
      code: 200,
      data: data || []
    })
  } catch (error) {
    console.error('Get related articles error:', error)
    return c.json({ code: 500, message: '服务器错误' }, 500)
  }
})

// ==================== 带参数的公开接口（必须在 /public/:id 之前） ====================

/**
 * GET /articles/public/:id
 * 获取文章详情
 */
articlesRouter.get('/public/:id', async (c) => {
  const db = getDatabase(c.env)
  
  try {
    const id = parseInt(c.req.param('id'))
    const article = await db.findOne('articles', { id })

    if (!article) {
      return c.json({ code: 404, message: '文章不存在' }, 404)
    }

    // 增加浏览量
    const newViewCount = (article.view_count || 0) + 1
    await db.supabase
      .from('articles')
      .update({ view_count: newViewCount })
      .eq('id', id)

    article.view_count = newViewCount

    // 获取标签
    const articleTags = await db.select('article_tags', { article_id: id })
    const tagIds = articleTags.map(t => t.tag_id)
    const tags = tagIds.length > 0 
      ? await db.supabase.from('tags').select('*').in('id', tagIds) 
      : { data: [] }

    // 获取分类
    if (article.category_id) {
      const category = await db.findOne('categories', { id: article.category_id })
      article.category = category
    }

    return c.json({
      code: 200,
      data: {
        ...article,
        tags: tags.data || []
      }
    })
  } catch (error) {
    console.error('Get article detail error:', error)
    return c.json({ code: 500, message: '服务器错误' }, 500)
  }
})

// ==================== 管理接口 ====================

/**
 * GET /articles
 * 管理端文章列表
 */
articlesRouter.get('/', authMiddleware, adminMiddleware, async (c) => {
  const db = getDatabase(c.env)
  
  try {
    const page = parseInt(c.req.query('page') || '1')
    const pageSize = parseInt(c.req.query('page_size') || '10')
    const status = c.req.query('status')
    const keyword = c.req.query('keyword')

    const filters = { deleted_at: null }
    if (status) filters.status = status

    const total = await db.count('articles', filters)
    const offset = (page - 1) * pageSize

    let articles = await db.select('articles', filters, {
      order: { column: 'created_at', ascending: false },
      offset,
      limit: pageSize
    })

    if (keyword) {
      articles = articles.filter(a => a.title.includes(keyword))
    }

    return c.json({
      code: 200,
      data: {
        list: articles,
        pagination: { page, page_size: pageSize, total }
      }
    })
  } catch (error) {
    console.error('Get articles (admin) error:', error)
    return c.json({ code: 500, message: '服务器错误' }, 500)
  }
})

/**
 * POST /articles
 * 创建文章
 */
articlesRouter.post('/', authMiddleware, adminMiddleware, async (c) => {
  const db = getDatabase(c.env)
  const user = c.get('user')

  try {
    const body = await c.req.json()
    const { title, content, summary, category_id, tag_ids, status = '草稿', is_top = false, cover_image } = body

    if (!title) {
      return c.json({ code: 400, message: '标题不能为空' }, 400)
    }

    const article = await db.insert('articles', {
      title,
      content: content || '',
      summary: summary || '',
      cover_image: cover_image || '',
      category_id: category_id || null,
      user_id: user.userId,
      status,
      is_top: is_top ? 1 : 0,
      view_count: 0,
      like_count: 0,
      created_at: new Date().toISOString()
    })

    if (tag_ids && tag_ids.length > 0) {
      for (const tagId of tag_ids) {
        await db.insert('article_tags', {
          article_id: article.id,
          tag_id: tagId
        })
      }
    }

    // 记录操作日志（捕获异常避免阻断主流程）
    try {
      await db.safeInsertLog({
        user_id: user.userId,
        action: 'create',
        resource_type: 'article',
        resource_id: article.id,
        details: `创建文章：${title}`,
        username: user.username
      })
    } catch (_) {}

    return c.json({ code: 200, data: article, message: '创建成功' })
  } catch (error) {
    console.error('Create article error:', error)
    return c.json({ code: 500, message: '服务器错误' }, 500)
  }
})

/**
 * GET /articles/:id
 * 管理端文章详情
 */
articlesRouter.get('/:id', authMiddleware, adminMiddleware, async (c) => {
  const db = getDatabase(c.env)
  
  try {
    const id = parseInt(c.req.param('id'))
    const article = await db.findOne('articles', { id })

    if (!article) {
      return c.json({ code: 404, message: '文章不存在' }, 404)
    }

    const articleTags = await db.select('article_tags', { article_id: id })
    const tagIds = articleTags.map(t => t.tag_id)

    return c.json({
      code: 200,
      data: { ...article, tag_ids: tagIds }
    })
  } catch (error) {
    console.error('Get article (admin) error:', error)
    return c.json({ code: 500, message: '服务器错误' }, 500)
  }
})

/**
 * PUT /articles/:id
 * 更新文章
 */
articlesRouter.put('/:id', authMiddleware, adminMiddleware, async (c) => {
  const db = getDatabase(c.env)
  const user = c.get('user')

  try {
    const id = parseInt(c.req.param('id'))
    const body = await c.req.json()
    const article = await db.findOne('articles', { id })

    if (!article) {
      return c.json({ code: 404, message: '文章不存在' }, 404)
    }

    const updateData = { updated_at: new Date().toISOString() }
    const allowedFields = ['title', 'content', 'summary', 'category_id', 'status', 'cover_image']
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }
    if (body.is_top !== undefined) {
      updateData.is_top = body.is_top ? 1 : 0
    }

    const updated = await db.update('articles', { id }, updateData)

    if (body.tag_ids !== undefined) {
      await db.supabase.from('article_tags').delete().eq('article_id', id)
      for (const tagId of body.tag_ids) {
        await db.insert('article_tags', { article_id: id, tag_id: tagId })
      }
    }

    return c.json({ code: 200, data: updated, message: '更新成功' })
  } catch (error) {
    console.error('Update article error:', error)
    return c.json({ code: 500, message: '服务器错误' }, 500)
  }
})

/**
 * DELETE /articles/:id
 * 删除文章（软删除）
 */
articlesRouter.delete('/:id', authMiddleware, adminMiddleware, async (c) => {
  const db = getDatabase(c.env)
  const user = c.get('user')

  try {
    const id = parseInt(c.req.param('id'))
    const article = await db.findOne('articles', { id })

    if (!article) {
      return c.json({ code: 404, message: '文章不存在' }, 404)
    }

    await db.update('articles', { id }, { deleted_at: new Date().toISOString() })

    // 记录操作日志（捕获异常避免阻断主流程）
    try {
      await db.safeInsertLog({
        user_id: user.userId,
        action: 'delete',
        resource_type: 'article',
        resource_id: id,
        details: `删除文章：${article.title}`,
        username: user.username
      })
    } catch (_) {}

    return c.json({ code: 200, message: '删除成功' })
  } catch (error) {
    console.error('Delete article error:', error)
    return c.json({ code: 500, message: '服务器错误' }, 500)
  }
})

/**
 * PUT /articles/:id/toggle-top
 * 切换文章置顶
 */
articlesRouter.put('/:id/toggle-top', authMiddleware, adminMiddleware, async (c) => {
  const db = getDatabase(c.env)
  
  try {
    const id = parseInt(c.req.param('id'))
    const article = await db.findOne('articles', { id })

    if (!article) {
      return c.json({ code: 404, message: '文章不存在' }, 404)
    }

    const newTop = article.is_top ? 0 : 1
    await db.update('articles', { id }, { is_top: newTop, updated_at: new Date().toISOString() })

    return c.json({
      code: 200,
      data: { is_top: newTop },
      message: newTop ? '已置顶' : '已取消置顶'
    })
  } catch (error) {
    console.error('Toggle top error:', error)
    return c.json({ code: 500, message: '服务器错误' }, 500)
  }
})

/**
 * GET /articles/:id/export
 * 导出文章为 Markdown 或 HTML
 */
articlesRouter.get('/:id/export', authMiddleware, adminMiddleware, async (c) => {
  const db = getDatabase(c.env)

  try {
    const id = parseInt(c.req.param('id'))
    const format = c.req.query('format') || 'markdown'
    const article = await db.findOne('articles', { id })
    if (!article) {
      return c.json({ code: 404, message: '文章不存在' }, 404)
    }

    if (format === 'html') {
      const content = `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"><title>${article.title}</title></head>
<body><h1>${article.title}</h1>${article.summary ? `<blockquote>${article.summary}</blockquote>` : ''}
<div>${article.content || ''}</div></body></html>`
      const fileName = encodeURIComponent(`${article.title}.html`)
      return c.body(content, 200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename*=UTF-8''${fileName}`
      })
    } else {
      // 默认 markdown
      const md = `# ${article.title}\n\n${article.summary ? `> ${article.summary}\n\n` : ''}${article.content || ''}`
      const fileName = encodeURIComponent(`${article.title}.md`)
      return c.body(md, 200, {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename*=UTF-8''${fileName}`
      })
    }
  } catch (error) {
    console.error('Export article error:', error)
    return c.json({ code: 500, message: '服务器错误' }, 500)
  }
})

export default articlesRouter
