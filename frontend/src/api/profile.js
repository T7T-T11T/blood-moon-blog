/**
 * 用户资料 API
 * 作用：封装个人中心相关接口请求
 *
 * 接口列表：
 * - getProfile()   获取当前登录用户完整信息
 * - updateProfile(data)  更新用户资料（头像、简介、社交链接等）
 * - changePassword(oldPwd, newPwd)  修改用户密码
 */
import request from './request';

/**
 * 获取当前登录用户完整信息
 * @returns {Promise} 接口响应，包含 id, username, avatar_url, bio, email, github_url, qq_url, wechat
 */
export function getProfile() {
  return request.get('/auth/profile');
}

/**
 * 更新当前登录用户资料
 * @param {Object} data - 待更新字段 { avatar_url?, bio?, email?, github_url?, qq_url?, wechat? }
 * @returns {Promise} 接口响应
 */
export function updateProfile(data) {
  return request.put('/auth/profile', data);
}

/**
 * 修改用户密码
 * @param {String} oldPassword - 原密码
 * @param {String} newPassword - 新密码（至少6位）
 * @returns {Promise} 接口响应
 */
export function changePassword(oldPassword, newPassword) {
  return request.put('/auth/password', {
    old_password: oldPassword,
    new_password: newPassword
  });
}
