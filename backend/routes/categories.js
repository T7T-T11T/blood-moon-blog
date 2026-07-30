/**
 * 文章分类路由
 * 作用：提供文章分类的增删改查接口
 *
 * 接口列表：
 * GET    /api/categories        - 获取所有分类（公开）
 * POST   /api/categories        - 创建分类（需登录）
 * PUT    /api/categories/:id    - 更新分类（需登录）
 * DELETE /api/categories/:id    - 删除分类（需登录）
 */

const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { logAction } = require('../middleware/logAction');

const router = express.Router();

/**
 * GET /api/categories - 获取所有分类
 * 公开接口，无需登录
 * 查询参数：
 *   - with_count: 是否包含文章数量（true/false）
 */
router.get('/', async (req, res) => {
  try {
    const { with_count } = req.query;
    let sql = 'SELECT id, name, slug, description, sort_order, created_at, updated_at FROM categories';
    let params = [];

    if (with_count === 'true') {
      sql = `
        SELECT c.id, c.name, c.slug, c.description, c.sort_order, c.created_at, c.updated_at,
               COUNT(a.id) as article_count
        FROM categories c
        LEFT JOIN articles a ON c.id = a.category_id AND a.status = '已发布'
        GROUP BY c.id, c.name, c.slug, c.description, c.sort_order, c.created_at, c.updated_at
      `;
    }

    sql += ' ORDER BY sort_order ASC';

    const [rows] = await pool.execute(sql, params);
    res.json({ code: 200, data: rows });
  } catch (e) {
    console.error('获取分类列表失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

/**
 * GET /api/categories/:slug - 根据slug获取单个分类
 * 公开接口，无需登录
 */
router.get('/:slug', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, name, slug, description, sort_order, created_at, updated_at FROM categories WHERE slug = ?',
      [req.params.slug]
    );

    if (!rows.length) {
      return res.status(404).json({ code: 404, message: '分类不存在' });
    }

    res.json({ code: 200, data: rows[0] });
  } catch (e) {
    console.error('获取分类详情失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

/**
 * POST /api/categories - 创建分类
 * 需要登录
 * 请求体：{ name, slug, description, sort_order }
 */
router.post('/', authMiddleware, logAction('创建分类', { resource_type: 'category' }), async (req, res) => {
  try {
    const { name, slug, description, sort_order } = req.body;

    // 校验：名称不能为空
    if (!name || !name.trim()) {
      return res.status(400).json({ code: 400, message: '分类名称不能为空' });
    }

    // 校验：slug不能为空
    if (!slug || !slug.trim()) {
      return res.status(400).json({ code: 400, message: '分类标识不能为空' });
    }

    // 检查slug是否已存在
    const [existing] = await pool.execute(
      'SELECT id FROM categories WHERE slug = ?',
      [slug.trim()]
    );
    if (existing.length > 0) {
      return res.status(400).json({ code: 400, message: '分类标识已存在' });
    }

    const [result] = await pool.execute(
      `INSERT INTO categories (name, slug, description, sort_order)
       VALUES (?, ?, ?, ?)`,
      [name.trim(), slug.trim(), description || null, sort_order || 0]
    );

    res.json({ code: 200, message: '创建成功', data: { id: result.insertId } });
  } catch (e) {
    console.error('创建分类失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

/**
 * PUT /api/categories/:id - 更新分类
 * 需要登录
 * 请求体：{ name, slug, description, sort_order }
 */
router.put('/:id', authMiddleware, logAction('更新分类', { resource_type: 'category' }), async (req, res) => {
  try {
    const { name, slug, description, sort_order } = req.body;

    // 校验：名称不能为空
    if (!name || !name.trim()) {
      return res.status(400).json({ code: 400, message: '分类名称不能为空' });
    }

    // 校验：slug不能为空
    if (!slug || !slug.trim()) {
      return res.status(400).json({ code: 400, message: '分类标识不能为空' });
    }

    // 检查分类是否存在
    const [existing] = await pool.execute('SELECT id FROM categories WHERE id = ?', [req.params.id]);
    if (!existing.length) {
      return res.status(404).json({ code: 404, message: '分类不存在' });
    }

    // 检查slug是否被其他分类使用
    if (slug) {
      const [slugCheck] = await pool.execute(
        'SELECT id FROM categories WHERE slug = ? AND id != ?',
        [slug.trim(), req.params.id]
      );
      if (slugCheck.length > 0) {
        return res.status(400).json({ code: 400, message: '分类标识已被其他分类使用' });
      }
    }

    await pool.execute(
      `UPDATE categories
       SET name = ?, slug = ?, description = ?, sort_order = ?
       WHERE id = ?`,
      [name.trim(), slug.trim(), description || null, sort_order || 0, req.params.id]
    );

    res.json({ code: 200, message: '更新成功' });
  } catch (e) {
    console.error('更新分类失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

/**
 * DELETE /api/categories/:id - 删除分类
 * 需要登录
 * 注意：删除分类时，该分类下的文章的category_id会被设为NULL（ON DELETE SET NULL）
 */
router.delete('/:id', authMiddleware, logAction('删除分类', { resource_type: 'category' }), async (req, res) => {
  try {
    const [result] = await pool.execute(
      'DELETE FROM categories WHERE id = ?',
      [req.params.id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ code: 404, message: '分类不存在' });
    }

    res.json({ code: 200, message: '删除成功' });
  } catch (e) {
    console.error('删除分类失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

module.exports = router;