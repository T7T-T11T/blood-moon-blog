/**
 * 文章 API 模块
 * 作用：封装文章相关的所有接口请求（公开浏览 + 后台管理）
 *
 * 接口列表：
 * 【公开接口】
 * - getPublicArticles(params)           获取已发布文章列表（分页、筛选、搜索）
 * - getArticleDetail(id)                获取文章详情（自动增加浏览量）
 * - getLatestArticles(limit)            获取最新文章
 * - getHotArticles(limit)               获取热门文章
 * - getArticlesByCategory(slug, params) 按分类获取文章
 * - getArticlesByTag(slug, params)      按标签获取文章
 * - getArticleArchives()                获取文章归档列表
 *
 * 【管理接口】
 * - getArticles(params)                 获取文章列表（含草稿）
 * - getAdminArticleDetail(id)           获取文章详情（管理端）
 * - addArticle(data)                    新增文章
 * - updateArticle(id, data)             编辑文章
 * - deleteArticle(id)                   删除文章
 */
import request from './request';
import { listCache, defaultCache, cacheKey } from './cache';

// ==================== 公开接口 ====================

/**
 * 获取已发布文章列表（公开接口，缓存 60s）
 * @param {Object} params - 查询参数 { page, page_size, category_id, tag_id, keyword }
 * @returns {Promise} 文章分页列表
 */
export function getPublicArticles(params) {
  const key = cacheKey(getPublicArticles, params);
  const cached = listCache.get(key);
  if (cached) return Promise.resolve(cached);

  return request.get('/articles/public', { params }).then((res) => {
    listCache.set(key, res);
    return res;
  });
}

/**
 * 获取文章详情（公开接口，自动增加浏览量）
 * @param {number} id - 文章ID
 * @returns {Promise} 文章详情
 */
export function getArticleDetail(id) {
  return request.get(`/articles/public/${id}`);
}

/**
 * 获取最新文章（公开接口，缓存 60s）
 * @param {number} limit - 限制数量，默认5
 * @returns {Promise} 最新文章列表
 */
export function getLatestArticles(limit = 5) {
  const key = cacheKey(getLatestArticles, limit);
  const cached = listCache.get(key);
  if (cached) return Promise.resolve(cached);

  return request.get('/articles/public/latest', { params: { limit } }).then((res) => {
    listCache.set(key, res);
    return res;
  });
}

/**
 * 获取热门文章（公开接口，按浏览量排序，缓存 30s）
 * @param {number} limit - 限制数量，默认5
 * @returns {Promise} 热门文章列表
 */
export function getHotArticles(limit = 5) {
  const key = cacheKey(getHotArticles, limit);
  const cached = defaultCache.get(key);
  if (cached) return Promise.resolve(cached);

  return request.get('/articles/public/hot', { params: { limit } }).then((res) => {
    defaultCache.set(key, res);
    return res;
  });
}

/**
 * 按分类获取文章（公开接口）
 * @param {string} slug - 分类标识
 * @param {Object} params - 分页参数 { page, page_size }
 * @returns {Promise} 分类文章列表
 */
export function getArticlesByCategory(slug, params) {
  return request.get(`/articles/public/category/${slug}`, { params });
}

/**
 * 按标签获取文章（公开接口）
 * @param {string} slug - 标签标识
 * @param {Object} params - 分页参数 { page, page_size }
 * @returns {Promise} 标签文章列表
 */
export function getArticlesByTag(slug, params) {
  return request.get(`/articles/public/tag/${slug}`, { params });
}

/**
 * 获取文章归档列表（公开接口，缓存 60s）
 * @returns {Promise} 按年月分组的文章归档
 */
export function getArticleArchives() {
  const key = 'getArticleArchives';
  const cached = listCache.get(key);
  if (cached) return Promise.resolve(cached);

  return request.get('/articles/public/archives').then((res) => {
    listCache.set(key, res);
    return res;
  });
}

/**
 * 全站搜索文章（公开接口）
 * @param {Object} params - 查询参数 { keyword, page, page_size }
 * @returns {Promise} 搜索结果
 */
export function searchArticles(params) {
  return request.get('/articles/public/search', { params });
}

/**
 * 获取相关文章（同分类或同标签推荐）
 * @param {number} articleId - 当前文章ID
 * @param {number} limit - 返回数量，默认5
 * @returns {Promise} 相关文章列表
 */
export function getRelatedArticles(articleId, limit = 5) {
  return request.get(`/articles/public/related/${articleId}`, { params: { limit } });
}

// ==================== 管理接口 ====================

/**
 * 获取文章列表（管理端，含草稿）
 * @param {Object} params - 查询参数 { status, category_id, keyword }
 * @returns {Promise} 文章列表
 */
export function getArticles(params) {
  return request.get('/articles', { params });
}

/**
 * 获取文章详情（管理端）
 * @param {number} id - 文章ID
 * @returns {Promise} 文章详情
 */
export function getAdminArticleDetail(id) {
  return request.get(`/articles/${id}`);
}

/**
 * 新增文章
 * @param {Object} data - 文章数据 { title, content, summary, cover_image, status, category_id, tag_ids }
 * @returns {Promise} 创建结果
 */
export function addArticle(data) {
  return request.post('/articles', data);
}

/**
 * 编辑文章
 * @param {number} id - 文章ID
 * @param {Object} data - 文章数据
 * @returns {Promise} 更新结果
 */
export function updateArticle(id, data) {
  return request.put(`/articles/${id}`, data);
}

/**
 * 删除文章
 * @param {number} id - 文章ID
 * @returns {Promise} 删除结果
 */
export function deleteArticle(id) {
  return request.delete(`/articles/${id}`);
}

/**
 * 导出文章为 Markdown 或 HTML 格式
 * @param {number} id - 文章ID
 * @param {string} format - 导出格式 (markdown / html)
 * @returns {Promise<Blob>} 文件流
 */
export function exportArticle(id, format = 'markdown') {
  return request.get(`/articles/${id}/export`, {
    params: { format },
    responseType: 'blob'
  });
}

/**
 * 切换文章置顶状态
 * @param {number} id - 文章ID
 * @returns {Promise} 新的置顶状态
 */
export function toggleTop(id) {
  return request.put(`/articles/${id}/toggle-top`);
}
