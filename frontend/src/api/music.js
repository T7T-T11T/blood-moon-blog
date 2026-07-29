/**
 * 音乐管理 API
 * 作用：封装前后端音乐相关接口调用
 *
 * 接口清单：
 *   - getMusicList        获取启用的音乐列表（前台播放用）
 *   - getAllMusic         获取所有音乐（管理端，含分页）
 *   - uploadMusic         上传音乐文件
 *   - updateMusic         更新音乐信息
 *   - deleteMusic         删除音乐
 */

import request from './request';

/**
 * 获取启用的音乐列表
 * GET /api/music
 * @returns {Promise} 返回音乐数组
 */
export function getMusicList() {
  return request({
    url: '/music',
    method: 'get'
  });
}

/**
 * 获取所有音乐列表（管理端）
 * GET /api/music/all
 * @param {Object} params - 查询参数 { page, page_size }
 * @returns {Promise} 返回分页数据
 */
export function getAllMusic(params) {
  return request({
    url: '/music/all',
    method: 'get',
    params
  });
}

/**
 * 上传音乐文件
 * POST /api/music (multipart/form-data)
 * @param {FormData} formData - 包含 file, title, artist, sort_order
 * @returns {Promise} 返回新音乐ID
 */
export function uploadMusic(formData) {
  return request({
    url: '/music',
    method: 'post',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' }
  });
}

/**
 * 更新音乐信息
 * PUT /api/music/:id
 * @param {number} id - 音乐ID
 * @param {Object} data - 更新字段 { title?, artist?, sort_order?, is_active? }
 * @returns {Promise} 返回操作结果
 */
export function updateMusic(id, data) {
  return request({
    url: `/music/${id}`,
    method: 'put',
    data
  });
}

/**
 * 删除音乐
 * DELETE /api/music/:id
 * @param {number} id - 音乐ID
 * @returns {Promise} 返回操作结果
 */
export function deleteMusic(id) {
  return request({
    url: `/music/${id}`,
    method: 'delete'
  });
}
