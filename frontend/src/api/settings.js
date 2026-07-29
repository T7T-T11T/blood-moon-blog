/**
 * 网站设置 API 模块
 * 作用：封装网站设置相关的所有接口请求
 *
 * 接口列表：
 * - getSettings()         获取所有设置项（公开）
 * - getSetting(key)       获取单个设置项（公开）
 * - updateSettings(data)  批量更新设置（管理端）
 */
import request from './request';

/**
 * 获取所有网站设置项（公开接口）
 * @returns {Promise} 键值对对象 { key: value }
 */
export function getSettings() {
  return request.get('/settings');
}

/**
 * 获取单个设置项（公开接口）
 * @param {string} key - 设置键名
 * @returns {Promise} 设置值
 */
export function getSetting(key) {
  return request.get(`/settings/${key}`);
}

/**
 * 批量更新网站设置（管理端）
 * @param {Object} settings - 设置键值对 { key1: 'value1', key2: 'value2' }
 * @returns {Promise} 更新结果
 */
export function updateSettings(settings) {
  return request.put('/settings', { settings });
}
