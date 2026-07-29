/**
 * 数据库配置文件
 * 作用：管理 MySQL 连接参数，创建数据库连接池
 *
 * 配置说明：
 * - 优先从环境变量读取（.env 文件）
 * - 环境变量不存在时使用默认值
 */

const mysql = require('mysql2/promise')

// MySQL 连接配置 —— 从环境变量读取
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',      // 数据库地址
  port: parseInt(process.env.DB_PORT, 10) || 3306,  // 数据库端口
  user: process.env.DB_USER || 'root',           // 数据库用户名
  password: process.env.DB_PASSWORD || '',       // 数据库密码
  database: process.env.DB_NAME || 'task_manager',  // 数据库名
  waitForConnections: true,                      // 连接池满时排队等待
  connectionLimit: 10,                           // 连接池最大连接数
  queueLimit: 0                                  // 排队队列无上限
}

// 创建数据库连接池（比单连接更高效，支持并发请求）
const pool = mysql.createPool(dbConfig)

module.exports = pool
