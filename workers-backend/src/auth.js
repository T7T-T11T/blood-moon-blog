/**
 * 认证模块 - JWT 验证与用户认证（Web Crypto API 版本）
 *
 * 功能：
 * - JWT Token 生成与验证（使用 Web Crypto API，不依赖 jsonwebtoken）
 * - 密码哈希（使用 PBKDF2，不依赖 bcryptjs）
 * - 认证中间件
 *
 * 注意：Cloudflare Workers 环境不支持 Node.js 的 crypto 模块，
 *       因此使用 Web Crypto API 原生实现 JWT 和密码哈希
 */

/**
 * Base64URL 编码
 * @param {ArrayBuffer|Uint8Array} data - 要编码的数据
 * @returns {string} Base64URL 字符串
 */
function base64UrlEncode(data) {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Base64URL 解码
 * @param {string} str - Base64URL 字符串
 * @returns {Uint8Array} 解码后的字节数组
 */
function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  while (str.length % 4) str += '='
  const binary = atob(str)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/**
 * 将字符串转换为 Uint8Array
 * @param {string} str - 输入字符串
 * @returns {Uint8Array} 字节数组
 */
function stringToBytes(str) {
  return new TextEncoder().encode(str)
}

/**
 * 将 Uint8Array 转换为十六进制字符串
 * @param {Uint8Array} bytes - 字节数组
 * @returns {string} 十六进制字符串
 */
function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * 将十六进制字符串转换为 Uint8Array
 * @param {string} hex - 十六进制字符串
 * @returns {Uint8Array} 字节数组
 */
function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16)
  }
  return bytes
}

/**
 * JWT/HMAC 密钥缺失时的兜底密钥
 * 当用户未配置 JWT_SECRET Secret 时使用
 * 生产环境建议通过 wrangler secret put JWT_SECRET 配置
 */
const FALLBACK_JWT_SECRET = 'blood-moon-blog-default-jwt-secret-change-me-2026'

/**
 * 从环境变量获取 JWT 密钥，缺失时返回兜底值
 * @param {Object} env - Hono Context 环境变量对象
 * @returns {string} JWT 密钥字符串
 */
function getJwtSecret(env) {
  const secret = env?.JWT_SECRET
  if (secret && typeof secret === 'string' && secret.length >= 8) return secret
  return FALLBACK_JWT_SECRET
}

/**
 * 导入 HMAC 密钥
 * @param {string} secret - 密钥字符串
 * @returns {Promise<CryptoKey>} CryptoKey 对象
 */
async function importHmacKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    stringToBytes(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

/**
 * 密码哈希（使用 PBKDF2 + SHA-256）
 * @param {string} password - 原始密码
 * @returns {Promise<string>} 哈希后的密码（格式：pbkdf2$iterations$salt$hash）
 */
export async function hashPassword(password) {
  const iterations = 100000
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    stringToBytes(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  )
  return `pbkdf2$${iterations}$${bytesToHex(salt)}$${bytesToHex(new Uint8Array(derivedBits))}`
}

/**
 * 验证密码
 * @param {string} password - 原始密码
 * @param {string} storedHash - 存储的哈希值
 * @returns {Promise<boolean>} 是否匹配
 */
export async function verifyPassword(password, storedHash) {
  // 兼容 bcrypt 哈希（Workers 不支持 bcrypt，提示重置密码）
  if (!storedHash) return false
  if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$')) {
    console.warn('[Auth] bcrypt 格式检测，请执行密码重置 SQL')
    return false
  }

  // PBKDF2 格式：pbkdf2$iterations$salt$hash
  const parts = storedHash.split('$')
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false

  const iterations = parseInt(parts[1])
  if (isNaN(iterations)) return false
  const salt = hexToBytes(parts[2])
  const storedHashBytes = hexToBytes(parts[3])

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    stringToBytes(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  )

  // 安全比较（恒定时间）
  const derivedBytes = new Uint8Array(derivedBits)
  if (derivedBytes.length !== storedHashBytes.length) return false
  let diff = 0
  for (let i = 0; i < derivedBytes.length; i++) diff |= derivedBytes[i] ^ storedHashBytes[i]
  return diff === 0
}

