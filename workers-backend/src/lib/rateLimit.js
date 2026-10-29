/**
 * 通用限流工具（支持 Cloudflare KV 与本地内存两种后端）
 *
 * 用法：
 *   import { checkRateLimit } from '../lib/rateLimit.js'
 *   if (!(await checkRateLimit(c, 'login', `${ip}:${username}`, 5, 10 * 60 * 1000))) {
 *     return c.json({ code: 429, message: '尝试过于频繁，请稍后再试' }, 429)
 *   }
 *
 * 存储策略：
 * - 配置 RATE_LIMIT_KV binding 时使用 KV 跨节点计数（生产推荐）
 * - 未配置时回退到进程内 Map（本地开发 / 单实例）
 */

const memoryStore = new Map()

/**
 * 基于滑动窗口计数的限流检查
 * @param {Object} c - Hono 上下文（需包含 c.env）
 * @param {string} scope - 限流场景标识（如 'login'、'comment'）
 * @param {string} subject - 限流主体（IP / 用户名 / 组合键）
 * @param {number} max - 窗口内最大允许次数
 * @param {number} windowMs - 窗口长度（毫秒）
 * @returns {Promise<boolean>} 是否允许放行
 */
export async function checkRateLimit(c, scope, subject, max, windowMs) {
  const now = Date.now()
  const kv = c.env?.RATE_LIMIT_KV
  const key = `${scope}:${subject}`

  // 无 KV 绑定（本地开发等）：回退到内存 Map
  if (!kv) {
    const records = (memoryStore.get(key) || []).filter((t) => now - t < windowMs)
    if (records.length >= max) {
      memoryStore.set(key, records)
      return false
    }
    records.push(now)
    memoryStore.set(key, records)
    return true
  }

  // KV 跨节点计数
  try {
    const raw = await kv.get(key)
    const records = (raw ? JSON.parse(raw) : []).filter((t) => now - t < windowMs)
    if (records.length >= max) {
      await kv.put(key, JSON.stringify(records), { expirationTtl: Math.ceil(windowMs / 1000) })
      return false
    }
    records.push(now)
    await kv.put(key, JSON.stringify(records), { expirationTtl: Math.ceil(windowMs / 1000) })
    return true
  } catch {
    // KV 异常时放行，避免误伤正常用户
    return true
  }
}
