/**
 * 仪表盘统计路由
 * 作用：提供综合统计数据接口，供前端仪表盘和数据统计页面使用
 *
 * GET /api/dashboard/stats
 * 返回数据：
 * - articleStats: { total, published, draft, total_views }
 * - categoryCount: 分类总数
 * - tagCount: 标签总数
 * - commentCount: 评论总数
 * - viewTrend: [{ date, total_views }]  近7天浏览趋势
 * - latestArticles: [{ id, title, summary, created_at }]  最新文章
 */

const express = require('express')
const pool = require('../config/db')
const { authMiddleware } = require('../middleware/auth')

const router = express.Router()

// 所有接口都需要登录
router.use(authMiddleware)

/**
 * GET /api/dashboard/stats
 * 获取仪表盘综合统计数据（仅博客相关）
 */
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id

    // 1. 文章统计（总数、已发布、草稿、总浏览量）
    const [articleStats] = await pool.execute(
      `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = '已发布' THEN 1 ELSE 0 END) AS published,
        SUM(CASE WHEN status = '草稿' THEN 1 ELSE 0 END) AS draft,
        COALESCE(SUM(view_count), 0) AS total_views
       FROM articles WHERE user_id = ?`,
      [userId]
    )

    // 2. 分类总数（分类表无 user_id 字段，统计全部分类）
    const [categoryRows] = await pool.execute(
      'SELECT COUNT(*) AS count FROM categories'
    )

    // 3. 标签总数（标签表无 user_id 字段，统计全部标签）
    const [tagRows] = await pool.execute(
      'SELECT COUNT(*) AS count FROM tags'
    )

    // 4. 评论总数
    const [commentRows] = await pool.execute(
      `SELECT COUNT(*) AS count FROM comments c
       INNER JOIN articles a ON c.article_id = a.id
       WHERE a.user_id = ?`,
      [userId]
    )

    // 5. 近7天文章发布趋势（PostgreSQL 日期语法）
    const [publishTrend] = await pool.execute(
      `SELECT DATE(created_at) AS date, COUNT(*) AS count
       FROM articles
       WHERE user_id = ? AND created_at >= CURRENT_DATE - INTERVAL '6 days'
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [userId]
    )

    // 6. 最新发布的文章（最多5条）
    const [latestArticles] = await pool.execute(
      `SELECT id, title, summary, view_count, status, created_at
       FROM articles
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 5`,
      [userId]
    )

    // 将聚合计算结果转为数字类型
    const stats = articleStats[0]
    const trendWithNumber = publishTrend.map((t) => ({ ...t, count: Number(t.count) }))

    res.json({
      code: 200,
      data: {
        articleStats: {
          total: Number(stats.total),
          published: Number(stats.published),
          draft: Number(stats.draft),
          total_views: Number(stats.total_views)
        },
        categoryCount: Number(categoryRows[0].count),
        tagCount: Number(tagRows[0].count),
        commentCount: Number(commentRows[0].count),
        publishTrend: trendWithNumber,
        latestArticles
      }
    })
  } catch (e) {
    console.error('获取仪表盘统计失败：', e)
    res.status(500).json({ code: 500, message: '服务器错误' })
  }
})

module.exports = router
