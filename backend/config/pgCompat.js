/**
 * PostgreSQL 兼容层 - 将 pg 驱动包装为 mysql2/promise 兼容接口
 *
 * 作用：
 * - 使现有代码中的 pool.execute(sql, params) 正常工作
 * - 自动将 ? 占位符转换为 PostgreSQL 的 $1, $2, ... 占位符
 * - 自动处理批量插入（VALUES ? + 二维数组 → 多值 INSERT）
 * - 返回 [rows] 格式，并附带 insertId/affectedRows 属性
 *
 * 支持的 API：
 * - pool.execute(sql, params) → [rows]  (rows 含 insertId/affectedRows)
 * - pool.query(sql, params) → [rows]
 * - pool.getConnection() → 返回兼容的连接对象（用于事务）
 * - pool.begin() → 开始事务
 * - conn.execute(sql, params) → [rows]  (事务中)
 * - conn.beginTransaction() / commit() / rollback()
 */

const { Pool } = require('pg')

/**
 * 将 SQL 中的 ? 占位符转换为 PostgreSQL 的 $1, $2, ... 格式
 * 同时处理批量插入的 VALUES ? + 二维数组 → 多值元组
 * @param {string} sql - 原始 SQL（使用 ? 占位符）
 * @param {Array} [params=[]] - 参数数组
 * @returns {{ sql: string, params: Array }} 转换后的 SQL 和参数
 */
function convertSql(sql, params = []) {
  let counter = 0
  const newParams = []
  let batchResult = { sql, params: newParams }

  // 检测批量插入模式：VALUES ? 且最后一个参数是二维数组
  const valuesMatch = sql.match(/VALUES\s*\?$/i)
  if (valuesMatch && params.length === 1 && Array.isArray(params[0]) && Array.isArray(params[0][0])) {
    const rows = params[0]
    if (rows.length > 0) {
      // 构建多值占位符：($1, $2), ($3, $4), ...
      const tuples = []
      for (const row of rows) {
        const placeholders = row.map(() => `$${++counter}`).join(', ')
        tuples.push(`(${placeholders})`)
        newParams.push(...row)
      }
      batchResult.sql = sql.replace('?', tuples.join(', '))
      return batchResult
    }
  }

  // 普通占位符转换
  batchResult.sql = sql.replace(/\?/g, () => {
    counter++
    return `$${counter}`
  })
  batchResult.params = params
  return batchResult
}

/**
 * 包装 pg 结果为 mysql2 兼容格式
 * @param {Object} pgResult - pg 查询结果
 * @returns {Array} [rows] 附加 insertId 和 affectedRows
 */
function wrapResult(pgResult) {
  const rows = pgResult.rows
  const wrapper = [rows]
  // INSERT 返回 insertId
  if (pgResult.command === 'INSERT' && rows.length > 0) {
    wrapper.insertId = rows[0].id ?? pgResult.rowCount
  }
  // UPDATE/DELETE 返回 affectedRows
  if (pgResult.command === 'UPDATE' || pgResult.command === 'DELETE') {
    wrapper.affectedRows = pgResult.rowCount
  }
  // SELECT 返回 rows
  if (pgResult.command === 'SELECT') {
    wrapper.rows = rows
  }
  return wrapper
}

/**
 * pg Pool 兼容包装类
 * 提供与 mysql2/promise 兼容的 API
 */
class PgCompatPool {
  /**
   * @param {Object} config - pg Pool 配置
   */
  constructor(config) {
    this.pool = new Pool(config)
  }

  /**
   * 执行 SQL 查询（兼容 mysql2 的 execute 方法）
   * @param {string} sql - SQL 语句（使用 ? 占位符）
   * @param {Array|Array[]} [params=[]] - 参数数组，支持二维数组批量插入
   * @returns {Promise<Array>} 返回 [rows] 数组，附加 insertId/affectedRows
   */
  async execute(sql, params = []) {
    if (typeof params === 'string') {
      // 无参数调用：pool.execute('SELECT 1')
      const converted = convertSql(sql, [])
      const result = await this.pool.query(converted.sql)
      return wrapResult(result)
    }
    const converted = convertSql(sql, params)
    const result = await this.pool.query(converted.sql, converted.params)
    return wrapResult(result)
  }

  /**
   * 执行 SQL 查询（query 别名）
   * @param {string} sql
   * @param {Array} [params=[]]
   * @returns {Promise<Array>}
   */
  async query(sql, params = []) {
    return this.execute(sql, params)
  }

  /**
   * 获取连接（用于事务）
   * @returns {Promise<PgCompatConnection>}
   */
  async getConnection() {
    const client = await this.pool.connect()
    return new PgCompatConnection(client)
  }

  /**
   * 开始事务（便捷方法）
   * @returns {Promise<PgCompatConnection>}
   */
  async begin() {
    const conn = await this.getConnection()
    await conn.execute('BEGIN')
    return conn
  }

  /**
   * 测试连接
   * @returns {Promise<boolean>}
   */
  async testConnection() {
    try {
      const result = await this.pool.query('SELECT NOW() as now')
      console.log('✅ PostgreSQL 连接成功:', result.rows[0].now)
      return true
    } catch (err) {
      console.error('❌ PostgreSQL 连接失败:', err.message)
      return false
    }
  }

  /**
   * 关闭连接池
   */
  async end() {
    await this.pool.end()
  }

  /**
   * 事件监听
   */
  on(event, callback) {
    this.pool.on(event, callback)
  }
}

/**
 * pg 兼容连接对象（用于事务）
 */
class PgCompatConnection {
  /**
   * @param {import('pg').PoolClient} client
   */
  constructor(client) {
    this.client = client
  }

  /**
   * 开启事务（别名，兼容 mysql2 的 beginTransaction）
   */
  async beginTransaction() {
    await this.client.query('BEGIN')
  }

  /**
   * 执行 SQL（在事务中）
   * @param {string} sql
   * @param {Array} [params=[]]
   * @returns {Promise<Array>}
   */
  async execute(sql, params = []) {
    if (typeof params === 'string') {
      const result = await this.client.query(sql)
      return wrapResult(result)
    }
    const converted = convertSql(sql, params)
    const result = await this.client.query(converted.sql, converted.params)
    return wrapResult(result)
  }

  /**
   * query 别名
   * @param {string} sql
   * @param {Array} [params]
   * @returns {Promise<Array>}
   */
  async query(sql, params = []) {
    return this.execute(sql, params)
  }

  /**
   * 提交事务
   */
  async commit() {
    await this.client.query('COMMIT')
    this.client.release()
  }

  /**
   * 回滚事务
   */
  async rollback() {
    await this.client.query('ROLLBACK')
    this.client.release()
  }

  /**
   * 释放连接
   */
  release() {
    this.client.release()
  }
}

/**
 * 创建兼容的数据库连接池
 * @param {Object} config - pg Pool 配置
 * @returns {PgCompatPool}
 */
function createPool(config) {
  return new PgCompatPool(config)
}

module.exports = { createPool, PgCompatPool, PgCompatConnection, convertSql }
