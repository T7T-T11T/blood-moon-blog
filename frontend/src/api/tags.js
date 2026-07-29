/**
 * 标签 API 模块
 * 作用：封装文章标签的公开浏览和后台管理接口
 */
import request from './request';

/**
 * 获取标签列表（公开）
 * @returns {Promise} 标签列表
 */
export function getTags() {
  return request.get('/tags');
}

/**
 * 获取单个标签详情
 * @param {number} id - 标签ID
 * @returns {Promise} 标签详情
 */
export function getTag(id) {
  return request.get(`/tags/${id}`);
}

/**
 * 新增标签（管理端）
 * @param {Object} data - 标签数据 { name, slug }
 * @returns {Promise} 创建结果
 */
export function addTag(data) {
  return request.post('/tags', data);
}

/**
 * 编辑标签（管理端）
 * @param {number} id - 标签ID
 * @param {Object} data - 标签数据
 * @returns {Promise} 更新结果
 */
export function updateTag(id, data) {
  return request.put(`/tags/${id}`, data);
}

/**
 * 删除标签（管理端）
 * @param {number} id - 标签ID
 * @returns {Promise} 删除结果
 */
export function deleteTag(id) {
  return request.delete(`/tags/${id}`);
}
