/**
 * 访问统计路由
 * 作用：记录页面访问（PV/UV），提供统计数据查询
 *
 * 接口列表：
 * POST /api/visits           - 记录一次页面访问（公开）
 * GET  /api/visits/stats     - 获取访问统计（管理端，需登录）
 */

const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/visits
 * 记录一次页面访问
 * 请求体：{ page_path, referrer }
 */
router.post('/', async (req, res) => {
  try {
    const { page_path, referrer } = req.body;
    const visitorIp = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || '';

    if (!page_path) {
      return res.status(400).json({ code: 400, message: 'page_path 不能为空' });
    }

    await pool.execute(
      `INSERT INTO site_visits (page_path, visitor_ip, user_agent, referrer, visit_time)
       VALUES (?, ?, ?, ?, NOW())`,
      [page_path, visitorIp, userAgent, referrer || null]
    );

    res.json({ code: 200, message: 'ok' });
  } catch (e) {
    // 记录失败不阻塞前端，静默处理
    console.error('记录访问失败：', e);
    res.json({ code: 200, message: 'ok' });
  }
});

/**
 * GET /api/visits/stats
 * 获取访问统计（今日 PV/UV、总 PV/UV）
 * 需要登录
 */
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    // 今日 PV
    const [[{ today_pv }]] = await pool.execute(
      `SELECT COUNT(*) AS today_pv FROM site_visits
       WHERE DATE(visit_time) = CURDATE()`
    );

    // 今日 UV（去重 IP）
    const [[{ today_uv }]] = await pool.execute(
      `SELECT COUNT(DISTINCT visitor_ip) AS today_uv FROM site_visits
       WHERE DATE(visit_time) = CURDATE()`
    );

    // 总 PV
    const [[{ total_pv }]] = await pool.execute(
      'SELECT COUNT(*) AS total_pv FROM site_visits'
    );

    // 总 UV（去重 IP）
    const [[{ total_uv }]] = await pool.execute(
      'SELECT COUNT(DISTINCT visitor_ip) AS total_uv FROM site_visits'
    );

    // 近 7 天每日 PV
    const [dailyPv] = await pool.execute(
      `SELECT DATE(visit_time) AS date, COUNT(*) AS pv
       FROM site_visits
       WHERE visit_time >= CURRENT_DATE - INTERVAL '6 days'
       GROUP BY DATE(visit_time)
       ORDER BY date ASC`
    );

    // 热门页面 TOP 10
    const [topPages] = await pool.execute(
      `SELECT page_path, COUNT(*) AS pv
       FROM site_visits
       GROUP BY page_path
       ORDER BY pv DESC
       LIMIT 10`
    );

    res.json({
      code: 200,
      data: {
        today_pv: Number(today_pv),
        today_uv: Number(today_uv),
        total_pv: Number(total_pv),
        total_uv: Number(total_uv),
        daily_pv: dailyPv.map(r => ({ date: r.date, pv: Number(r.pv) })),
        top_pages: topPages.map(r => ({ page_path: r.page_path, pv: Number(r.pv) }))
      }
    });
  } catch (e) {
    console.error('获取访问统计失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

module.exports = router;
