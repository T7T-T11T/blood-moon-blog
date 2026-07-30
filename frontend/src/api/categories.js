/**
 * 分类 API 模块
 * 作用：封装文章分类的公开浏览和后台管理接口
 */
import request from './request';
import { listCache } from './cache';

/**
 * 获取分类列表（公开，缓存 60s）
 * @returns {Promise} 分类列表
 */
export function getCategories() {
  const key = 'getCategories';
  const cached = listCache.get(key);
  if (cached) return Promise.resolve(cached);

  return request.get('/categories', { params: { with_count: 'true' } }).then((res) => {
    listCache.set(key, res);
    return res;
  });
}

/**
 * 获取单个分类详情
 * @param {number} id - 分类ID
 * @returns {Promise} 分类详情
 */
export function getCategory(id) {
  return request.get(`/categories/${id}`);
}

/**
 * 新增分类（管理端）
 * @param {Object} data - 分类数据 { name, slug, description, sort_order }
 * @returns {Promise} 创建结果
 */
export function addCategory(data) {
  return request.post('/categories', data);
}

/**
 * 编辑分类（管理端）
 * @param {number} id - 分类ID
 * @param {Object} data - 分类数据
 * @returns {Promise} 更新结果
 */
export function updateCategory(id, data) {
  return request.put(`/categories/${id}`, data);
}

/**
 * 删除分类（管理端）
 * @param {number} id - 分类ID
 * @returns {Promise} 删除结果
 */
export function deleteCategory(id) {
  return request.delete(`/categories/${id}`);
}
