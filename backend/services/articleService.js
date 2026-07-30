/**
 * 文章 Service 层
 * 职责：封装所有文章相关的数据库查询与事务逻辑
 */
const pool = require('../config/db');

/**
 * 处理分页参数，确保为正整数
 * MySQL 预处理语句不允许 LIMIT/OFFSET 使用占位符，需直接拼接到 SQL
 * @param {number} pageSize - 每页数量
 * @param {number} offset - 偏移量
 * @returns {Object} 规范化后的分页参数
 */
function sanitizePagination(pageSize, offset) {
  const safePageSize = Math.max(1, parseInt(pageSize, 10) || 10);
  const safeOffset = Math.max(0, parseInt(offset, 10) || 0);
  return { safePageSize, safeOffset };
}

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
 * 只查询未被软删除的文章
 */
async function getPublishedArticles({ page = 1, pageSize = 10, category_id, tag_id, keyword }) {
  let whereConditions = ['a.status = ?', 'a.deleted_at IS NULL'];
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
  const { safePageSize, safeOffset } = sanitizePagination(pageSize, offset);
  const [rows] = await pool.execute(
    `SELECT DISTINCT a.id, a.title, a.summary, a.cover_image, a.status, a.view_count,
            a.category_id, a.created_at, a.updated_at, a.is_top,
            c.name as category_name, c.slug as category_slug
     ${fromClause}
     ${joinClause}
     LEFT JOIN categories c ON a.category_id = c.id
     WHERE ${whereClause}
     ORDER BY a.is_top DESC, a.created_at DESC
     LIMIT ${safePageSize} OFFSET ${safeOffset}`,
    params
  );

  const list = await attachTags(rows);
  return {
    list,
    pagination: { page, page_size: pageSize, total, total_pages: Math.ceil(total / pageSize) }
  };
}

/**
 * 获取最新文章
 * 只查询未被软删除的文章
 */
async function getLatestArticles(limit = 5) {
  const safeLimit = Math.max(1, parseInt(limit, 10) || 5);
  const [rows] = await pool.execute(
    `SELECT a.id, a.title, a.summary, a.cover_image, a.view_count,
            a.category_id, a.created_at,
            c.name as category_name, c.slug as category_slug
     FROM articles a
     LEFT JOIN categories c ON a.category_id = c.id
     WHERE a.status = '已发布' AND a.deleted_at IS NULL
     ORDER BY a.created_at DESC
     LIMIT ${safeLimit}`
  );
  return attachTags(rows);
}

/**
 * 获取热门文章
 * 只查询未被软删除的文章
 */
async function getHotArticles(limit = 5) {
  const safeLimit = Math.max(1, parseInt(limit, 10) || 5);
  const [rows] = await pool.execute(
    `SELECT a.id, a.title, a.summary, a.view_count,
            c.name as category_name, c.slug as category_slug
     FROM articles a
     LEFT JOIN categories c ON a.category_id = c.id
     WHERE a.status = '已发布' AND a.deleted_at IS NULL
     ORDER BY a.view_count DESC
     LIMIT ${safeLimit}`
  );
  return rows;
}

/**
 * 按分类获取文章
 * 只查询未被软删除的文章
 */
