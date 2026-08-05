/**
 * 操作日志中间件
 * 作用：自动记录用户操作到日志表
 *
 * 使用方式：
 * 1. 在路由上添加中间件：router.post('/articles', logAction('创建文章'), controller)
 * 2. 中间件会在请求处理完成后自动记录日志
 * 3. 支持从 req.user 获取用户信息，从 req.body 获取操作详情
 */

const logService = require('../services/logService');

/**
 * 操作日志记录中间件工厂函数
 * @param {string} action - 操作类型（如：登录、创建文章、删除文章等）
 * @param {Object} options - 配置选项
 * @param {string} [options.resource_type] - 资源类型（如：article、comment、user等）
 * @param {Function} [options.getResourceId] - 从 req 获取资源ID的函数，默认从 req.params.id 获取
 * @param {Function} [options.getDetails] - 从 req 获取详情的函数，可用于自定义记录内容
 * @returns {Function} Express 中间件函数
 */
function logAction(action, options = {}) {
  const { resource_type, getResourceId, getDetails } = options;

  return async (req, res, next) => {
    // 保存原始的 res.json 方法
    const originalJson = res.json.bind(res);

    // 重写 res.json 方法，在响应后记录日志
    res.json = function (data) {
      // 先调用原始的 json 方法返回响应
      originalJson(data);

      // 仅在响应成功时记录日志（code 为 200）
      if (data && data.code === 200 && req.user) {
        // 异步记录日志，不阻塞响应
        recordLog(req, action, resource_type, getResourceId, getDetails).catch(err => {
          console.error('记录操作日志失败：', err);
        });
      }
    };

    next();
  };
}

/**
 * 异步记录操作日志
 * @param {Object} req - Express 请求对象
 * @param {string} action - 操作类型
 * @param {string} resource_type - 资源类型
 * @param {Function} getResourceId - 获取资源ID的函数
 * @param {Function} getDetails - 获取详情的函数
 */
async function recordLog(req, action, resource_type, getResourceId, getDetails) {
  try {
    const user_id = req.user.id;
    const username = req.user.username;

    // 获取资源ID
    let resource_id = null;
    if (getResourceId) {
      resource_id = await getResourceId(req);
    } else if (req.params && req.params.id) {
      resource_id = parseInt(req.params.id);
    }

    // 获取详情
    let details = null;
    if (getDetails) {
      const detailData = await getDetails(req);
      details = JSON.stringify(detailData);
    } else if (req.body && Object.keys(req.body).length > 0) {
      // 默认记录请求体（排除敏感信息）
      const safeBody = { ...req.body };
      if (safeBody.password) safeBody.password = '******';
      if (safeBody.password_hash) safeBody.password_hash = '******';
      details = JSON.stringify(safeBody);
    }

    // 获取 IP 地址和用户代理
    const ip_address = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const user_agent = req.headers['user-agent'];

    // 记录日志
    await logService.log({
      user_id,
      username,
      action,
      resource_type,
      resource_id,
      details,
      ip_address,
      user_agent
    });
  } catch (error) {
    console.error('记录操作日志失败：', error);
  }
}

/**
 * 登录日志中间件（特殊处理）
 * 需要在登录成功后手动调用
 * @param {Object} req - Express 请求对象
 * @param {Object} user - 用户对象（包含 id 和 username）
 */
async function logLogin(req, user) {
  const ip_address = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const user_agent = req.headers['user-agent'];

  await logService.log({
    user_id: user.id,
    username: user.username,
    action: '登录',
    resource_type: 'user',
    resource_id: user.id,
    details: JSON.stringify({ login_time: new Date().toISOString() }),
    ip_address,
    user_agent
  });
}

module.exports = {
  logAction,
  logLogin
};