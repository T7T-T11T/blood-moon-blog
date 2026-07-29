/**
 * 友情链接路由
 * 作用：提供友情链接的增删改查接口
 *
 * 接口列表：
 * GET    /api/links        - 获取友链列表（公开，仅返回已通过）
 * GET    /api/links/all    - 获取所有友链（需登录，含待审核）
 * POST   /api/links        - 创建友链（需登录）
 * PUT    /api/links/:id    - 更新友链（需登录）
 * DELETE /api/links/:id    - 删除友链（需登录）
 */

const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/links - 获取友链列表
 * 公开接口，无需登录
 * 只返回 status='已通过' 的友链，按 sort_order ASC 排序
 * 查询参数：
 *   - category: 可选，按分类筛选
 */
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    let sql = `SELECT id, name, url, description, avatar_url, category, sort_order, status, email, created_at, updated_at
               FROM links
               WHERE status = '已通过'`;
    const params = [];

    // 若传入分类参数，追加分类筛选条件
    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    sql += ' ORDER BY sort_order ASC';

    const [rows] = await pool.execute(sql, params);
    res.json({ code: 200, data: rows });
  } catch (e) {
    console.error('获取友链列表失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

/**
 * GET /api/links/all - 获取所有友链
 * 管理端接口，需要登录
 * 返回所有状态的友链（含待审核），按 sort_order ASC 排序
 */
router.get('/all', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, name, url, description, avatar_url, category, sort_order, status, email, created_at, updated_at
       FROM links
       ORDER BY sort_order ASC`
    );
    res.json({ code: 200, data: rows });
  } catch (e) {
    console.error('获取所有友链失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

/**
 * POST /api/links - 创建友链
 * 需要登录
 * 请求体：{ name, url, description, avatar_url, category, sort_order, status, email }
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, url, description, avatar_url, category, sort_order, status, email } = req.body;

    // 校验：网站名称不能为空
    if (!name || !name.trim()) {
      return res.status(400).json({ code: 400, message: '网站名称不能为空' });
    }

    // 校验：网站URL不能为空
    if (!url || !url.trim()) {
      return res.status(400).json({ code: 400, message: '网站URL不能为空' });
    }

    const [result] = await pool.execute(
      `INSERT INTO links (name, url, description, avatar_url, category, sort_order, status, email)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name.trim(),
        url.trim(),
        description || null,
        avatar_url || null,
        category || '友情链接',
        sort_order !== undefined ? sort_order : 0,
        status || '已通过',
        email || null
      ]
    );

    res.json({ code: 200, message: '创建成功', data: { id: result.insertId } });
  } catch (e) {
    console.error('创建友链失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

/**
 * PUT /api/links/:id - 更新友链
 * 需要登录
 * 请求体：{ name, url, description, avatar_url, category, sort_order, status, email }
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, url, description, avatar_url, category, sort_order, status, email } = req.body;

    // 校验：友链是否存在
    const [existing] = await pool.execute('SELECT id FROM links WHERE id = ?', [req.params.id]);
    if (!existing.length) {
      return res.status(404).json({ code: 404, message: '友链不存在' });
    }

    // 校验：网站名称不能为空
    if (!name || !name.trim()) {
      return res.status(400).json({ code: 400, message: '网站名称不能为空' });
    }

    // 校验：网站URL不能为空
    if (!url || !url.trim()) {
      return res.status(400).json({ code: 400, message: '网站URL不能为空' });
    }

    await pool.execute(
      `UPDATE links
       SET name = ?, url = ?, description = ?, avatar_url = ?, category = ?, sort_order = ?, status = ?, email = ?
       WHERE id = ?`,
      [
        name.trim(),
        url.trim(),
        description || null,
        avatar_url || null,
        category || '友情链接',
        sort_order !== undefined ? sort_order : 0,
        status || '已通过',
        email || null,
        req.params.id
      ]
    );

    res.json({ code: 200, message: '更新成功' });
  } catch (e) {
    console.error('更新友链失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

/**
 * DELETE /api/links/:id - 删除友链
 * 需要登录
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const [result] = await pool.execute(
      'DELETE FROM links WHERE id = ?',
      [req.params.id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ code: 404, message: '友链不存在' });
    }

    res.json({ code: 200, message: '删除成功' });
  } catch (e) {
    console.error('删除友链失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

module.exports = router;
