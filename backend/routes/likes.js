/**
 * 文章点赞/收藏路由
 * 作用：提供文章的点赞/取消点赞、收藏/取消收藏接口
 *
 * 接口列表：
 * POST   /api/likes/article/:articleId           - 点赞/取消点赞文章
 * GET    /api/likes/article/:articleId/status    - 查询当前用户点赞状态
 * GET    /api/likes/article/:articleId/count     - 获取文章点赞数
 * POST   /api/favorites/article/:articleId       - 收藏/取消收藏文章
 * GET    /api/favorites/article/:articleId/status - 查询当前用户收藏状态
 * GET    /api/favorites                           - 获取当前用户收藏列表
 */

const express = require('express');
const pool = require('../config/db');

const router = express.Router();

/**
 * 获取用户标识（登录用户用 user_id，未登录用户用 IP）
 */
function getUserIdentifier(req) {
  if (req.user && req.user.id) {
    return { type: 'user_id', value: req.user.id };
  }
  return { type: 'ip', value: req.ip || req.connection.remoteAddress };
}

// ==================== 点赞相关 ====================

/**
 * POST /api/likes/article/:articleId
 * 点赞/取消点赞文章（toggle 模式）
 * 登录用户和未登录用户（基于 IP）均可操作
 */
router.post('/article/:articleId', async (req, res) => {
  try {
    const { articleId } = req.params;
    const uid = getUserIdentifier(req);

    // 检查文章是否存在
    const [articles] = await pool.execute(
      'SELECT id FROM articles WHERE id = ?',
      [articleId]
    );
    if (!articles.length) {
      return res.status(404).json({ code: 404, message: '文章不存在' });
    }

    // 检查是否已点赞
    const [existing] = await pool.execute(
      `SELECT id FROM article_likes
       WHERE article_id = ? AND ${uid.type} = ?`,
      [articleId, uid.value]
    );

    if (existing.length > 0) {
      // 已点赞 → 取消点赞
      await pool.execute(
        'DELETE FROM article_likes WHERE id = ?',
        [existing[0].id]
      );
      await pool.execute(
        'UPDATE articles SET like_count = GREATEST(like_count - 1, 0) WHERE id = ?',
        [articleId]
      );
      // 获取最新数量
      const [countResult] = await pool.execute(
        'SELECT like_count FROM articles WHERE id = ?',
        [articleId]
      );
      return res.json({
        code: 200,
        message: '已取消点赞',
        data: { liked: false, like_count: Number(countResult[0]?.like_count || 0) }
      });
    }

    // 未点赞 → 点赞
    await pool.execute(
      `INSERT INTO article_likes (article_id, ${uid.type}, created_at)
       VALUES (?, ?, NOW())`,
      [articleId, uid.value]
    );
    await pool.execute(
      'UPDATE articles SET like_count = like_count + 1 WHERE id = ?',
      [articleId]
    );
    const [countResult] = await pool.execute(
      'SELECT like_count FROM articles WHERE id = ?',
      [articleId]
    );
    res.json({
      code: 200,
      message: '点赞成功',
      data: { liked: true, like_count: Number(countResult[0]?.like_count || 1) }
    });
  } catch (e) {
    console.error('点赞操作失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

/**
 * GET /api/likes/article/:articleId/status
 * 查询当前用户对该文章的点赞状态
 */
router.get('/article/:articleId/status', async (req, res) => {
  try {
    const { articleId } = req.params;
    const uid = getUserIdentifier(req);

    const [existing] = await pool.execute(
      `SELECT id FROM article_likes
       WHERE article_id = ? AND ${uid.type} = ?`,
      [articleId, uid.value]
    );

    res.json({
      code: 200,
      data: { liked: existing.length > 0 }
    });
  } catch (e) {
    console.error('查询点赞状态失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

/**
 * GET /api/likes/article/:articleId/count
 * 获取文章点赞数
 */
router.get('/article/:articleId/count', async (req, res) => {
  try {
    const { articleId } = req.params;
    const [rows] = await pool.execute(
      'SELECT like_count FROM articles WHERE id = ?',
      [articleId]
    );
    res.json({
      code: 200,
      data: { like_count: Number(rows[0]?.like_count || 0) }
    });
  } catch (e) {
    console.error('查询点赞数失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

module.exports = router;