/**
 * 生成 JWT Token
 * @param {Object} payload - Token 载荷（包含 userId, username, role）
 * @param {string} secret - JWT 签名密钥（若未配置则取兜底）
 * @param {Object} env - Hono 环境变量（用于取 JWT_SECRET）
 * @returns {Promise<string>} JWT Token
 */
export async function generateToken(payload, secret, env) {
  // 兼容直接传入 env 的旧用法
  const jwtSecret = env ? getJwtSecret({ JWT_SECRET: secret, ...env }) : (secret || getJwtSecret())
  const finalSecret = typeof secret === 'string' && secret.length > 4 ? secret : getJwtSecret(env)

  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + 7 * 24 * 60 * 60
  }
  const headerB64 = base64UrlEncode(stringToBytes(JSON.stringify(header)))
  const payloadB64 = base64UrlEncode(stringToBytes(JSON.stringify(tokenPayload)))
  const data = `${headerB64}.${payloadB64}`
  const key = await importHmacKey(finalSecret)
  const signature = await crypto.subtle.sign('HMAC', key, stringToBytes(data))
  return `${data}.${base64UrlEncode(signature)}`
}

/**
 * 验证 JWT Token
 * @param {string} token - JWT Token
 * @param {string} secret - JWT 密钥（可以传 c.env.JWT_SECRET，会自动兜底）
 * @returns {Promise<Object|null>} 解码后的载荷，失败返回 null
 */
export async function verifyToken(token, secret) {
  const finalSecret = (typeof secret === 'string' && secret.length > 4) ? secret : FALLBACK_JWT_SECRET
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const [headerB64, payloadB64, signatureB64] = parts
    const data = `${headerB64}.${payloadB64}`

    // 验证签名
    const key = await importHmacKey(finalSecret)
    const signature = base64UrlDecode(signatureB64)
    const valid = await crypto.subtle.verify('HMAC', key, signature, stringToBytes(data))
    if (!valid) return null

    // 解码载荷
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64)))

    // 检查过期时间
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp && payload.exp < now) return null

    return payload
  } catch {
    return null
  }
}

/**
 * 认证中间件 - 验证请求中的 JWT Token
 * @param {Object} c - Hono Context
 * @param {Function} next - 下一步中间件
 */
export async function authMiddleware(c, next) {
  const authHeader = c.req.header('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({
      code: 401,
      message: '未登录或登录已过期'
    }, 401)
  }

  const token = authHeader.split(' ')[1]
  const secret = getJwtSecret(c.env)

  const payload = await verifyToken(token, secret)
  if (!payload) {
    return c.json({
      code: 401,
      message: 'Token 无效或已过期'
    }, 401)
  }

  // 将用户信息存入 Context
  c.set('user', payload)
  await next()
}

/**
 * 管理员权限中间件
 * 必须在 authMiddleware 之后使用
 */
export async function adminMiddleware(c, next) {
  const user = c.get('user')

  if (!user || user.role !== 'admin') {
    return c.json({
      code: 403,
      message: '权限不足，需要管理员权限'
    }, 403)
  }

  await next()
}

/**
 * 静默 Token 验证（仅用于点赞/收藏等操作的匿名用户识别）
 * 不抛错，未登录返回 null
 * @param {string} authHeader - Authorization 请求头
 * @param {string} secret - JWT 密钥
 * @returns {Promise<Object|null>} 载荷或 null
 */
export async function verifyTokenSilently(authHeader, secret) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  const token = authHeader.split(' ')[1]
  const finalSecret = (typeof secret === 'string' && secret.length > 4) ? secret : FALLBACK_JWT_SECRET
  return verifyToken(token, finalSecret)
}

/**
 * 从请求中获取用户 IP
 * @param {Object} c - Hono Context
 * @returns {string} 用户 IP 地址
 */
export function getClientIp(c) {
  const cfIp = c.req.header('CF-Connecting-IP')
  if (cfIp) return cfIp

  const forwarded = c.req.header('X-Forwarded-For')
  if (forwarded) return forwarded.split(',')[0].trim()

  const realIp = c.req.header('X-Real-IP')
  if (realIp) return realIp

  return '127.0.0.1'
}
