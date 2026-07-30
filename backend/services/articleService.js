/**
 * 文章 Service 层
 * 职责：封装所有文章相关的数据库查询与事务逻辑
 */
const pool = require('../config/db');

/**
 * 转义 SQL LIKE 通配符
 * 防止用户输入的 %、_、\ 被 LIKE 当作通配符解释
 * @param {string} str - 原始字符串
 * @returns {string} 转义后的字符串
 */
function escapeLike(str) {
  return str.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/**
 * 为文章列表批量附加标签（单次 SQL 查询，避免 N+1 问题）
 * @param {Array} articles - 文章数组（需含 id 字段）
 * @returns {Array} 附加 tags 字段后的文章数组
 */
async function attachTags(articles) {
  if (!articles.length) return articles;

  // 收集所有文章 ID
  const articleIds = articles.map((a) => a.id);
  const placeholders = articleIds.map(() => '?').join(',');

  // 单次批量查询所有文章的标签
  const [tagRows] = await pool.execute(
    `SELECT at.article_id, t.id, t.name, t.slug
     FROM tags t
     JOIN article_tags at ON t.id = at.tag_id
     WHERE at.article_id IN (${placeholders})`,
    articleIds
  );

  // 按 article_id 分组
  const tagsMap = tagRows.reduce((map, row) => {
    if (!map[row.article_id]) map[row.article_id] = [];
    map[row.article_id].push({ id: row.id, name: row.name, slug: row.slug });
    return map;
  }, {});

  return articles.map((article) => ({
    ...article,
    tags: tagsMap[article.id] || []
  }));
}

// ==================== 公开查询 ====================

/**
 * 获取已发布文章列表（分页、筛选）
 */
async function getPublishedArticles({ page = 1, pageSize = 10, category_id, tag_id, keyword }) {
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
  let fromClause = 'FROM articles a';
  let joinClause = '';

  if (tag_id) {
    joinClause = 'JOIN article_tags at ON a.id = at.article_id AND at.tag_id = ?';
    params.push(tag_id);
  }

  const [countResult] = await pool.execute(
    `SELECT COUNT(DISTINCT a.id) as total ${fromClause} ${joinClause} WHERE ${whereClause}`,
    params
  );
  const total = countResult[0].total;

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

  const list = await attachTags(rows);
  return {
    list,
    pagination: { page, page_size: pageSize, total, total_pages: Math.ceil(total / pageSize) }
  };
}

/**
 * 获取最新文章
 */
async function getLatestArticles(limit = 5) {
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
  return attachTags(rows);
}

/**
 * 获取热门文章
 */
async function getHotArticles(limit = 5) {
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
  return rows;
}

/**
 * 按分类获取文章
 */
async function getArticlesByCategory({ slug, page = 1, pageSize = 10 }) {
  const [categories] = await pool.execute(
    'SELECT id, name, slug, description FROM categories WHERE slug = ?',
    [slug]
  );
  if (!categories.length) return { category: null };

  const category = categories[0];
  const [countResult] = await pool.execute(
    'SELECT COUNT(*) as total FROM articles WHERE status = ? AND category_id = ?',
    ['已发布', category.id]
  );

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

  const list = await attachTags(rows);
  return {
    category,
    list,
    pagination: { page, page_size: pageSize, total: countResult[0].total, total_pages: Math.ceil(countResult[0].total / pageSize) }
  };
}

/**
 * 按标签获取文章
 */
async function getArticlesByTag({ slug, page = 1, pageSize = 10 }) {
  const [tags] = await pool.execute(
    'SELECT id, name, slug FROM tags WHERE slug = ?',
    [slug]
  );
  if (!tags.length) return { tag: null };

  const tag = tags[0];
  const [countResult] = await pool.execute(
    `SELECT COUNT(DISTINCT a.id) as total
     FROM articles a
     JOIN article_tags at ON a.id = at.article_id
     WHERE a.status = '已发布' AND at.tag_id = ?`,
    [tag.id]
  );

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

  const list = await attachTags(rows);
  return {
    tag,
    list,
    pagination: { page, page_size: pageSize, total: countResult[0].total, total_pages: Math.ceil(countResult[0].total / pageSize) }
  };
}

/**
 * 获取文章归档
 */
async function getArchives() {
  const [rows] = await pool.execute(
    `SELECT id, title, created_at
     FROM articles
     WHERE status = '已发布'
     ORDER BY created_at DESC`
  );

  const archives = {};
  rows.forEach(article => {
    const date = new Date(article.created_at);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const key = `${year}-${month}`;

    if (!archives[key]) {
      archives[key] = {
        year,
        month: parseInt(month),
        label: `${year}年${parseInt(month)}月`,
        articles: []
      };
    }
    archives[key].articles.push(article);
  });

  return Object.values(archives).sort((a, b) => b.year - a.year || b.month - a.month);
}

/**
 * 获取已发布文章详情（含上一篇/下一篇、标签）
 */
async function getPublishedArticleDetail(id) {
  const [rows] = await pool.execute(
    `SELECT a.*, c.name as category_name, c.slug as category_slug
     FROM articles a
     LEFT JOIN categories c ON a.category_id = c.id
     WHERE a.id = ? AND a.status = '已发布'`,
    [id]
  );
  if (!rows.length) return null;

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

  // 获取上一篇和下一篇
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

  return article;
}

// ==================== 管理端查询 ====================

/**
 * 获取管理端文章列表（含草稿）
 */
async function getAdminArticles({ userId, status, category_id, keyword }) {
  let sql = `SELECT a.id, a.title, a.summary, a.cover_image, a.status, a.view_count,
             a.category_id, a.created_at, a.updated_at,
             c.name as category_name
             FROM articles a
             LEFT JOIN categories c ON a.category_id = c.id
             WHERE a.user_id = ?`;
  let params = [userId];

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
  return attachTags(rows);
}

/**
 * 获取管理端文章详情
 */
async function getAdminArticleDetail({ id, userId }) {
  const [rows] = await pool.execute(
    `SELECT a.*, c.name as category_name
     FROM articles a
     LEFT JOIN categories c ON a.category_id = c.id
     WHERE a.id = ? AND a.user_id = ?`,
    [id, userId]
  );
  if (!rows.length) return null;

  const article = rows[0];
  const [tagRows] = await pool.execute(
    `SELECT t.id, t.name, t.slug
     FROM tags t
     JOIN article_tags at ON t.id = at.tag_id
     WHERE at.article_id = ?`,
    [article.id]
  );
  article.tags = tagRows;
  return article;
}

// ==================== 写操作（事务） ====================

/**
 * 创建文章
 */
async function createArticle({ title, content, summary, cover_image, status, category_id, tag_ids, userId }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.execute(
      `INSERT INTO articles (title, content, summary, cover_image, status, category_id, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title.trim(), content, summary || null, cover_image || null, status || '已发布', category_id || null, userId]
    );
    const articleId = result.insertId;

    if (tag_ids && Array.isArray(tag_ids) && tag_ids.length > 0) {
      const tagValues = tag_ids.map(tagId => [articleId, tagId]);
      await conn.query('INSERT INTO article_tags (article_id, tag_id) VALUES ?', [tagValues]);
    }

    await conn.commit();
    return articleId;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

/**
 * 更新文章
 */
async function updateArticle({ id, title, content, summary, cover_image, status, category_id, tag_ids, userId }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.execute(
      `UPDATE articles
       SET title = ?, content = ?, summary = ?, cover_image = ?, status = ?, category_id = ?
       WHERE id = ? AND user_id = ?`,
      [title.trim(), content, summary || null, cover_image || null, status || '已发布', category_id || null, id, userId]
    );

    if (!result.affectedRows) {
      await conn.rollback();
      return null;
    }

    await conn.execute('DELETE FROM article_tags WHERE article_id = ?', [id]);

    if (tag_ids && Array.isArray(tag_ids) && tag_ids.length > 0) {
      const tagValues = tag_ids.map(tagId => [id, tagId]);
      await conn.query('INSERT INTO article_tags (article_id, tag_id) VALUES ?', [tagValues]);
    }

    await conn.commit();
    return true;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

/**
 * 删除文章
 */
async function deleteArticle({ id, userId }) {
  const [result] = await pool.execute(
    'DELETE FROM articles WHERE id = ? AND user_id = ?',
    [id, userId]
  );
  return result.affectedRows > 0;
}

/**
 * 全站搜索文章（按标题和内容模糊匹配）
 * 转义用户输入中的 LIKE 通配符，防止搜索逻辑被注入
 */
async function searchArticles({ keyword, page = 1, pageSize = 10 }) {
  const safeKeyword = escapeLike(keyword);
  const searchTerm = `%${safeKeyword}%`;

  const [countResult] = await pool.execute(
    `SELECT COUNT(*) as total
     FROM articles
     WHERE status = '已发布' AND (title LIKE ? OR content LIKE ?)`,
    [searchTerm, searchTerm]
  );
  const total = countResult[0].total;

  const offset = (page - 1) * pageSize;
  const [rows] = await pool.execute(
    `SELECT a.id, a.title, a.summary, a.cover_image, a.status, a.view_count,
            a.category_id, a.created_at, a.updated_at,
            c.name as category_name, c.slug as category_slug
     FROM articles a
     LEFT JOIN categories c ON a.category_id = c.id
     WHERE a.status = '已发布' AND (a.title LIKE ? OR a.content LIKE ?)
     ORDER BY a.created_at DESC
     LIMIT ? OFFSET ?`,
    [searchTerm, searchTerm, String(pageSize), String(offset)]
  );

  const list = await attachTags(rows);
  return {
    keyword,
    list,
    pagination: { page, page_size: pageSize, total, total_pages: Math.ceil(total / pageSize) }
  };
}

module.exports = {
  getPublishedArticles,
  getLatestArticles,
  getHotArticles,
  getArticlesByCategory,
  getArticlesByTag,
  getArchives,
  getPublishedArticleDetail,
  searchArticles,
  getAdminArticles,
  getAdminArticleDetail,
  createArticle,
  updateArticle,
  deleteArticle
};
