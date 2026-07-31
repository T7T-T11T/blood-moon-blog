/**
 * 数据库配置文件 - PostgreSQL (Supabase)
 * 作用：管理 PostgreSQL 连接参数，创建兼容 mysql2 的连接池
 *
 * 配置说明：
 * - 优先从环境变量读取（SUPABASE_URL 或独立 DB_* 参数）
 * - 使用 pgCompat 兼容层，API 与 mysql2/promise 完全兼容
 * 
 * 支持两种配置方式：
 *   1. SUPABASE_URL：Supabase 提供的完整连接串
 *   2. DB_HOST + DB_PORT + DB_USER + DB_PASSWORD + DB_NAME
 */

const { createPool } = require('./pgCompat')

// PostgreSQL 连接配置
let poolConfig

if (process.env.SUPABASE_URL) {
  // Supabase 连接串模式（生产环境推荐）
  poolConfig = {
    connectionString: process.env.SUPABASE_URL,
    ssl: { require: true, rejectUnauthorized: false }
  }
} else {
  // 独立参数模式（本地开发）
  poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'blood_moon_blog',
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
  }
}

// 创建兼容 mysql2 的连接池
const pool = createPool(poolConfig)

module.exports = pool
