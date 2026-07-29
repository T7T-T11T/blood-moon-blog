/**
 * 认证相关 API
 * 作用：封装用户登录接口请求
 * 注意：个人博客无公开注册接口，管理员通过种子脚本初始化
 */
import request from './request';

/**
 * 用户登录
 * @param {Object} data - { username, password }
 * @returns {Promise} 接口响应，包含 token 和用户信息
 */
export function loginAPI(data) {
  return request.post('/auth/login', data);
}
