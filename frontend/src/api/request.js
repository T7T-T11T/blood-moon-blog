/**
 * Axios 实例配置
 * 作用：统一配置请求基础地址、超时时间、请求/响应拦截器
 *
 * 拦截器作用：
 * - 请求拦截：自动在请求头加上 token
 * - 响应拦截：统一处理错误（如 token 过期自动跳转登录页）
 */
import axios from 'axios';
import { ElMessage } from 'element-plus';
import router from '../router';

/**
 * 获取 API 基础地址
 * 开发环境使用 /api（配合 Vite proxy）
 * 生产环境使用 .env.production 中配置的 VITE_API_BASE_URL
 */
const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

const request = axios.create({
  baseURL: baseURL, // 基础路径，开发环境配合 vite proxy 代理到后端
  timeout: 10000 // 请求超时时间 10 秒
});

// ========== 请求拦截器 ==========
// 每次发请求前自动加上 Authorization 头
request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/** 401 重定向锁，防止并发 401 导致多次跳转 */
let isRedirecting = false;

// ========== 响应拦截器 ==========
// 统一处理响应数据和错误
request.interceptors.response.use(
  (response) => {
    // 请求成功，返回数据
    return response.data;
  },
  (error) => {
    // 请求被中止（如页面导航、组件卸载）——静默处理，不弹提示
    if (error.code === 'ERR_NETWORK' && !error.response) {
      return Promise.reject(error);
    }

    // 请求失败，根据状态码处理
    if (error.response) {
      const { status, data } = error.response;

      // silent 模式：不弹任何 UI 提示，只记录日志，交由调用方自行处理
      if (error.config?.silent) {
        console.warn(
          `[Silent] ${error.config.url} 请求失败 (${status}):`,
          data?.message || error.message
        );
        return Promise.reject(error);
      }

      if (status === 401) {
        // token 过期或未登录，清除登录信息并跳转登录页（加锁防止并发重复跳转）
        if (!isRedirecting) {
          isRedirecting = true;
          localStorage.removeItem('token');
          localStorage.removeItem('username');
          ElMessage.error('登录已过期，请重新登录');
          router.push('/login').finally(() => {
            isRedirecting = false;
          });
        }
      } else if (status === 429) {
        // 限流错误：不弹 ElMessage 打扰，交由调用方处理
        console.warn('[429] 请求被限流:', data?.message || '请求过于频繁');
      } else {
        // 其他错误，显示错误信息
        ElMessage.error(data.message || '请求失败');
      }
    } else {
      // 无 response 的错误（如超时、被中止），仅在非中止情况下提示
      if (error.code !== 'ECONNABORTED') {
        ElMessage.error('网络异常，请检查网络连接');
      }
    }
    return Promise.reject(error);
  }
);

export default request;
