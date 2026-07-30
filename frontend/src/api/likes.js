/**
 * 点赞 API
 */
import request from './request';

/** 点赞/取消点赞文章（toggle） */
export function toggleLike(articleId) {
  return request.post(`/likes/article/${articleId}`);
}

/** 查询点赞状态 */
export function getLikeStatus(articleId) {
  return request.get(`/likes/article/${articleId}/status`);
}

/** 获取点赞数 */
export function getLikeCount(articleId) {
  return request.get(`/likes/article/${articleId}/count`);
}
