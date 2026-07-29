/**
 * 仪表盘统计路由
 * 作用：提供综合统计数据接口，供前端仪表盘和数据统计页面使用
 *
 * GET /api/dashboard/stats
 * 返回数据：
 * - taskStats: { total, completed, in_progress, todo }
 * - articleStats: { total, published, total_views }
 * - todayFocus: { total_duration, session_count }
 * - taskTrend: [{ date, completed_count }]
 * - focusTrend: [{ date, total_duration }]
 * - upcomingTasks: [{ id, title, due_date, status, priority }]
 * - latestArticles: [{ id, title, summary, created_at }]
 */

const express = require('express')
const pool = require('../config/db')
const { authMiddleware } = require('../middleware/auth')

const router = express.Router()

// 所有接口都需要登录
router.use(authMiddleware)

/**
 * GET /api/dashboard/stats
 * 获取仪表盘综合统计数据
 * 聚合多个查询：任务统计、文章统计、今日专注、趋势数据、即将到期任务、最新文章
 */
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id

    // 1. 任务统计（总数、已完成、进行中、待办）
    const [taskStats] = await pool.execute(
      `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = '已完成' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN status = '进行中' THEN 1 ELSE 0 END) AS in_progress,
        SUM(CASE WHEN status = '待办' THEN 1 ELSE 0 END) AS todo
       FROM tasks WHERE user_id = ?`,
      [userId]
    )

    // 2. 文章统计（总数、总浏览量）
    const [articleStats] = await pool.execute(
      'SELECT COUNT(*) AS total, SUM(view_count) AS total_views FROM articles WHERE user_id = ?',
      [userId]
    )

    // 3. 今日专注统计（总时长、会话数）
    const [todayFocus] = await pool.execute(
      `SELECT SUM(duration) AS total_duration, COUNT(*) AS session_count
       FROM pomodoro_sessions
       WHERE user_id = ? AND completed = 1 AND DATE(started_at) = CURDATE()`,
      [userId]
    )

    // 4. 近7天任务完成趋势
    const [taskTrend] = await pool.execute(
      `SELECT DATE(updated_at) AS date, COUNT(*) AS completed_count
       FROM tasks
       WHERE user_id = ? AND status = '已完成' AND updated_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
       GROUP BY DATE(updated_at)
       ORDER BY date ASC`,
      [userId]
    )

    // 5. 近7天专注时长趋势
    const [focusTrend] = await pool.execute(
      `SELECT DATE(started_at) AS date, SUM(duration) AS total_duration
       FROM pomodoro_sessions
       WHERE user_id = ? AND completed = 1 AND started_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
       GROUP BY DATE(started_at)
       ORDER BY date ASC`,
      [userId]
    )

    // 6. 即将到期的任务（未完成、有截止日期、按截止日期升序，最多5条）
    const [upcomingTasks] = await pool.execute(
      `SELECT id, title, due_date, status, priority
       FROM tasks
       WHERE user_id = ? AND status != '已完成' AND due_date IS NOT NULL
       ORDER BY due_date ASC
       LIMIT 5`,
      [userId]
    )

    // 7. 最新发布的文章（最多3条）
    const [latestArticles] = await pool.execute(
      `SELECT id, title, summary, created_at
       FROM articles
       WHERE user_id = ? AND status = '已发布'
       ORDER BY created_at DESC
       LIMIT 3`,
      [userId]
    )

    res.json({
      code: 200,
      data: {
        taskStats: taskStats[0],
        articleStats: articleStats[0],
        todayFocus: todayFocus[0],
        taskTrend,
        focusTrend,
        upcomingTasks,
        latestArticles
      }
    })
  } catch (e) {
    console.error('获取仪表盘统计失败：', e)
    res.status(500).json({ code: 500, message: '服务器错误' })
  }
})

module.exports = router
