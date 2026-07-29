/**
 * 文章评论路由
 * 作用：提供博客文章评论的公开发布、浏览和后台管理接口
 *
 * 接口列表：
 * 【公开接口】（无需登录）
 *   GET    /api/comments/:articleId        - 获取文章的已通过评论（返回树形结构）
 *   POST   /api/comments/:articleId        - 发表评论（status 默认"已通过"）
 *
 * 【管理接口】（需要登录）
 *   GET    /api/comments                   - 获取所有评论列表（支持分页与筛选）
 *   PUT    /api/comments/:id/status        - 更新评论状态（待审核/已通过/已拒绝）
 *   DELETE /api/comments/:id               - 删除评论
 */

const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// ==================== 公开接口 ====================

/**
 * GET /api/comments/:articleId - 获取文章的已通过评论
 * 公开接口，无需登录
 * 只返回 status='已通过' 的评论，并组织为树形结构（顶级评论 + 嵌套回复）
 *
 * @param {Object} req - Express 请求对象，req.params.articleId 为文章ID
 * @param {Object} res - Express 响应对象
 * @returns {Object} JSON 响应，data 为树形评论数组
 */
router.get('/:articleId', async (req, res) => {
  try {
    const { articleId } = req.params;

    // 查询该文章所有已通过的评论，按创建时间升序便于后续构建树
    const [rows] = await pool.execute(
      `SELECT id, article_id, nickname, email, avatar_url, content,
              parent_id, status, created_at
       FROM comments
       WHERE article_id = ? AND status = '已通过'
       ORDER BY created_at ASC`,
      [articleId]
    );

    // 构建树形结构：第一步建立 id -> comment 的映射，并初始化 children 数组
    const commentMap = new Map();
    rows.forEach(comment => {
      comment.children = [];
      commentMap.set(comment.id, comment);
    });

    // 第二步遍历，把每条评论挂到父评论的 children 下，或作为顶级评论
    const tree = [];
    rows.forEach(comment => {
      if (comment.parent_id && commentMap.has(comment.parent_id)) {
        // 父评论存在且在本批已通过列表中 -> 挂到父评论下
        commentMap.get(comment.parent_id).children.push(comment);
      } else {
        // 无父评论或父评论不在已通过列表中 -> 作为顶级评论
        tree.push(comment);
      }
    });

    res.json({ code: 200, data: tree, message: '获取评论成功' });
  } catch (e) {
    console.error('获取评论列表失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

/**
 * POST /api/comments/:articleId - 发表评论
 * 公开接口，无需登录
 * 请求体：{ nickname, email, content, parent_id }
 * status 默认 '已通过'（方便演示，不做审核）
 * ip_address 取自 req.ip
 *
 * @param {Object} req - Express 请求对象，req.params.articleId 为文章ID，req.body 为评论内容
 * @param {Object} res - Express 响应对象
 * @returns {Object} JSON 响应，data 包含新评论的 id
 */
router.post('/:articleId', async (req, res) => {
  try {
    const { articleId } = req.params;
    const { nickname, email, content, parent_id } = req.body;

    // 校验：昵称不能为空
    if (!nickname || !nickname.trim()) {
      return res.status(400).json({ code: 400, message: '昵称不能为空' });
    }
    // 校验：评论内容不能为空
    if (!content || !content.trim()) {
      return res.status(400).json({ code: 400, message: '评论内容不能为空' });
    }

    // 获取客户端 IP 地址，用于反垃圾与审计
    const ipAddress = req.ip || null;

    // 插入评论，status 默认为 '已通过' 方便演示
    const [result] = await pool.execute(
      `INSERT INTO comments (article_id, nickname, email, content, parent_id, status, ip_address)
       VALUES (?, ?, ?, ?, ?, '已通过', ?)`,
      [articleId, nickname.trim(), email || null, content.trim(), parent_id || null, ipAddress]
    );

    res.json({
      code: 200,
      data: { id: result.insertId },
      message: '评论成功'
    });
  } catch (e) {
    console.error('发表评论失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// ==================== 管理接口 ====================

/**
 * GET /api/comments - 获取所有评论列表（管理端）
 * 需要登录
 * 查询参数：
 *   - status: 状态筛选（待审核/已通过/已拒绝）
 *   - article_id: 文章ID筛选
 *   - page: 页码，默认1
 *   - page_size: 每页数量，默认10
 *
 * @param {Object} req - Express 请求对象，req.query 携带筛选与分页参数
 * @param {Object} res - Express 响应对象
 * @returns {Object} JSON 响应，data 包含 list 和 pagination
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, article_id } = req.query;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || 10;

    // 动态构建 WHERE 条件，1=1 保证后续拼接不出错
    let whereConditions = ['1=1'];
    let params = [];

    // 如果指定了 status，加入状态筛选
    if (status) {
      whereConditions.push('c.status = ?');
      params.push(status);
    }

    // 如果指定了 article_id，加入文章筛选
    if (article_id) {
      whereConditions.push('c.article_id = ?');
      params.push(article_id);
    }

    const whereClause = whereConditions.join(' AND ');

    // 查询总数，用于分页计算
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM comments c WHERE ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // 查询分页数据，LEFT JOIN articles 关联出文章标题便于后台展示
    const offset = (page - 1) * pageSize;
    const [rows] = await pool.execute(
      `SELECT c.id, c.article_id, c.nickname, c.email, c.avatar_url, c.content,
              c.parent_id, c.status, c.ip_address, c.created_at,
              a.title as article_title
       FROM comments c
       LEFT JOIN articles a ON c.article_id = a.id
       WHERE ${whereClause}
       ORDER BY c.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, String(pageSize), String(offset)]
    );

    res.json({
      code: 200,
      data: {
        list: rows,
        pagination: {
          page,
          page_size: pageSize,
          total,
          total_pages: Math.ceil(total / pageSize)
        }
      },
      message: '获取评论列表成功'
    });
  } catch (e) {
    console.error('获取评论列表失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

/**
 * PUT /api/comments/:id/status - 更新评论状态
 * 需要登录
 * 请求体：{ status }（待审核/已通过/已拒绝）
 *
 * @param {Object} req - Express 请求对象，req.params.id 为评论ID，req.body.status 为新状态
 * @param {Object} res - Express 响应对象
 * @returns {Object} JSON 响应，提示更新结果
 */
router.put('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // 校验：status 必须是合法枚举值
    const validStatuses = ['待审核', '已通过', '已拒绝'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ code: 400, message: '状态值不合法（可选：待审核/已通过/已拒绝）' });
    }

    // 更新评论状态
    const [result] = await pool.execute(
      'UPDATE comments SET status = ? WHERE id = ?',
      [status, id]
    );

    // affectedRows 为 0 表示评论不存在
    if (!result.affectedRows) {
      return res.status(404).json({ code: 404, message: '评论不存在' });
    }

    res.json({ code: 200, message: '状态更新成功' });
  } catch (e) {
    console.error('更新评论状态失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

/**
 * DELETE /api/comments/:id - 删除评论
 * 需要登录
 *
 * @param {Object} req - Express 请求对象，req.params.id 为评论ID
 * @param {Object} res - Express 响应对象
 * @returns {Object} JSON 响应，提示删除结果
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.execute(
      'DELETE FROM comments WHERE id = ?',
      [id]
    );

    // affectedRows 为 0 表示评论不存在
    if (!result.affectedRows) {
      return res.status(404).json({ code: 404, message: '评论不存在' });
    }

    res.json({ code: 200, message: '已删除' });
  } catch (e) {
    console.error('删除评论失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

module.exports = router;
