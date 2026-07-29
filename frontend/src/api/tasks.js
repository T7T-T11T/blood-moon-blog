/**
 * 任务管理相关 API
 * 作用：封装任务的增删改查接口请求
 */
import request from './request';

/**
 * 获取任务列表
 * @param {Object} params - { status } 可选，筛选状态
 * @returns {Promise} 任务列表数组
 */
export function getTasksAPI(params = {}) {
  return request.get('/tasks', { params });
}

/**
 * 新增任务
 * @param {Object} data - { title, description, status, priority, due_date }
 * @returns {Promise} 新增结果
 */
export function addTaskAPI(data) {
  return request.post('/tasks', data);
}

/**
 * 编辑任务
 * @param {Number} id - 任务 ID
 * @param {Object} data - { title, description, status, priority, due_date }
 * @returns {Promise} 编辑结果
 */
export function updateTaskAPI(id, data) {
  return request.put(`/tasks/${id}`, data);
}

/**
 * 删除任务
 * @param {Number} id - 任务 ID
 * @returns {Promise} 删除结果
 */
export function deleteTaskAPI(id) {
  return request.delete(`/tasks/${id}`);
}

/**
 * 快捷修改任务状态
 * @param {Number} id - 任务 ID
 * @param {String} status - 新状态（待办/进行中/已完成）
 * @returns {Promise} 修改结果
 */
export function changeTaskStatusAPI(id, status) {
  return request.patch(`/tasks/${id}/status`, { status });
}
