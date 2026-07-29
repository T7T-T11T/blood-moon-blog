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

    // 2. 分类总数
    const [categoryRows] = await pool.execute(
      'SELECT COUNT(*) AS count FROM categories WHERE user_id = ?',
      [userId]
    )

    // 3. 标签总数
    const [tagRows] = await pool.execute(
      'SELECT COUNT(*) AS count FROM tags WHERE user_id = ?',
      [userId]
    )

    // 4. 评论总数
    const [commentRows] = await pool.execute(
      `SELECT COUNT(*) AS count FROM comments c
       INNER JOIN articles a ON c.article_id = a.id
       WHERE a.user_id = ?`,
      [userId]
    )

    // 5. 近7天文章发布趋势
    const [publishTrend] = await pool.execute(
      `SELECT DATE(created_at) AS date, COUNT(*) AS count
       FROM articles
       WHERE user_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
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

    res.json({
      code: 200,
      data: {
        articleStats: articleStats[0],
        categoryCount: categoryRows[0].count,
        tagCount: tagRows[0].count,
        commentCount: commentRows[0].count,
        publishTrend,
        latestArticles
      }
    })
  } catch (e) {
    console.error('获取仪表盘统计失败：', e)
    res.status(500).json({ code: 500, message: '服务器错误' })
  }
})

module.exports = router
