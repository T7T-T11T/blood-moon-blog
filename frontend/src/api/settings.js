/**
 * 网站设置 API 模块
 * 作用：封装网站设置相关的所有接口请求
 *
 * 接口列表：
 * - getSettings()         获取所有设置项（公开，带缓存 + 共享状态）
 * - getSetting(key)       获取单个设置项（公开）
 * - updateSettings(data)  批量更新设置（管理端）
 *
 * 优化：
 * - getSettings() 使用 defaultCache（30s TTL）缓存，避免重复网络请求
 * - getSettingsState() 返回模块级共享 reactive 对象，供 FrontLayout/Home 共用
 */
import { reactive } from 'vue';
import request from './request';
import { defaultCache } from './cache';

/**
 * 模块级共享设置状态（供所有组件共用，仅请求一次）
 * @type {import('vue').Reactive<{siteName: string, siteDescription: string, [key: string]: any}>}
 */
export const settingsState = reactive({
  siteName: '个人博客',
  siteDescription: '分享技术，记录成长'
});

/**
 * 刷新共享设置状态（内部使用，getSettings 成功后自动调用）
 * @param {Object} data - 设置键值对
 */
/** 下划线键转驼峰：site_name → siteName、footer_text → footerText */
function toCamel(key) {
  return key.replace(/_([a-z])/g, (_, ch) => ch.toUpperCase());
}

function applySettingsToState(data) {
  if (data && typeof data === 'object') {
    const normalized = {};
    for (const [key, value] of Object.entries(data)) {
      normalized[toCamel(key)] = value;
    }
    Object.assign(settingsState, normalized);
  }
}

/**
 * 获取所有网站设置项（公开接口，带 30s 缓存 + 自动同步到共享状态）
 * @returns {Promise<{code: number, data: Object}>} 标准响应格式 { code, data }
 */
export function getSettings() {
  const key = 'getSettings';
  const cached = defaultCache.get(key);
  if (cached) {
    applySettingsToState(cached);
    // 返回与网络请求相同的响应结构 { code: 200, data: cached }
    return Promise.resolve({ code: 200, data: cached });
  }

  return request
    .get('/settings')
    .then((res) => {
      // 兼容两种响应格式：后端返回 { code, data }，取内层 data
      const innerData = res?.data ?? res;
      if (innerData && typeof innerData === 'object') {
        defaultCache.set(key, innerData);
        applySettingsToState(innerData);
      }
      return res;
    })
    .catch((err) => {
      return Promise.reject(err);
    });
}

/**
 * 清除 settings 缓存（管理端更新后调用）
 */
export function clearSettingsCache() {
  defaultCache.delete('getSettings');
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
