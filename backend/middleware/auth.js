/**
 * JWT 认证中间件
 * 作用：验证请求头中的 token，提取用户信息，保护需要登录的路由
 *
 * 工作流程：
 * 1. 从请求头 Authorization 中取出 token
 * 2. 用 JWT 验证 token 是否有效
 * 3. 有效则把用户信息挂到 req.user 上，放行请求
 * 4. 无效则返回 401 未授权
 */

const jwt = require('jsonwebtoken')

// JWT 密钥 —— 从环境变量读取，缺失时拒绝启动（防止生产环境使用弱默认值）
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET 未配置！请在 .env 文件中设置一个随机强密钥（至少32字符）')
}

// token 有效期：默认 7 天，可通过环境变量配置
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

/**
 * 生成 JWT token
 * @param {Object} payload - 要加密的数据（通常是 { id, username }）
 * @returns {string} 生成的 token 字符串
 */
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

/**
 * 认证中间件函数
 * 用法：在路由前加 authMiddleware，如 router.get('/tasks', authMiddleware, ...)
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 * @param {Function} next - 下一个中间件函数
 */
function authMiddleware(req, res, next) {
  // 从请求头获取 Authorization 字段，格式为 "Bearer <token>"
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ code: 401, message: '未提供认证token，请先登录' })
  }

  // 提取 token（去掉 "Bearer " 前缀）
  const token = authHeader.split(' ')[1]

  try {
    // 验证 token，成功则解出 payload（{ id, username }）
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded // 把用户信息挂到 req 上，后续路由可以用 req.user.id
    next() // 放行
  } catch (err) {
    return res.status(401).json({ code: 401, message: 'token无效或已过期，请重新登录' })
  }
}

module.exports = {
  generateToken,
  authMiddleware,
  JWT_SECRET
}