async function getArticlesByCategory({ slug, page = 1, pageSize = 10 }) {
  const [categories] = await pool.execute(
    'SELECT id, name, slug, description FROM categories WHERE slug = ?',
    [slug]
  );
  if (!categories.length) return { category: null };

  const category = categories[0];
  const [countResult] = await pool.execute(
    'SELECT COUNT(*) as total FROM articles WHERE status = ? AND deleted_at IS NULL AND category_id = ?',
    ['已发布', category.id]
  );

  const offset = (page - 1) * pageSize;
  const { safePageSize, safeOffset } = sanitizePagination(pageSize, offset);
  const [rows] = await pool.execute(
    `SELECT a.id, a.title, a.summary, a.cover_image, a.view_count,
            a.category_id, a.created_at,
            c.name as category_name, c.slug as category_slug
     FROM articles a
     LEFT JOIN categories c ON a.category_id = c.id
     WHERE a.status = '已发布' AND a.deleted_at IS NULL AND a.category_id = ?
     ORDER BY a.created_at DESC
     LIMIT ${safePageSize} OFFSET ${safeOffset}`,
    [category.id]
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
 * 只查询未被软删除的文章
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
     WHERE a.status = '已发布' AND a.deleted_at IS NULL AND at.tag_id = ?`,
    [tag.id]
  );

  const offset = (page - 1) * pageSize;
  const { safePageSize, safeOffset } = sanitizePagination(pageSize, offset);
  const [rows] = await pool.execute(
    `SELECT DISTINCT a.id, a.title, a.summary, a.cover_image, a.view_count,
            a.category_id, a.created_at,
            c.name as category_name, c.slug as category_slug
     FROM articles a
     JOIN article_tags at ON a.id = at.article_id
     LEFT JOIN categories c ON a.category_id = c.id
     WHERE a.status = '已发布' AND a.deleted_at IS NULL AND at.tag_id = ?
     ORDER BY a.created_at DESC
     LIMIT ${safePageSize} OFFSET ${safeOffset}`,
    [tag.id]
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
 * 只查询未被软删除的文章
 */
async function getArchives() {
  const [rows] = await pool.execute(
    `SELECT id, title, created_at
     FROM articles
     WHERE status = '已发布' AND deleted_at IS NULL
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
 * 只查询未被软删除的文章
 */
async function getPublishedArticleDetail(id) {
  const [rows] = await pool.execute(
    `SELECT a.*, c.name as category_name, c.slug as category_slug
     FROM articles a
     LEFT JOIN categories c ON a.category_id = c.id
     WHERE a.id = ? AND a.status = '已发布' AND a.deleted_at IS NULL`,
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

  // 获取上一篇和下一篇（排除已删除文章）
  const [prevResult] = await pool.execute(
    'SELECT id, title FROM articles WHERE id < ? AND status = ? AND deleted_at IS NULL ORDER BY id DESC LIMIT 1',
    [article.id, '已发布']
  );
  const [nextResult] = await pool.execute(
    'SELECT id, title FROM articles WHERE id > ? AND status = ? AND deleted_at IS NULL ORDER BY id ASC LIMIT 1',
    [article.id, '已发布']
  );
  article.prev_article = prevResult.length ? prevResult[0] : null;
  article.next_article = nextResult.length ? nextResult[0] : null;

  return article;
}

// ==================== 管理端查询 ====================

/**
 * 获取管理端文章列表（含草稿）
 * 只查询未被软删除的文章
 */
async function getAdminArticles({ userId, status, category_id, keyword }) {
  let sql = `SELECT a.id, a.title, a.summary, a.cover_image, a.status, a.view_count,
             a.category_id, a.created_at, a.updated_at,
             c.name as category_name
             FROM articles a
             LEFT JOIN categories c ON a.category_id = c.id
             WHERE a.user_id = ? AND a.deleted_at IS NULL`;
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
 * 只查询未被软删除的文章
 */
async function getAdminArticleDetail({ id, userId }) {
  const [rows] = await pool.execute(
    `SELECT a.*, c.name as category_name
     FROM articles a
     LEFT JOIN categories c ON a.category_id = c.id
     WHERE a.id = ? AND a.user_id = ? AND a.deleted_at IS NULL`,
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
 * 删除文章（软删除）
 * 将文章标记为已删除，移入回收站
 * @param {Object} params - 参数对象
 * @param {number} params.id - 文章ID
 * @param {number} params.userId - 用户ID
 * @returns {Promise<boolean>} 是否删除成功
 */
async function deleteArticle({ id, userId }) {
  const [result] = await pool.execute(
    'UPDATE articles SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
    [id, userId]
  );
  return result.affectedRows > 0;
}

/**
 * 切换文章置顶状态
 * @param {Object} params - 参数对象
 * @param {number} params.id - 文章ID
 * @param {number} params.userId - 用户ID
 * @returns {Promise<Object>} 包含新置顶状态的对象
 */
async function toggleTop({ id, userId }) {
  // 获取当前置顶状态
  const [articles] = await pool.execute(
    'SELECT is_top FROM articles WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
    [id, userId]
  );

  if (!articles.length) {
    return null;
  }

  const newTop = articles[0].is_top ? 0 : 1;
  await pool.execute(
    'UPDATE articles SET is_top = ? WHERE id = ? AND user_id = ?',
    [newTop, id, userId]
  );

  return { is_top: newTop };
}

/**
 * 全站搜索文章（按标题和内容模糊匹配）
 * 转义用户输入中的 LIKE 通配符，防止搜索逻辑被注入
 * 只查询未被软删除的文章
 */
async function searchArticles({ keyword, page = 1, pageSize = 10 }) {
  const safeKeyword = escapeLike(keyword);
  const searchTerm = `%${safeKeyword}%`;

  const [countResult] = await pool.execute(
    `SELECT COUNT(*) as total
     FROM articles
     WHERE status = '已发布' AND deleted_at IS NULL AND (title LIKE ? OR content LIKE ?)`,
    [searchTerm, searchTerm]
  );
  const total = countResult[0].total;

  const offset = (page - 1) * pageSize;
  const { safePageSize, safeOffset } = sanitizePagination(pageSize, offset);
  const [rows] = await pool.execute(
    `SELECT a.id, a.title, a.summary, a.cover_image, a.status, a.view_count,
            a.category_id, a.created_at, a.updated_at,
            c.name as category_name, c.slug as category_slug
     FROM articles a
     LEFT JOIN categories c ON a.category_id = c.id
     WHERE a.status = '已发布' AND a.deleted_at IS NULL AND (a.title LIKE ? OR a.content LIKE ?)
     ORDER BY a.created_at DESC
     LIMIT ${safePageSize} OFFSET ${safeOffset}`,
    [searchTerm, searchTerm]
  );

  const list = await attachTags(rows);
  return {
    keyword,
    list,
    pagination: { page, page_size: pageSize, total, total_pages: Math.ceil(total / pageSize) }
  };
}

/**
 * 获取相关文章（按同分类或同标签推荐）
 * 只查询未被软删除的文章
 * @param {number} articleId - 当前文章ID
 * @param {number} limit - 返回数量，默认5篇
 * @returns {Promise<Array>} 相关文章列表
 */
async function getRelatedArticles(articleId, limit = 5) {
  // 先获取当前文章的分类和标签
  const [currentArticle] = await pool.execute(
    'SELECT category_id FROM articles WHERE id = ? AND deleted_at IS NULL',
    [articleId]
  );

  if (!currentArticle.length) return [];

  const categoryId = currentArticle[0].category_id;

  // 获取当前文章的标签
  const [currentTags] = await pool.execute(
    'SELECT tag_id FROM article_tags WHERE article_id = ?',
    [articleId]
  );
  const tagIds = currentTags.map((t) => t.tag_id);

  // 构建查询：优先同分类，其次同标签，排除当前文章
  let query = `
    SELECT DISTINCT a.id, a.title, a.summary, a.cover_image, a.view_count,
           a.created_at, c.name AS category_name
    FROM articles a
    LEFT JOIN categories c ON a.category_id = c.id
    LEFT JOIN article_tags at ON a.id = at.article_id
    WHERE a.status = '已发布' AND a.deleted_at IS NULL AND a.id != ?`;

  const params = [articleId];

  // 同分类或同标签
  const conditions = [];
  if (categoryId) {
    conditions.push('a.category_id = ?');
    params.push(categoryId);
  }
  if (tagIds.length > 0) {
    conditions.push(`at.tag_id IN (${tagIds.map(() => '?').join(',')})`);
    params.push(...tagIds);
  }

  if (conditions.length > 0) {
    query += ` AND (${conditions.join(' OR ')})`;
  }

  query += ` ORDER BY a.view_count DESC, a.created_at DESC LIMIT ${Math.max(limit, 1)}`;

  const [rows] = await pool.execute(query, params);
  return rows;
}

// ==================== 回收站功能 ====================

/**
 * 获取回收站文章列表（支持分页）
 * 查询已被软删除的文章
 * @param {Object} params - 查询参数
 * @param {number} params.userId - 用户ID
 * @param {number} [params.page=1] - 页码
 * @param {number} [params.pageSize=20] - 每页数量
 * @returns {Promise<Object>} 包含 list 和 pagination 的对象
 */
async function getTrashArticles({ userId, page = 1, pageSize = 20 }) {
  // 查询总数
  const [countResult] = await pool.execute(
    'SELECT COUNT(*) as total FROM articles WHERE user_id = ? AND deleted_at IS NOT NULL',
    [userId]
  );
  const total = countResult[0].total;

  const offset = (page - 1) * pageSize;
  const { safePageSize, safeOffset } = sanitizePagination(pageSize, offset);
  const [rows] = await pool.execute(
    `SELECT a.id, a.title, a.summary, a.cover_image, a.status, a.view_count,
            a.category_id, a.created_at, a.updated_at, a.deleted_at,
            c.name as category_name
     FROM articles a
     LEFT JOIN categories c ON a.category_id = c.id
     WHERE a.user_id = ? AND a.deleted_at IS NOT NULL
     ORDER BY a.deleted_at DESC
     LIMIT ${safePageSize} OFFSET ${safeOffset}`,
    [userId]
  );

  const list = await attachTags(rows);
  return {
    list,
    pagination: {
      page,
      page_size: pageSize,
      total,
      total_pages: Math.ceil(total / pageSize)
    }
  };
}

/**
 * 恢复文章
 * 将回收站中的文章恢复到正常状态
 * @param {Object} params - 参数对象
 * @param {number} params.id - 文章ID
 * @param {number} params.userId - 用户ID
 * @returns {Promise<boolean>} 是否恢复成功
 */
async function restoreArticle({ id, userId }) {
  const [result] = await pool.execute(
    'UPDATE articles SET deleted_at = NULL WHERE id = ? AND user_id = ? AND deleted_at IS NOT NULL',
    [id, userId]
  );
  return result.affectedRows > 0;
}

/**
 * 永久删除文章
 * 从数据库中彻底删除文章（物理删除）
 * @param {Object} params - 参数对象
 * @param {number} params.id - 文章ID
 * @param {number} params.userId - 用户ID
 * @returns {Promise<boolean>} 是否删除成功
 */
async function permanentDeleteArticle({ id, userId }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 删除文章的标签关联
    await conn.execute('DELETE FROM article_tags WHERE article_id = ?', [id]);

    // 永久删除文章
    const [result] = await conn.execute(
      'DELETE FROM articles WHERE id = ? AND user_id = ? AND deleted_at IS NOT NULL',
      [id, userId]
    );

    if (!result.affectedRows) {
      await conn.rollback();
      return false;
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
 * 清空回收站（永久删除所有已软删除的文章）
 * @param {Object} params - 参数对象
 * @param {number} params.userId - 用户ID
 * @returns {Promise<number>} 删除的文章数量
 */
async function clearAllTrash({ userId }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 获取所有要删除的文章ID
    const [articles] = await conn.execute(
      'SELECT id FROM articles WHERE user_id = ? AND deleted_at IS NOT NULL',
      [userId]
    );

    const ids = articles.map((a) => a.id);
    if (ids.length === 0) {
      await conn.commit();
      return 0;
    }

    // 删除所有文章的标签关联
    const placeholders = ids.map(() => '?').join(',');
    await conn.execute(
      `DELETE FROM article_tags WHERE article_id IN (${placeholders})`,
      ids
    );

    // 永久删除文章
    const [result] = await conn.execute(
      `DELETE FROM articles WHERE id IN (${placeholders})`,
      ids
    );

    await conn.commit();
    return result.affectedRows;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

// ==================== 导出功能 ====================

/**
 * 导出文章为 Markdown 或 HTML 格式
 * @param {Object} params - 参数对象
 * @param {number} params.id - 文章ID
 * @param {number} params.userId - 用户ID
 * @param {string} params.format - 导出格式 (markdown / html)
 * @returns {Promise<Object>} 包含文件名和内容的对象
 */
async function exportArticle({ id, userId, format = 'markdown' }) {
  const [articles] = await pool.execute(
    `SELECT a.id, a.title, a.content, a.summary, a.status, a.created_at, a.updated_at,
            c.name as category_name
     FROM articles a
     LEFT JOIN categories c ON a.category_id = c.id
     WHERE a.id = ? AND a.user_id = ? AND a.deleted_at IS NULL`,
    [id, userId]
  );

  if (!articles.length) {
    return null;
  }

  const article = articles[0];

  // 获取标签
  const [tags] = await pool.execute(
    `SELECT t.name FROM tags t
     JOIN article_tags at ON t.id = at.tag_id
     WHERE at.article_id = ?`,
    [id]
  );
  const tagNames = tags.map((t) => t.name);

  if (format === 'markdown') {
    const frontmatter = [
      '---',
      `title: "${article.title.replace(/"/g, '\\"')}"`,
      `date: ${article.created_at.toISOString().split('T')[0]}`,
      `category: ${article.category_name || '未分类'}`,
      `tags: [${tagNames.map((t) => `"${t}"`).join(', ')}]`,
      `status: ${article.status}`,
      article.summary ? `summary: "${article.summary.replace(/"/g, '\\"')}"` : '',
      '---',
      ''
    ].filter(Boolean).join('\n');

    const content = `${frontmatter}\n# ${article.title}\n\n${article.content}`;
    const fileName = `${article.title}_${Date.now()}.md`.replace(/[^\w\u4e00-\u9fa5.-]/g, '_');
    return { fileName, content, contentType: 'text/markdown' };
  }

  if (format === 'html') {
    const meta = `<!--
  标题: ${article.title}
  分类: ${article.category_name || '未分类'}
  标签: ${tagNames.join(', ')}
  状态: ${article.status}
  创建时间: ${article.created_at}
  更新时间: ${article.updated_at}
-->`;

    const content = `${meta}
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${article.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; color: #333; }
    h1 { border-bottom: 2px solid #007bff; padding-bottom: 10px; }
    h2, h3 { color: #2c3e50; }
    pre { background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; }
    code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; }
    blockquote { border-left: 4px solid #007bff; margin: 0; padding: 10px 20px; background: #f8f9fa; }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body>
  <h1>${article.title}</h1>
  <div class="meta" style="color: #666; font-size: 14px; margin-bottom: 20px;">
    ${article.category_name ? `<span>分类: ${article.category_name}</span>` : ''}
    ${tagNames.length ? `<span style="margin-left: 10px;">标签: ${tagNames.join(', ')}</span>` : ''}
  </div>
  <article>${article.content}</article>
</body>
</html>`;
    const fileName = `${article.title}_${Date.now()}.html`.replace(/[^\w\u4e00-\u9fa5.-]/g, '_');
    return { fileName, content, contentType: 'text/html' };
  }

  return null;
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
  getRelatedArticles,
  getAdminArticles,
  getAdminArticleDetail,
  createArticle,
  updateArticle,
  deleteArticle,
  toggleTop,
  getTrashArticles,
  restoreArticle,
  permanentDeleteArticle,
  clearAllTrash,
  exportArticle
};
