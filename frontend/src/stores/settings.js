/**
 * 网站设置状态管理（Pinia Store）
 * 作用：全局管理网站全局设置（站点名、描述等），从 API 获取一次后缓存
 */
import { defineStore } from 'pinia';
import { getSettings } from '../api/settings';

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    /** 是否已加载 */
    loaded: false,
    /** 设置数据 */
    data: {
      siteName: '个人博客',
      siteDescription: '分享技术，记录成长'
    }
  }),

  getters: {
    siteName: (state) => state.data.siteName || '个人博客',
    siteDescription: (state) => state.data.siteDescription || '分享技术，记录成长'
  },

  actions: {
    /**
     * 从 API 加载网站设置，仅首次调用时请求
     */
    async fetchSettings() {
      if (this.loaded) return;
      try {
        const res = await getSettings();
        if (res.data && typeof res.data === 'object') {
          this.data = { ...this.data, ...res.data };
        }
      } catch (e) {
        console.error('[Settings Store] 加载设置失败:', e);
      } finally {
        this.loaded = true;
      }
    }
  }
});
