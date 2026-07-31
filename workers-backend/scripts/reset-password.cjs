/**
 * 密码重置脚本 - 将 admin 用户密码更新为 PBKDF2 格式
 * 
 * 生成 PBKDF2 哈希，用于 Cloudflare Workers 环境（不支持 bcrypt）
 * 使用方法：node scripts/reset-password.cjs
 */

const crypto = require('crypto')

/**
 * 生成 PBKDF2 密码哈希
 * @param {string} password - 原始密码
 * @returns {string} 哈希字符串（格式：pbkdf2$iterations$salt$hash）
 */
function hashPassword(password) {
  const iterations = 100000
  const salt = crypto.randomBytes(16)
  const derivedKey = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256')
  return `pbkdf2$${iterations}$${salt.toString('hex')}$${derivedKey.toString('hex')}`
}

// 生成 admin123 的 PBKDF2 哈希
const hash = hashPassword('admin123')
console.log('新密码哈希：')
console.log(hash)
console.log('\n请在 Supabase SQL Editor 中执行以下 SQL：')
console.log(`UPDATE users SET password_hash = '${hash}' WHERE username = 'admin';`)
