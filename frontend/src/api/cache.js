/**
 * 内存缓存工具
 * 作用：对高频重复请求进行短期缓存，减少不必要的 API 调用
 *
 * 使用方式：
 *   const cache = createCache(ttlMs);    // 创建缓存实例，指定 TTL（毫秒）
 *   cache.get(key);                      // 读取缓存，命中返回 data，未命中返回 undefined
 *   cache.set(key, data);                // 写入缓存
 *   cache.delete(key);                   // 手动删除指定 key
 *   cache.clear();                       // 清空所有缓存
 *
 * 【缓存策略】
 * - 仅缓存 GET 类只读请求
 * - 默认 TTL 30 秒，避免数据陈旧
 * - 列表类接口（首页文章、分类、标签）缓存 60 秒
 * - 写操作（POST/PUT/DELETE）后应主动清空相关缓存
 */
class MemoryCache {
  /**
   * @param {number} ttl - 过期时间（毫秒），默认 30000（30秒）
   */
  constructor(ttl = 30000) {
    this.cache = new Map();
    this.ttl = ttl;
  }

  /**
   * 获取缓存数据
   * @param {string} key - 缓存键
   * @returns {*|undefined} 缓存数据，过期或不存在返回 undefined
   */
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.data;
  }

  /**
   * 写入缓存
   * @param {string} key - 缓存键
   * @param {*} data - 要缓存的数据
   */
  set(key, data) {
    this.cache.set(key, {
      data,
      expiry: Date.now() + this.ttl
    });
  }

  /**
   * 删除指定缓存
   * @param {string} key - 缓存键
   */
  delete(key) {
    this.cache.delete(key);
  }

  /**
 * 清空所有缓存
 */
  clear() {
    this.cache.clear();
  }

  /**
   * 按前缀批量删除缓存
   * @param {string} prefix - 缓存键前缀
   */
  deleteByPrefix(prefix) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }
}

// ========== 预配置缓存实例 ==========

/** 默认缓存：TTL 30 秒 */
export const defaultCache = new MemoryCache(30000);

/** 列表类缓存：TTL 60 秒（首页文章、分类、标签等变更频率低的数据） */
export const listCache = new MemoryCache(60000);

/**
 * 生成缓存键
 * 根据函数名和参数序列化生成唯一键
 */
export function cacheKey(fn, ...args) {
  return `${fn.name}:${JSON.stringify(args)}`;
}

export default MemoryCache;
