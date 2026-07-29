/**
 * 文章标签路由
 * 作用：提供文章标签的增删改查接口
 *
 * 接口列表：
 * GET    /api/tags        - 获取所有标签（公开）
 * POST   /api/tags        - 创建标签（需登录）
 * PUT    /api/tags/:id    - 更新标签（需登录）
 * DELETE /api/tags/:id    - 删除标签（需登录）
 */

const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/tags - 获取所有标签
 * 公开接口，无需登录
 * 查询参数：
 *   - with_count: 是否包含文章数量（true/false）
 */
router.get('/', async (req, res) => {
  try {
    const { with_count } = req.query;
    let sql = 'SELECT id, name, slug, created_at FROM tags';
    let params = [];

    if (with_count === 'true') {
      sql = `
        SELECT t.id, t.name, t.slug, t.created_at,
               COUNT(at.article_id) as article_count
        FROM tags t
        LEFT JOIN article_tags at ON t.id = at.tag_id
        GROUP BY t.id, t.name, t.slug, t.created_at
        HAVING COUNT(at.article_id) > 0 OR t.id IN (SELECT id FROM tags)
      `;
    } else {
      sql += ' ORDER BY id ASC';
    }

    const [rows] = await pool.execute(sql, params);
    res.json({ code: 200, data: rows });
  } catch (e) {
    console.error('获取标签列表失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

/**
 * GET /api/tags/:slug - 根据slug获取单个标签
 * 公开接口，无需登录
 */
router.get('/:slug', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, name, slug, created_at FROM tags WHERE slug = ?',
      [req.params.slug]
    );

    if (!rows.length) {
      return res.status(404).json({ code: 404, message: '标签不存在' });
    }

    res.json({ code: 200, data: rows[0] });
  } catch (e) {
    console.error('获取标签详情失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

/**
 * POST /api/tags - 创建标签
 * 需要登录
 * 请求体：{ name, slug }
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, slug } = req.body;

    // 校验：名称不能为空
    if (!name || !name.trim()) {
      return res.status(400).json({ code: 400, message: '标签名称不能为空' });
    }

    // 校验：slug不能为空
    if (!slug || !slug.trim()) {
      return res.status(400).json({ code: 400, message: '标签标识不能为空' });
    }

    // 检查名称是否已存在
    const [existing] = await pool.execute(
      'SELECT id FROM tags WHERE name = ? OR slug = ?',
      [name.trim(), slug.trim()]
    );
    if (existing.length > 0) {
      return res.status(400).json({ code: 400, message: '标签名称或标识已存在' });
    }

    const [result] = await pool.execute(
      'INSERT INTO tags (name, slug) VALUES (?, ?)',
      [name.trim(), slug.trim()]
    );

    res.json({ code: 200, message: '创建成功', data: { id: result.insertId } });
  } catch (e) {
    console.error('创建标签失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

/**
 * PUT /api/tags/:id - 更新标签
 * 需要登录
 * 请求体：{ name, slug }
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, slug } = req.body;

    // 校验：标签是否存在
    const [existing] = await pool.execute('SELECT id FROM tags WHERE id = ?', [req.params.id]);
    if (!existing.length) {
      return res.status(404).json({ code: 404, message: '标签不存在' });
    }

    // 校验：slug是否被其他标签使用
    if (slug) {
      const [slugCheck] = await pool.execute(
        'SELECT id FROM tags WHERE slug = ? AND id != ?',
        [slug.trim(), req.params.id]
      );
      if (slugCheck.length > 0) {
        return res.status(400).json({ code: 400, message: '标签标识已被其他标签使用' });
      }
    }

    // 校验：名称是否被其他标签使用
    if (name) {
      const [nameCheck] = await pool.execute(
        'SELECT id FROM tags WHERE name = ? AND id != ?',
        [name.trim(), req.params.id]
      );
      if (nameCheck.length > 0) {
        return res.status(400).json({ code: 400, message: '标签名称已被其他标签使用' });
      }
    }

    await pool.execute(
      `UPDATE tags SET name = ?, slug = ? WHERE id = ?`,
      [name.trim(), slug.trim(), req.params.id]
    );

    res.json({ code: 200, message: '更新成功' });
  } catch (e) {
    console.error('更新标签失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

/**
 * DELETE /api/tags/:id - 删除标签
 * 需要登录
 * 注意：删除标签时，关联的article_tags记录会被级联删除
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const [result] = await pool.execute(
      'DELETE FROM tags WHERE id = ?',
      [req.params.id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ code: 404, message: '标签不存在' });
    }

    res.json({ code: 200, message: '删除成功' });
  } catch (e) {
    console.error('删除标签失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

module.exports = router;