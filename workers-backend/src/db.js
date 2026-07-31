/**
 * 数据库连接模块 - Supabase PostgreSQL
 * 
 * 功能：
 * - 初始化 Supabase 客户端
 * - 提供数据库操作封装
 * - 支持连接池和错误处理
 * 
 * 注意：Cloudflare Workers 环境下使用 Supabase JavaScript SDK
 *       不支持原生 pg 驱动，需通过 Supabase REST API 操作数据库
 */

import { createClient } from '@supabase/supabase-js'

/**
 * 创建 Supabase 客户端实例
 * @param {Object} env - Cloudflare Workers 环境变量
 * @param {string} env.SUPABASE_URL - Supabase 项目 URL
 * @param {string} env.SUPABASE_ANON_KEY - Supabase 匿名 Key（用于客户端访问）
 * @returns {import('@supabase/supabase-js').SupabaseClient} Supabase 客户端
 */
export function createSupabaseClient(env) {
  const supabaseUrl = env.SUPABASE_URL
  const supabaseAnonKey = env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('SUPABASE_URL 和 SUPABASE_ANON_KEY 必须配置')
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })
}

/**
 * 通用数据库操作封装类
 * 提供表操作的便捷方法
 */
export class Database {
  /**
   * @param {import('@supabase/supabase-js').SupabaseClient} supabase 
   */
  constructor(supabase) {
    this.supabase = supabase
  }

  /**
   * 插入单条记录
   * @param {string} table - 表名
   * @param {Object} data - 要插入的数据
   * @returns {Promise<{data: any[], error: any}>} 插入结果
   */
  async insert(table, data) {
    const { data: result, error } = await this.supabase
      .from(table)
      .insert(data)
      .select()

    if (error) throw error
    return result?.[0] || null
  }

  /**
   * 根据条件查询记录
   * @param {string} table - 表名
   * @param {Object} [filters={}] - 查询条件
   * @param {Object} [options={}] - 查询选项（limit, order, select）
   * @returns {Promise<Array>} 查询结果数组
   */
  async select(table, filters = {}, options = {}) {
    let query = this.supabase.from(table).select(options.select || '*')

    // 应用过滤条件
    for (const [key, value] of Object.entries(filters)) {
      if (value === undefined) continue
      if (value === null) {
        query = query.is(key, null)
      } else {
        query = query.eq(key, value)
      }
    }

    // 排序
    if (options.order) {
      const { column, ascending = false } = options.order
      query = query.order(column, { ascending })
    }

    // 分页
    if (options.limit) {
      query = query.limit(options.limit)
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  }

  /**
   * 获取单条记录
   * @param {string} table - 表名
   * @param {Object} filters - 查询条件
   * @returns {Promise<Object|null>} 单条记录
   */
  async findOne(table, filters) {
    const results = await this.select(table, { ...filters }, { limit: 1 })
    return results[0] || null
  }

  /**
   * 更新记录
   * @param {string} table - 表名
   * @param {Object} filters - 查询条件
   * @param {Object} data - 要更新的数据
   * @returns {Promise<Object|null>} 更新后的记录
   */
  async update(table, filters, data) {
    let query = this.supabase.from(table).update(data)

    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value)
    }

    const { data: result, error } = await query.select()
    if (error) throw error
    return result?.[0] || null
  }

  /**
   * 软删除（设置 deleted_at 字段）
   * @param {string} table - 表名
   * @param {number} id - 记录 ID
   * @returns {Promise<Object|null>} 更新后的记录
   */
  async softDelete(table, id) {
    return this.update(table, { id }, { deleted_at: new Date().toISOString() })
  }

  /**
   * 安全写入操作日志（失败时静默，不阻断主流程）
   * @param {Object} logData - 日志数据
   */
  async safeInsertLog(logData) {
    try {
      await this.insert('operation_logs', logData)
    } catch (_) {
      // 日志写入失败不影响主流程
    }
  }

  /**
   * 统计记录数量
   * @param {string} table - 表名
   * @param {Object} [filters={}] - 查询条件
   * @returns {Promise<number>} 记录数量
   */
  async count(table, filters = {}) {
    let query = this.supabase.from(table).select('*', { count: 'exact', head: true })

    for (const [key, value] of Object.entries(filters)) {
      if (value === undefined) continue
      if (value === null) {
        query = query.is(key, null)
      } else {
        query = query.eq(key, value)
      }
    }

    const { count, error } = await query
    if (error) throw error
    return count || 0
  }
}

/**
 * 获取数据库实例
 * @param {Object} env - Cloudflare Workers 环境变量
 * @returns {Database} 数据库实例
 */
export function getDatabase(env) {
  const supabase = createSupabaseClient(env)
  return new Database(supabase)
}
