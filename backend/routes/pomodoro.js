/**
 * 番茄钟记录路由
 * 作用：提供番茄钟专注记录的增删查接口和统计接口
 *
 * 接口列表：
 * GET    /api/pomodoro         - 获取记录列表（支持 limit 参数）
 * POST   /api/pomodoro         - 新增记录
 * DELETE /api/pomodoro/:id     - 删除记录
 * GET    /api/pomodoro/stats   - 获取近7天统计
 */

const express = require('express')
const pool = require('../config/db')
const { authMiddleware } = require('../middleware/auth')

const router = express.Router()

// 所有接口都需要登录
router.use(authMiddleware)

/**
 * GET /api/pomodoro - 获取番茄钟记录列表
 * 查询参数：limit（可选，默认 50）
 * 注意：LIMIT 参数必须传字符串类型，否则 mysql2 会报 ER_WRONG_ARGUMENTS 错误
 */
router.get('/', async (req, res) => {
  try {
    const limit = String(parseInt(req.query.limit) || 50)
    const [rows] = await pool.execute(
      'SELECT * FROM pomodoro_sessions WHERE user_id = ? ORDER BY started_at DESC LIMIT ?',
      [req.user.id, limit]
    )
    res.json({ code: 200, data: rows })
  } catch (e) {
    console.error('获取番茄钟记录失败：', e)
    res.status(500).json({ code: 500, message: '服务器错误' })
  }
})

/**
 * POST /api/pomodoro - 新增番茄钟记录
 * 请求体：{ duration, task_name, completed }
 */
router.post('/', async (req, res) => {
  try {
    const { duration, task_name, completed } = req.body

    // 校验：时长不能小于 1 分钟
    if (!duration || duration < 1) {
      return res.status(400).json({ code: 400, message: '时长不能小于1分钟' })
    }

    const [result] = await pool.execute(
      `INSERT INTO pomodoro_sessions (duration, task_name, completed, user_id)
       VALUES (?, ?, ?, ?)`,
      [duration, task_name || null, completed !== undefined ? (completed ? 1 : 0) : 1, req.user.id]
    )

    res.json({ code: 200, message: '已保存', data: { id: result.insertId } })
  } catch (e) {
    console.error('新增番茄钟记录失败：', e)
    res.status(500).json({ code: 500, message: '服务器错误' })
  }
})

/**
 * DELETE /api/pomodoro/:id - 删除番茄钟记录
 */
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.execute(
      'DELETE FROM pomodoro_sessions WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    )

    if (!result.affectedRows) {
      return res.status(404).json({ code: 404, message: '记录不存在' })
    }

    res.json({ code: 200, message: '已删除' })
  } catch (e) {
    console.error('删除番茄钟记录失败：', e)
    res.status(500).json({ code: 500, message: '服务器错误' })
  }
})

/**
 * GET /api/pomodoro/stats - 获取近7天番茄钟统计
 * 返回：每天的总专注时长和会话数
 */
router.get('/stats', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT
         DATE(started_at) AS date,
         SUM(duration) AS total_duration,
         COUNT(*) AS session_count
       FROM pomodoro_sessions
       WHERE user_id = ? AND completed = 1
         AND started_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
       GROUP BY DATE(started_at)
       ORDER BY date ASC`,
      [req.user.id]
    )
    res.json({ code: 200, data: rows })
  } catch (e) {
    console.error('获取番茄钟统计失败：', e)
    res.status(500).json({ code: 500, message: '服务器错误' })
  }
})

module.exports = router
