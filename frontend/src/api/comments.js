/**
 * 评论 API 模块
 * 作用：封装评论相关的所有接口请求
 *
 * 接口列表：
 * - getComments(articleId)          获取文章评论
 * - postComment(articleId, data)    发表评论
 * - getCommentList(params)          获取评论列表（管理端）
 * - updateCommentStatus(id, status) 更新评论状态（管理端）
 * - deleteComment(id)               删除评论（管理端）
 */
import request from './request';

/**
 * 获取文章的已通过评论（公开接口）
 * @param {number} articleId - 文章ID
 * @returns {Promise} 评论树形列表
 */
export function getComments(articleId) {
  return request.get(`/comments/${articleId}`);
}

/**
 * 发表评论（公开接口）
 * @param {number} articleId - 文章ID
 * @param {Object} data - 评论数据 { nickname, email, content, parent_id }
 * @returns {Promise} 发表结果
 */
export function postComment(articleId, data) {
  return request.post(`/comments/${articleId}`, data);
}

/**
 * 获取评论列表（管理端，需登录）
 * @param {Object} params - 查询参数 { status, article_id, page, page_size }
 * @returns {Promise} 分页评论列表
 */
export function getCommentList(params) {
  return request.get('/comments', { params });
}

/**
 * 更新评论状态（管理端）
 * @param {number} id - 评论ID
 * @param {string} status - 新状态（待审核/已通过/已拒绝）
 * @returns {Promise} 更新结果
 */
export function updateCommentStatus(id, status) {
  return request.put(`/comments/${id}/status`, { status });
}

/**
 * 删除评论（管理端）
 * @param {number} id - 评论ID
 * @returns {Promise} 删除结果
 */
export function deleteComment(id) {
  return request.delete(`/comments/${id}`);
}

/**
 * 获取评论统计数据（待审核数量）
 * @returns {Promise} 统计数据 { pending, approved, rejected }
 */
export function getCommentStats() {
  return request.get('/comments/stats');
}
