/**
 * 访问统计 API
 */
import request from './request';

/** 记录页面访问 */
export function recordVisit(data) {
  return request.post('/visits', data, { silent: true });
}

/** 获取访问统计（需登录） */
export function getVisitStats() {
  return request.get('/visits/stats');
}
