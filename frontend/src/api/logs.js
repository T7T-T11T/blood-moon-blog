/**
 * @file logs.js
 * @description 操作日志相关API接口
 * 作用：提供操作日志查询和统计接口
 */

import request from './request';

/**
 * 获取操作日志列表
 * @param {Object} params - 查询参数
 * @param {number} [params.user_id] - 用户ID
 * @param {string} [params.action] - 操作类型
 * @param {string} [params.resource_type] - 资源类型
 * @param {number} [params.resource_id] - 资源ID
 * @param {string} [params.start_date] - 开始日期（YYYY-MM-DD）
 * @param {string} [params.end_date] - 结束日期（YYYY-MM-DD）
 * @param {number} [params.page=1] - 页码
 * @param {number} [params.page_size=20] - 每页数量
 * @returns {Promise<Object>} 返回 { list, pagination }
 */
export function getLogs(params = {}) {
  return request({
    url: '/logs',
    method: 'get',
    params
  });
}

/**
 * 获取当前用户的操作日志
 * @param {Object} params - 查询参数
 * @param {number} [params.limit=100] - 限制数量
 * @returns {Promise<Array>} 返回日志列表
 */
export function getMyLogs(params = {}) {
  return request({
    url: '/logs/my',
    method: 'get',
    params
  });
}

/**
 * 获取操作统计（按操作类型分组）
 * @param {Object} params - 查询参数
 * @param {string} [params.start_date] - 开始日期（YYYY-MM-DD）
 * @param {string} [params.end_date] - 结束日期（YYYY-MM-DD）
 * @returns {Promise<Array>} 返回统计结果
 */
export function getLogStats(params = {}) {
  return request({
    url: '/logs/stats',
    method: 'get',
    params
  });
}
