/**
 * 博客文章路由
 * 作用：提供博客文章的公开浏览和后台管理接口
 *
 * 接口列表：
 * 【公开接口】（无需登录）
 *   GET    /api/articles/public          - 获取已发布文章列表
 *   GET    /api/articles/public/:id      - 获取文章详情（自动增加浏览量）
 *   GET    /api/articles/public/latest   - 获取最新文章
 *   GET    /api/articles/public/hot      - 获取热门文章
 *   GET    /api/articles/public/category/:slug - 按分类获取文章
 *   GET    /api/articles/public/tag/:slug    - 按标签获取文章
 *
 * 【管理接口】（需要登录）
 *   GET    /api/articles           - 获取文章列表（含草稿）
 *   POST   /api/articles           - 新增文章
 *   PUT    /api/articles/:id       - 编辑文章
 *   DELETE /api/articles/:id       - 删除文章
 */

const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// ==================== 公开接口 ====================

/**
 * GET /api/articles/public - 获取已发布文章列表
 * 公开接口，无需登录
 * 查询参数：
 *   - page: 页码，默认1
 *   - page_size: 每页数量，默认10
 *   - category_id: 分类ID筛选
 *   - tag_id: 标签ID筛选
 *   - keyword: 关键词搜索
 */
router.get('/public', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || 10;
    const { category_id, tag_id, keyword } = req.query;

    // 构建查询条件
    let whereConditions = ['a.status = ?'];
    let params = ['已发布'];

    if (category_id) {
      whereConditions.push('a.category_id = ?');
      params.push(category_id);
    }

    if (keyword) {
      whereConditions.push('(a.title LIKE ? OR a.summary LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    const whereClause = whereConditions.join(' AND ');

    // 如果按标签筛选，需要JOIN关联表
    let fromClause = 'FROM articles a';
    let joinClause = '';

    if (tag_id) {
      joinClause = 'JOIN article_tags at ON a.id = at.article_id AND at.tag_id = ?';
      params.push(tag_id);
    }

    // 查询总数
    const [countResult] = await pool.execute(
      `SELECT COUNT(DISTINCT a.id) as total ${fromClause} ${joinClause} WHERE ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // 查询分页数据
    const offset = (page - 1) * pageSize;
    const [rows] = await pool.execute(
      `SELECT DISTINCT a.id, a.title, a.summary, a.cover_image, a.status, a.view_count,
              a.category_id, a.created_at, a.updated_at,
              c.name as category_name, c.slug as category_slug
       ${fromClause}
       ${joinClause}
       LEFT JOIN categories c ON a.category_id = c.id
       WHERE ${whereClause}
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, String(pageSize), String(offset)]
    );

    // 为每篇文章获取标签
    const articlesWithTags = await Promise.all(
      rows.map(async (article) => {
        const [tagRows] = await pool.execute(
          `SELECT t.id, t.name, t.slug
           FROM tags t
           JOIN article_tags at ON t.id = at.tag_id
           WHERE at.article_id = ?`,
          [article.id]
        );
        return { ...article, tags: tagRows };
      })
    );

    res.json({
      code: 200,
      data: {
        list: articlesWithTags,
        pagination: {
          page,
          page_size: pageSize,
          total,
          total_pages: Math.ceil(total / pageSize)
        }
      }
    });
  } catch (e) {
    console.error('获取文章列表失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

/**
 * GET /api/articles/public/latest - 获取最新文章
 * 公开接口，无需登录
 * 查询参数：limit - 限制数量，默认5
 */
router.get('/public/latest', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;

    const [rows] = await pool.execute(
      `SELECT a.id, a.title, a.summary, a.cover_image, a.view_count,
              a.category_id, a.created_at,
              c.name as category_name, c.slug as category_slug
       FROM articles a
       LEFT JOIN categories c ON a.category_id = c.id
       WHERE a.status = '已发布'
       ORDER BY a.created_at DESC
       LIMIT ?`,
      [String(limit)]
    );

    // 获取标签
    const articlesWithTags = await Promise.all(
      rows.map(async (article) => {
        const [tagRows] = await pool.execute(
          `SELECT t.id, t.name, t.slug
           FROM tags t
           JOIN article_tags at ON t.id = at.tag_id
           WHERE at.article_id = ?`,
          [article.id]
        );
        return { ...article, tags: tagRows };
      })
    );

    res.json({ code: 200, data: articlesWithTags });
  } catch (e) {
    console.error('获取最新文章失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

/**
 * GET /api/articles/public/hot - 获取热门文章（按浏览量排序）
 * 公开接口，无需登录
 * 查询参数：limit - 限制数量，默认5
 */
router.get('/public/hot', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;

    const [rows] = await pool.execute(
      `SELECT a.id, a.title, a.summary, a.view_count,
              c.name as category_name, c.slug as category_slug
       FROM articles a
       LEFT JOIN categories c ON a.category_id = c.id
       WHERE a.status = '已发布'
       ORDER BY a.view_count DESC
       LIMIT ?`,
      [String(limit)]
    );

    res.json({ code: 200, data: rows });
  } catch (e) {
    console.error('获取热门文章失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

/**
 * GET /api/articles/public/category/:slug - 按分类获取文章
 * 公开接口，无需登录
 * 查询参数：page, page_size
 */
router.get('/public/category/:slug', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || 10;

    // 获取分类信息
    const [categories] = await pool.execute(
      'SELECT id, name, slug, description FROM categories WHERE slug = ?',
      [req.params.slug]
    );

    if (!categories.length) {
      return res.status(404).json({ code: 404, message: '分类不存在' });
    }

    const category = categories[0];

    // 计算总数
    const [countResult] = await pool.execute(
      'SELECT COUNT(*) as total FROM articles WHERE status = ? AND category_id = ?',
      ['已发布', category.id]
    );

    // 获取文章列表
    const offset = (page - 1) * pageSize;
    const [rows] = await pool.execute(
      `SELECT a.id, a.title, a.summary, a.cover_image, a.view_count,
              a.category_id, a.created_at,
              c.name as category_name, c.slug as category_slug
       FROM articles a
       LEFT JOIN categories c ON a.category_id = c.id
       WHERE a.status = '已发布' AND a.category_id = ?
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`,
      [category.id, pageSize, offset]
    );

    // 获取标签
    const articlesWithTags = await Promise.all(
      rows.map(async (article) => {
        const [tagRows] = await pool.execute(
          `SELECT t.id, t.name, t.slug
           FROM tags t
           JOIN article_tags at ON t.id = at.tag_id
           WHERE at.article_id = ?`,
          [article.id]
        );
        return { ...article, tags: tagRows };
      })
    );

    res.json({
      code: 200,
      data: {
        category,
        list: articlesWithTags,
        pagination: {
          page,
          page_size: pageSize,
          total: countResult[0].total,
          total_pages: Math.ceil(countResult[0].total / pageSize)
        }
      }
    });
  } catch (e) {
    console.error('获取分类文章失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

/**
 * GET /api/articles/public/tag/:slug - 按标签获取文章
 * 公开接口，无需登录
 * 查询参数：page, page_size
 */
router.get('/public/tag/:slug', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || 10;

    // 获取标签信息
    const [tags] = await pool.execute(
      'SELECT id, name, slug FROM tags WHERE slug = ?',
      [req.params.slug]
    );

    if (!tags.length) {
      return res.status(404).json({ code: 404, message: '标签不存在' });
    }

    const tag = tags[0];

    // 计算总数
    const [countResult] = await pool.execute(
      `SELECT COUNT(DISTINCT a.id) as total
       FROM articles a
       JOIN article_tags at ON a.id = at.article_id
       WHERE a.status = '已发布' AND at.tag_id = ?`,
      [tag.id]
    );

    // 获取文章列表
    const offset = (page - 1) * pageSize;
    const [rows] = await pool.execute(
      `SELECT DISTINCT a.id, a.title, a.summary, a.cover_image, a.view_count,
              a.category_id, a.created_at,
              c.name as category_name, c.slug as category_slug
       FROM articles a
       JOIN article_tags at ON a.id = at.article_id
       LEFT JOIN categories c ON a.category_id = c.id
       WHERE a.status = '已发布' AND at.tag_id = ?
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`,
      [tag.id, String(pageSize), String(offset)]
    );

    // 获取标签
    const articlesWithTags = await Promise.all(
      rows.map(async (article) => {
        const [tagRows] = await pool.execute(
          `SELECT t.id, t.name, t.slug
           FROM tags t
           JOIN article_tags at ON t.id = at.tag_id
           WHERE at.article_id = ?`,
          [article.id]
        );
        return { ...article, tags: tagRows };
      })
    );

    res.json({
      code: 200,
      data: {
        tag,
        list: articlesWithTags,
        pagination: {
          page,
          page_size: pageSize,
          total: countResult[0].total,
          total_pages: Math.ceil(countResult[0].total / pageSize)
        }
      }
    });
  } catch (e) {
    console.error('获取标签文章失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

/**
 * GET /api/articles/public/:id - 获取文章详情
 * 公开接口，无需登录
 * 自动增加浏览量
 */
router.get('/public/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT a.*, c.name as category_name, c.slug as category_slug
       FROM articles a
       LEFT JOIN categories c ON a.category_id = c.id
       WHERE a.id = ? AND a.status = '已发布'`,
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ code: 404, message: '文章不存在' });
    }

    const article = rows[0];

    // 增加浏览量
    await pool.execute('UPDATE articles SET view_count = view_count + 1 WHERE id = ?', [article.id]);
    article.view_count += 1;

    // 获取标签
    const [tagRows] = await pool.execute(
      `SELECT t.id, t.name, t.slug
       FROM tags t
       JOIN article_tags at ON t.id = at.tag_id
       WHERE at.article_id = ?`,
      [article.id]
    );
    article.tags = tagRows;

    // 获取上一篇和下一篇文章
    const [prevResult] = await pool.execute(
      'SELECT id, title FROM articles WHERE id < ? AND status = ? ORDER BY id DESC LIMIT 1',
      [article.id, '已发布']
    );
    const [nextResult] = await pool.execute(
      'SELECT id, title FROM articles WHERE id > ? AND status = ? ORDER BY id ASC LIMIT 1',
      [article.id, '已发布']
    );
    article.prev_article = prevResult.length ? prevResult[0] : null;
    article.next_article = nextResult.length ? nextResult[0] : null;

    res.json({ code: 200, data: article });
  } catch (e) {
    console.error('获取文章详情失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// ==================== 管理接口 ====================

/**
 * GET /api/articles - 获取文章列表（管理端）
 * 需要登录
 * 查询参数：status（全部/已发布/草稿）, category_id, keyword
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, category_id, keyword } = req.query;

    let sql = `SELECT a.id, a.title, a.summary, a.cover_image, a.status, a.view_count,
               a.category_id, a.created_at, a.updated_at,
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

    // 获取标签
    const articlesWithTags = await Promise.all(
      rows.map(async (article) => {
        const [tagRows] = await pool.execute(
          `SELECT t.id, t.name, t.slug
           FROM tags t
           JOIN article_tags at ON t.id = at.tag_id
           WHERE at.article_id = ?`,
          [article.id]
        );
        return { ...article, tags: tagRows };
      })
    );

    res.json({ code: 200, data: articlesWithTags });
  } catch (e) {
    console.error('获取文章列表失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

/**
 * GET /api/articles/:id - 获取文章详情（管理端）
 * 需要登录
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT a.*, c.name as category_name
       FROM articles a
       LEFT JOIN categories c ON a.category_id = c.id
       WHERE a.id = ? AND a.user_id = ?`,
      [req.params.id, req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({ code: 404, message: '文章不存在' });
    }

    const article = rows[0];

    // 获取标签
    const [tagRows] = await pool.execute(
      `SELECT t.id, t.name, t.slug
       FROM tags t
       JOIN article_tags at ON t.id = at.tag_id
       WHERE at.article_id = ?`,
      [article.id]
    );
    article.tags = tagRows;

    res.json({ code: 200, data: article });
  } catch (e) {
    console.error('获取文章详情失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

/**
 * POST /api/articles - 新增文章
 * 需要登录
 * 请求体：{ title, content, summary, cover_image, status, category_id, tag_ids }
 */
router.post('/', authMiddleware, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { title, content, summary, cover_image, status, category_id, tag_ids } = req.body;

    // 校验：标题不能为空
    if (!title || !title.trim()) {
      return res.status(400).json({ code: 400, message: '标题不能为空' });
    }
    // 校验：内容不能为空
    if (!content) {
      return res.status(400).json({ code: 400, message: '内容不能为空' });
    }

    // 开启事务
    await conn.beginTransaction();

    // 插入文章
    const [result] = await conn.execute(
      `INSERT INTO articles (title, content, summary, cover_image, status, category_id, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title.trim(), content, summary || null, cover_image || null, status || '已发布', category_id || null, req.user.id]
    );

    const articleId = result.insertId;

    // 插入标签关联
    if (tag_ids && Array.isArray(tag_ids) && tag_ids.length > 0) {
      const tagValues = tag_ids.map(tagId => [articleId, tagId]);
      await conn.query(
        'INSERT INTO article_tags (article_id, tag_id) VALUES ?',
        [tagValues]
      );
    }

    // 提交事务
    await conn.commit();

    res.json({ code: 200, message: '创建成功', data: { id: articleId } });
  } catch (e) {
    // 回滚事务
    await conn.rollback();
    console.error('新增文章失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  } finally {
    conn.release();
  }
});

/**
 * PUT /api/articles/:id - 编辑文章
 * 需要登录
 * 请求体：{ title, content, summary, cover_image, status, category_id, tag_ids }
 */
router.put('/:id', authMiddleware, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { title, content, summary, cover_image, status, category_id, tag_ids } = req.body;

    // 校验：标题不能为空
    if (!title || !title.trim()) {
      return res.status(400).json({ code: 400, message: '标题不能为空' });
    }

    // 开启事务
    await conn.beginTransaction();

    // 更新文章
    const [result] = await conn.execute(
      `UPDATE articles
       SET title = ?, content = ?, summary = ?, cover_image = ?, status = ?, category_id = ?
       WHERE id = ? AND user_id = ?`,
      [title.trim(), content, summary || null, cover_image || null, status || '已发布', category_id || null, req.params.id, req.user.id]
    );

    if (!result.affectedRows) {
      await conn.rollback();
      return res.status(404).json({ code: 404, message: '文章不存在' });
    }

    // 删除旧的标签关联
    await conn.execute('DELETE FROM article_tags WHERE article_id = ?', [req.params.id]);

    // 插入新的标签关联
    if (tag_ids && Array.isArray(tag_ids) && tag_ids.length > 0) {
      const tagValues = tag_ids.map(tagId => [req.params.id, tagId]);
      await conn.query(
        'INSERT INTO article_tags (article_id, tag_id) VALUES ?',
        [tagValues]
      );
    }

    // 提交事务
    await conn.commit();

    res.json({ code: 200, message: '更新成功' });
  } catch (e) {
    // 回滚事务
    await conn.rollback();
    console.error('更新文章失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  } finally {
    conn.release();
  }
});

/**
 * DELETE /api/articles/:id - 删除文章
 * 需要登录
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const [result] = await pool.execute(
      'DELETE FROM articles WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ code: 404, message: '文章不存在' });
    }

    // 级联删除标签关联（通过外键约束自动处理）

    res.json({ code: 200, message: '已删除' });
  } catch (e) {
    console.error('删除文章失败：', e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

module.exports = router;