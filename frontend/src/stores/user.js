/**
 * 用户状态管理（Pinia Store）
 * 作用：全局管理用户的登录状态、token、用户名
 *
 * 为什么用 Pinia：
 * - 多个组件需要共享登录状态（导航栏、路由守卫、API请求）
 * - Pinia 是 Vue 3 官方推荐的状态管理库
 */
import { defineStore } from 'pinia';

export const useUserStore = defineStore('user', {
  // state：状态数据
  state: () => ({
    token: localStorage.getItem('token') || '',
    username: localStorage.getItem('username') || ''
  }),

  // getters：计算属性
  getters: {
    // 是否已登录（token 不为空）
    isLoggedIn: (state) => !!state.token
  },

  // actions：方法
  actions: {
    /**
     * 设置登录信息
     * @param {String} token - JWT token
     * @param {String} username - 用户名
     */
    setLogin(token, username) {
      this.token = token;
      this.username = username;
      // 同时存到 localStorage，刷新页面后不丢失
      localStorage.setItem('token', token);
      localStorage.setItem('username', username);
    },

    /** 退出登录：清除所有登录信息 */
    logout() {
      this.token = '';
      this.username = '';
      localStorage.removeItem('token');
      localStorage.removeItem('username');
    }
  }
});
