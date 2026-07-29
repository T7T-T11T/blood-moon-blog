/**
 * 友情链接 API 模块
 * 作用：封装友链相关的所有接口请求
 *
 * 接口列表：
 * - getLinks(params)      获取友链列表（公开）
 * - getAllLinks()         获取所有友链（管理端）
 * - createLink(data)      创建友链（管理端）
 * - updateLink(id, data)  更新友链（管理端）
 * - deleteLink(id)        删除友链（管理端）
 */
import request from './request';

/**
 * 获取已通过友链列表（公开接口）
 * @param {Object} params - 查询参数 { category }
 * @returns {Promise} 友链列表
 */
export function getLinks(params) {
  return request.get('/links', { params });
}

/**
 * 获取所有友链列表（管理端，含待审核）
 * @returns {Promise} 全部友链列表
 */
export function getAllLinks() {
  return request.get('/links/all');
}

/**
 * 创建友链（管理端）
 * @param {Object} data - 友链数据 { name, url, description, avatar_url, category, sort_order, status, email }
 * @returns {Promise} 创建结果
 */
export function createLink(data) {
  return request.post('/links', data);
}

/**
 * 更新友链（管理端）
 * @param {number} id - 友链ID
 * @param {Object} data - 更新数据
 * @returns {Promise} 更新结果
 */
export function updateLink(id, data) {
  return request.put(`/links/${id}`, data);
}

/**
 * 删除友链（管理端）
 * @param {number} id - 友链ID
 * @returns {Promise} 删除结果
 */
export function deleteLink(id) {
  return request.delete(`/links/${id}`);
}
