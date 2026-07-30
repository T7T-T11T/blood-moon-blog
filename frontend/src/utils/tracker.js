/**
 * 页面访问追踪器
 * 在路由守卫中自动上报页面访问（PV/UV）
 */
import { recordVisit } from '../api/visits';

/** 记录一次页面访问 */
export function trackPageView(pagePath, referrer = '') {
  // 忽略管理后台页面
  if (pagePath.startsWith('/admin') || pagePath.startsWith('/login')) return;

  recordVisit({
    page_path: pagePath,
    referrer: referrer || document.referrer
  }).catch(() => {
    // 记录失败静默处理，不影响用户体验
  });
}
