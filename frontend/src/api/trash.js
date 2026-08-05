/**
 * @file trash.js
 * @description 回收站相关API接口
 * 作用：提供回收站文章的查看、恢复和永久删除接口
 */

import request from './request';

/**
 * 获取回收站文章列表
 * @param {Object} params - 查询参数
 * @param {number} [params.page=1] - 页码
 * @param {number} [params.page_size=20] - 每页数量
 * @returns {Promise<Object>} 返回 { list, pagination }
 */
export function getTrashArticles(params = {}) {
  return request({
    url: '/trash',
    method: 'get',
    params: { page: 1, page_size: 20, ...params }
  });
}

/**
 * 恢复回收站中的文章
 * @param {number} id - 文章ID
 * @returns {Promise<Object>} 返回操作结果
 */
export function restoreArticle(id) {
  return request({
    url: `/trash/${id}/restore`,
    method: 'post'
  });
}

/**
 * 永久删除回收站中的文章
 * @param {number} id - 文章ID
 * @returns {Promise<Object>} 返回操作结果
 */
export function permanentDeleteArticle(id) {
  return request({
    url: `/trash/${id}`,
    method: 'delete'
  });
}

/**
 * 清空回收站（永久删除所有文章）
 * @returns {Promise<Object>} 返回操作结果
 */
export function clearAllTrash() {
  return request({
    url: '/trash/clear',
    method: 'delete'
  });
}
