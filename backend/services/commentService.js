/**
 * 评论 Service 层
 * 职责：封装所有评论相关的数据库查询逻辑
 */
const pool = require('../config/db');

/**
 * 获取评论列表（管理端，分页 + 筛选）
 */
async function getCommentsList({ article_id, page = 1, pageSize = 10 }) {
  let whereConditions = ['1=1'];
  let params = [];

  if (article_id) {
    whereConditions.push('c.article_id = ?');
    params.push(article_id);
  }

  const whereClause = whereConditions.join(' AND ');

  const [countResult] = await pool.execute(
    `SELECT COUNT(*) as total FROM comments c WHERE ${whereClause}`,
    params
  );
  const total = countResult[0].total;

  const offset = (page - 1) * pageSize;
  const safePageSize = Math.max(1, parseInt(pageSize, 10) || 10);
  const safeOffset = Math.max(0, parseInt(offset, 10) || 0);
  const [rows] = await pool.execute(
    `SELECT c.id, c.article_id, c.nickname, c.email, c.avatar_url, c.content,
            c.parent_id, c.status, c.ip_address, c.created_at,
            a.title as article_title
     FROM comments c
     LEFT JOIN articles a ON c.article_id = a.id
     WHERE ${whereClause}
     ORDER BY c.created_at DESC
     LIMIT ${safePageSize} OFFSET ${safeOffset}`,
    params
  );

  return {
    list: rows,
    pagination: { page, page_size: pageSize, total, total_pages: Math.ceil(total / pageSize) }
  };
}

/**
 * 获取文章评论（树形结构）。历史上明确拒绝的评论继续隐藏。
 */
async function getArticleComments(articleId) {
  const [rows] = await pool.execute(
    `SELECT id, article_id, nickname, email, avatar_url, content,
            parent_id, status, created_at
     FROM comments
    WHERE article_id = ? AND (status IS NULL OR status <> '已拒绝')
     ORDER BY created_at ASC`,
    [articleId]
  );

  // 构建树形结构
  const commentMap = new Map();
  rows.forEach(comment => {
    comment.children = [];
    commentMap.set(comment.id, comment);
  });

  const tree = [];
  rows.forEach(comment => {
    if (comment.parent_id && commentMap.has(comment.parent_id)) {
      commentMap.get(comment.parent_id).children.push(comment);
    } else {
      tree.push(comment);
    }
  });

  return tree;
}

/**
 * 发表评论
 */
async function createComment({ articleId, nickname, content, parent_id, ipAddress, avatar_url, email }) {
  const [result] = await pool.execute(
    `INSERT INTO comments (article_id, nickname, email, avatar_url, content, parent_id, status, ip_address)
     VALUES (?, ?, ?, ?, ?, ?, '已通过', ?)`,
    [
      articleId,
      nickname.trim(),
      email || null,
      (avatar_url && avatar_url.trim()) || null,
      content.trim(),
      parent_id || null,
      ipAddress
    ]
  );
  return result.insertId;
}

/**
 * 删除评论
 */
async function deleteComment(id) {
  const [result] = await pool.execute('DELETE FROM comments WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = {
  getCommentsList,
  getArticleComments,
  createComment,
  deleteComment
};
