/**
 * 数据库连接模块 - Supabase PostgreSQL
 * 
 * 功能：
 * - 初始化 Supabase 客户端（Worker 级缓存，避免每次请求重建）
 * - 提供数据库操作封装
 * 
 * 注意：Cloudflare Workers 环境下使用 Supabase JavaScript SDK
 *       不支持原生 pg 驱动，需通过 Supabase REST API 操作数据库
 *       Supabase 客户端按 Worker 实例缓存（同一 isolate 内复用）
 */

import { createClient } from '@supabase/supabase-js'

/**
 * Worker 级 Supabase 客户端缓存
 * 同一 Worker isolate 内的多个请求复用同一个客户端实例
 * key 为 `${url}|${key}`，保证不同项目不会串
 * @type {Map<string, import('@supabase/supabase-js').SupabaseClient>}
 */
const clientCache = new Map()

/**
 * 创建或获取缓存的 Supabase 客户端实例
 * @param {Object} env - Cloudflare Workers 环境变量
 * @param {string} env.SUPABASE_URL - Supabase 项目 URL
 * @param {string} env.SUPABASE_ANON_KEY - Supabase 匿名 Key
 * @returns {import('@supabase/supabase-js').SupabaseClient} Supabase 客户端
 */
export function getSupabaseClient(env) {
  const supabaseUrl = env.SUPABASE_URL
  const supabaseAnonKey = env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('SUPABASE_URL 和 SUPABASE_ANON_KEY 必须配置')
  }

  const cacheKey = `${supabaseUrl}|${supabaseAnonKey}`
  const cached = clientCache.get(cacheKey)
  if (cached) return cached

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })

  clientCache.set(cacheKey, client)
  return client
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
   *   - 简单值: { status: 'published' } → WHERE status = 'published'
   *   - NULL值: { deleted_at: null } → WHERE deleted_at IS NULL
   *   - IN查询: { id: { in: [1, 2, 3] } } → WHERE id IN (1, 2, 3)
   * @param {Object} [options={}] - 查询选项（limit, offset, order, select）
   * @returns {Promise<Array>} 查询结果数组
   */
  async select(table, filters = {}, options = {}) {
    let query = this.supabase.from(table).select(options.select || '*')

    // 应用过滤条件
    for (const [key, value] of Object.entries(filters)) {
      if (value === undefined) continue
      if (value === null) {
        query = query.is(key, null)
      } else if (typeof value === 'object' && value.in) {
        // IN 查询：{ id: { in: [1, 2, 3] } }
        query = query.in(key, value.in)
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
  const supabase = getSupabaseClient(env)
  return new Database(supabase)
}
