/**
 * 数据导出 Controller 层
 * 职责：处理数据导出请求，调用 Service 层获取数据，返回 JSON 格式
 */

/**
 * 导出文章数据
 * GET /api/export/articles
 * 返回当前用户的所有文章（包括已删除）
 */
exports.exportArticles = async (req, res) => {
  try {
    // 获取用户的所有文章（包括回收站中的）
    const { status, category_id, keyword } = req.query;

    // 导出时包含回收站文章
    const pool = require('../config/db');
    let sql = `SELECT a.id, a.title, a.content, a.summary, a.cover_image, a.status, a.view_count,
               a.category_id, a.created_at, a.updated_at, a.deleted_at,
               c.name as category_name
               FROM articles a
               LEFT JOIN categories c ON a.category_id = c.id
               WHERE a.user_id = ?`;
    let params = [req.user.id];

    if (status && status !== '全部') {
      sql += ' AND a.status = ?';
      params.push(status);
    }
    if (category_id) {
      sql += ' AND a.category_id = ?';
      params.push(category_id);
    }
    if (keyword) {
      sql += ' AND (a.title LIKE ? OR a.summary LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    sql += ' ORDER BY a.created_at DESC';

    const [rows] = await pool.execute(sql, params);

    // 获取每篇文章的标签
    const articles = await Promise.all(rows.map(async (article) => {
      const [tagRows] = await pool.execute(
        `SELECT t.id, t.name, t.slug
         FROM tags t
         JOIN article_tags at ON t.id = at.tag_id
         WHERE at.article_id = ?`,
        [article.id]
      );
      return {
        ...article,
        tags: tagRows
      };
    }));

    // 设置响应头，提示下载
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="articles_${Date.now()}.json"`);
    res.json({
      code: 200,
      message: '导出成功',
      exported_at: new Date().toISOString(),
      total: articles.length,
      data: articles
    });
  } catch (e) {
    console.error('导出文章失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};

/**
 * 导出评论数据
 * GET /api/export/comments
 * 返回所有评论（管理员）或相关文章评论（普通用户）
 */
exports.exportComments = async (req, res) => {
  try {
    const { status, article_id } = req.query;
    const pool = require('../config/db');

    // 构建查询
    let sql = `SELECT c.id, c.article_id, a.title as article_title, c.nickname, c.email,
               c.content, c.status, c.ip_address, c.created_at
               FROM comments c
               LEFT JOIN articles a ON c.article_id = a.id`;
    let whereConditions = [];
    let params = [];

    // 如果不是管理员，只导出自己文章的评论
    if (req.user.id !== 1) { // 假设 ID 为 1 的是管理员
      whereConditions.push('a.user_id = ?');
      params.push(req.user.id);
    }

    if (status && status !== '全部') {
      whereConditions.push('c.status = ?');
      params.push(status);
    }

    if (article_id) {
      whereConditions.push('c.article_id = ?');
      params.push(article_id);
    }

    if (whereConditions.length > 0) {
      sql += ` WHERE ${whereConditions.join(' AND ')}`;
    }
    sql += ' ORDER BY c.created_at DESC';

    const [comments] = await pool.execute(sql, params);

    // 设置响应头，提示下载
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="comments_${Date.now()}.json"`);
    res.json({
      code: 200,
      message: '导出成功',
      exported_at: new Date().toISOString(),
      total: comments.length,
      data: comments
    });
  } catch (e) {
    console.error('导出评论失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
};