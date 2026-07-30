/**
 * 文章收藏路由
 * 作用：需要登录才能收藏/取消收藏文章
 *
 * 接口列表：
 * POST /api/favorites/article/:articleId        - 收藏/取消收藏文章
 * GET  /api/favorites/article/:articleId/status - 查询收藏状态
 * GET  /api/favorites                            - 获取收藏列表
 */

const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 收藏相关接口需要登录
router.use(authMiddleware);

/**
 * POST /api/favorites/article/:articleId
 * 收藏/取消收藏文章（toggle 模式）
 */
router.post('/article/:articleId', async (req, res) => {
  try {
    const { articleId } = req.params;
    const userId = req.user.id;

    // 检查文章是否存在
    const [articles] = await pool.execute(
      'SELECT id FROM articles WHERE id = ?',
      [articleId]
    );
    if (!articles.length) {
      return res.status(404).json({ code: 404, message: '文章不存在' });
    }

    // 检查是否已收藏
    const [existing] = await pool.execute(
      'SELECT id FROM article_favorites WHERE article_id = ? AND user_id = ?',
      [articleId, userId]
    );

    if (existing.length > 0) {
      // 已收藏 → 取消收藏
      await pool.execute(
        'DELETE FROM article_favorites WHERE id = ?',
        [existing[0].id]
      );
      return res.json({
        code: 200,
        message: '已取消收藏',
        data: { favorited: false }
      });
    }

    // 未收藏 → 收藏
    await pool.execute(
      'INSERT INTO article_favorites (article_id, user_id, created_at) VALUES (?, ?, NOW())',
      [articleId, userId]
    );
    res.json({
      code: 200,
      message: '收藏成功',
      data: { favorited: true }
    });
  } catch (e) {
    console.error('收藏操作失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

/**
 * GET /api/favorites/article/:articleId/status
 * 查询当前用户是否已收藏该文章
 */
router.get('/article/:articleId/status', async (req, res) => {
  try {
    const { articleId } = req.params;
    const userId = req.user.id;

    const [existing] = await pool.execute(
      'SELECT id FROM article_favorites WHERE article_id = ? AND user_id = ?',
      [articleId, userId]
    );

    res.json({
      code: 200,
      data: { favorited: existing.length > 0 }
    });
  } catch (e) {
    console.error('查询收藏状态失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

/**
 * GET /api/favorites
 * 获取当前用户的收藏列表
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || 20;
    const offset = (page - 1) * pageSize;
    const safePageSize = Math.max(1, parseInt(pageSize, 10) || 20);
    const safeOffset = Math.max(0, parseInt(offset, 10) || 0);

    const [rows] = await pool.execute(
      `SELECT a.id, a.title, a.summary, a.cover_image, a.view_count,
              a.created_at, f.created_at AS favorited_at
       FROM article_favorites f
       INNER JOIN articles a ON f.article_id = a.id
       WHERE f.user_id = ? AND a.status = '已发布'
       ORDER BY f.created_at DESC
       LIMIT ${safePageSize} OFFSET ${safeOffset}`,
      [userId]
    );

    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM article_favorites f
       INNER JOIN articles a ON f.article_id = a.id
       WHERE f.user_id = ? AND a.status = '已发布'`,
      [userId]
    );

    res.json({
      code: 200,
      data: {
        list: rows,
        total: Number(total),
        page,
        page_size: pageSize
      }
    });
  } catch (e) {
    console.error('获取收藏列表失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

module.exports = router;
