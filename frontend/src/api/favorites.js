/**
 * 收藏 API
 */
import request from './request';

/** 收藏/取消收藏文章（toggle，需登录） */
export function toggleFavorite(articleId) {
  return request.post(`/favorites/article/${articleId}`);
}

/** 查询收藏状态（需登录） */
export function getFavoriteStatus(articleId) {
  return request.get(`/favorites/article/${articleId}/status`);
}

/** 获取收藏列表（需登录） */
export function getFavorites(params) {
  return request.get('/favorites', { params });
}
