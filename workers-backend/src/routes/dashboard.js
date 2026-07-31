/**
 * 仪表盘统计路由模块
 * 
 * 功能：
 * - GET /api/dashboard/stats - 获取仪表盘统计数据（需管理员）
 * 
 * 返回数据包括：
 * - 文章总数
 * - 分类总数
 * - 标签总数
 * - 评论总数
 * - 友链数量
 * - 最近7天访问趋势
 * - 热门文章 Top 10
 */

import { Hono } from 'hono'
import { getDatabase } from '../db.js'
import { authMiddleware, adminMiddleware } from '../auth.js'

const dashboardRouter = new Hono()

/**
 * GET /api/dashboard/stats
 * 获取仪表盘统计数据
 */
dashboardRouter.get('/stats', authMiddleware, adminMiddleware, async (c) => {
  const db = getDatabase(c.env)
  
  try {
    // 基础统计（中文 status 枚举值）
    const [
      articleCount,
      categoryCount,
      tagCount,
      commentCount,
      friendCount,
      publishedCount,
      draftCount,
      totalViews
    ] = await Promise.all([
      db.count('articles', { deleted_at: null }),
      db.count('categories'),
      db.count('tags'),
      db.count('comments', { status: '已通过' }),
      db.count('friends', { status: '已通过' }),
      db.count('articles', { status: '已发布', deleted_at: null }),
      db.count('articles', { status: '草稿', deleted_at: null }),
      getTotalViews(db)
    ])

    // 最新文章
    const latestArticles = await db.supabase
      .from('articles')
      .select('id, title, view_count, created_at, status')
      .eq('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(5)

    // 获取热门文章
    const hotArticles = await db.supabase
      .from('articles')
      .select('id, title, view_count, like_count, created_at')
      .eq('deleted_at', null)
      .order('view_count', { ascending: false })
      .limit(10)

    return c.json({
      code: 200,
      data: {
        // 兼容前端 Dashboard.vue 数据结构
        articleStats: {
          total: articleCount,
          total_views: totalViews,
          published: publishedCount,
          drafts: draftCount
        },
        categoryCount,
        tagCount,
        commentCount,
        friendCount,
        latestArticles: latestArticles.data || [],
        overview: {
          articles: articleCount,
          published: publishedCount,
          drafts: draftCount,
          categories: categoryCount,
          tags: tagCount,
          comments: commentCount,
          friends: friendCount,
          totalViews
        },
        hotArticles: hotArticles.data || []
      }
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return c.json({
      code: 500,
      message: '服务器错误'
    }, 500)
  }
})

/**
 * 计算总浏览量
 * @param {import('../db.js').Database} db 
 * @returns {Promise<number>}
 */
async function getTotalViews(db) {
  const { data, error } = await db.supabase
    .from('articles')
    .select('view_count', { count: 'exact', sum: 'view_count' })
    .eq('deleted_at', null)
  
  if (error) return 0
  
  // 使用 SUM 聚合
  const { data: sumData } = await db.supabase
    .from('articles')
    .select('view_count')
    .eq('deleted_at', null)
  
  if (!sumData) return 0
  return sumData.reduce((sum, item) => sum + (item.view_count || 0), 0)
}

/**
 * GET /api/dashboard/recent-articles
 * 获取最近的文章列表（管理端用）
 */
dashboardRouter.get('/recent-articles', authMiddleware, adminMiddleware, async (c) => {
  const db = getDatabase(c.env)
  
  try {
    const page = parseInt(c.req.query('page') || '1')
    const pageSize = parseInt(c.req.query('pageSize') || '10')
    
    const filters = {}
    const status = c.req.query('status')
    if (status) filters.status = status

    const total = await db.count('articles', { ...filters, deleted_at: null })
    const offset = (page - 1) * pageSize

    const articles = await db.supabase
      .from('articles')
      .select('*, categories(name)')
      .eq('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    return c.json({
      code: 200,
      data: {
        list: articles.data || [],
        pagination: {
          page,
          pageSize,
          total
        }
      }
    })
  } catch (error) {
    console.error('Get recent articles error:', error)
    return c.json({
      code: 500,
      message: '服务器错误'
    }, 500)
  }
})

export default dashboardRouter
