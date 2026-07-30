/**
 * 友链 API 模块（friends 表）
 */
import request from './request';

/** 获取已通过友链（公开） */
export function getFriends() {
  return request.get('/friends');
}

/** 获取所有友链（管理端） */
export function getAllFriends() {
  return request.get('/friends/all');
}

/** 创建友链 */
export function createFriend(data) {
  return request.post('/friends', data);
}

/** 更新友链 */
export function updateFriend(id, data) {
  return request.put(`/friends/${id}`, data);
}

/** 删除友链 */
export function deleteFriend(id) {
  return request.delete(`/friends/${id}`);
}
