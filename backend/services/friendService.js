/**
 * 友链 Service 层
 * 职责：封装 friends 表的所有数据库查询
 */
const pool = require('../config/db');

/**
 * 获取所有已通过友链（公开）
 */
async function getPublicFriends() {
  const [rows] = await pool.execute(
    `SELECT id, name, url, description, avatar, sort_order, status, created_at
     FROM friends
     WHERE status = '已通过'
     ORDER BY sort_order ASC`
  );
  return rows;
}

/**
 * 获取所有友链（管理端，含待审核）
 */
async function getAllFriends() {
  const [rows] = await pool.execute(
    `SELECT id, name, url, description, avatar, sort_order, status, created_at
     FROM friends
     ORDER BY sort_order ASC`
  );
  return rows;
}

/**
 * 创建友链
 */
async function createFriend({ name, url, description, avatar, sort_order, status }) {
  const [result] = await pool.execute(
    `INSERT INTO friends (name, url, description, avatar, sort_order, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      name.trim(),
      url.trim(),
      description || null,
      avatar || null,
      sort_order !== undefined ? sort_order : 0,
      status || '已通过'
    ]
  );
  return result.insertId;
}

/**
 * 更新友链
 */
async function updateFriend(id, { name, url, description, avatar, sort_order, status }) {
  const [existing] = await pool.execute('SELECT id FROM friends WHERE id = ?', [id]);
  if (!existing.length) return null;

  await pool.execute(
    `UPDATE friends
     SET name = ?, url = ?, description = ?, avatar = ?, sort_order = ?, status = ?
     WHERE id = ?`,
    [
      name.trim(),
      url.trim(),
      description || null,
      avatar || null,
      sort_order !== undefined ? sort_order : 0,
      status || '已通过',
      id
    ]
  );
  return true;
}

/**
 * 删除友链
 */
async function deleteFriend(id) {
  const [result] = await pool.execute('DELETE FROM friends WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = {
  getPublicFriends,
  getAllFriends,
  createFriend,
  updateFriend,
  deleteFriend
};
