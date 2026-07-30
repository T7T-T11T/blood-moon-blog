/**
 * 操作日志 Service 层
 * 职责：封装所有操作日志的数据库查询与记录逻辑
 */

const pool = require('../config/db');

/**
 * 记录操作日志
 * @param {Object} params - 日志参数
 * @param {number} params.user_id - 用户ID
 * @param {string} params.username - 用户名
 * @param {string} params.action - 操作类型（如：登录、创建文章、删除文章等）
 * @param {string} [params.resource_type] - 资源类型（如：article、comment、user等）
 * @param {number} [params.resource_id] - 资源ID
 * @param {string} [params.details] - 操作详情（JSON字符串）
 * @param {string} [params.ip_address] - IP地址
 * @param {string} [params.user_agent] - 用户代理
 * @returns {Promise<number>} 插入的日志ID
 */
async function log({
  user_id,
  username,
  action,
  resource_type,
  resource_id,
  details,
  ip_address,
  user_agent
}) {
  const [result] = await pool.execute(
    `INSERT INTO operation_logs (user_id, username, action, resource_type, resource_id, details, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      user_id,
      username,
      action,
      resource_type || null,
      resource_id || null,
      details || null,
      ip_address || null,
      user_agent || null
    ]
  );
  return result.insertId;
}

/**
 * 查询操作日志列表
 * @param {Object} params - 查询参数
 * @param {number} [params.user_id] - 用户ID（可选，筛选特定用户）
 * @param {string} [params.action] - 操作类型（可选，筛选特定操作）
 * @param {string} [params.resource_type] - 资源类型（可选，筛选特定资源）
 * @param {number} [params.resource_id] - 资源ID（可选，筛选特定资源）
 * @param {string} [params.start_date] - 开始日期（可选，YYYY-MM-DD）
 * @param {string} [params.end_date] - 结束日期（可选，YYYY-MM-DD）
 * @param {number} [params.page=1] - 页码
 * @param {number} [params.page_size=20] - 每页数量
 * @returns {Promise<Object>} 包含 list 和 pagination 的对象
 */
async function getLogs({
  user_id,
  action,
  resource_type,
  resource_id,
  start_date,
  end_date,
  page = 1,
  page_size = 20
}) {
  let whereConditions = [];
  let params = [];

  if (user_id) {
    whereConditions.push('user_id = ?');
    params.push(user_id);
  }
  if (action) {
    whereConditions.push('action = ?');
    params.push(action);
  }
  if (resource_type) {
    whereConditions.push('resource_type = ?');
    params.push(resource_type);
  }
  if (resource_id) {
    whereConditions.push('resource_id = ?');
    params.push(resource_id);
  }
  if (start_date) {
    whereConditions.push('DATE(created_at) >= ?');
    params.push(start_date);
  }
  if (end_date) {
    whereConditions.push('DATE(created_at) <= ?');
    params.push(end_date);
  }

  const whereClause = whereConditions.length > 0
    ? `WHERE ${whereConditions.join(' AND ')}`
    : '';

  // 查询总数
  const [countResult] = await pool.execute(
    `SELECT COUNT(*) as total FROM operation_logs ${whereClause}`,
    params
  );
  const total = countResult[0].total;

  // 查询列表
  const offset = (page - 1) * page_size;
  const [rows] = await pool.execute(
    `SELECT id, user_id, username, action, resource_type, resource_id,
            details, ip_address, user_agent, created_at
     FROM operation_logs
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, String(page_size), String(offset)]
  );

  return {
    list: rows,
    pagination: {
      page,
      page_size,
      total,
      total_pages: Math.ceil(total / page_size)
    }
  };
}

/**
 * 获取指定用户的所有操作日志
 * @param {number} userId - 用户ID
 * @param {number} [limit=100] - 限制数量
 * @returns {Promise<Array>} 日志列表
 */
async function getUserLogs(userId, limit = 100) {
  const [rows] = await pool.execute(
    `SELECT id, action, resource_type, resource_id, details, ip_address, created_at
     FROM operation_logs
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [userId, String(limit)]
  );
  return rows;
}

/**
 * 获取指定资源的所有操作日志
 * @param {string} resourceType - 资源类型
 * @param {number} resourceId - 资源ID
 * @param {number} [limit=50] - 限制数量
 * @returns {Promise<Array>} 日志列表
 */
async function getResourceLogs(resourceType, resourceId, limit = 50) {
  const [rows] = await pool.execute(
    `SELECT id, user_id, username, action, details, ip_address, created_at
     FROM operation_logs
     WHERE resource_type = ? AND resource_id = ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [resourceType, resourceId, String(limit)]
  );
  return rows;
}

/**
 * 获取操作统计（按操作类型分组）
 * @param {string} [start_date] - 开始日期（可选）
 * @param {string} [end_date] - 结束日期（可选）
 * @returns {Promise<Array>} 统计结果
 */
async function getActionStats(start_date, end_date) {
  let whereClause = '';
  const params = [];

  if (start_date && end_date) {
    whereClause = 'WHERE DATE(created_at) BETWEEN ? AND ?';
    params.push(start_date, end_date);
  } else if (start_date) {
    whereClause = 'WHERE DATE(created_at) >= ?';
    params.push(start_date);
  } else if (end_date) {
    whereClause = 'WHERE DATE(created_at) <= ?';
    params.push(end_date);
  }

  const [rows] = await pool.execute(
    `SELECT action, COUNT(*) as count
     FROM operation_logs
     ${whereClause}
     GROUP BY action
     ORDER BY count DESC`,
    params
  );
  return rows;
}

module.exports = {
  log,
  getLogs,
  getUserLogs,
  getResourceLogs,
  getActionStats
};