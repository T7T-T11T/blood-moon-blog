/**
 * 认证相关 API
 * 作用：封装用户注册、登录接口请求
 */
import request from './request';

/**
 * 用户注册
 * @param {Object} data - { username, password, email }
 * @returns {Promise} 接口响应
 */
export function registerAPI(data) {
  return request.post('/auth/register', data);
}

/**
 * 用户登录
 * @param {Object} data - { username, password }
 * @returns {Promise} 接口响应，包含 token 和用户信息
 */
export function loginAPI(data) {
  return request.post('/auth/login', data);
}
