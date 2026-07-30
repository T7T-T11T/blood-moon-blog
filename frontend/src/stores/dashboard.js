/**
 * 仪表盘状态管理（Pinia Store）
 * 作用：集中管理仪表盘统计数据，避免 Dashboard 和 AdminLayout 间重复请求。
 *       统一管理轮询逻辑（30 秒间隔，页面不可见时暂停）。
 */
import { defineStore } from 'pinia';
import { getCommentStats } from '../api/comments';

export const useDashboardStore = defineStore('dashboard', {
  state: () => ({
    /** 待审核评论数 */
    pendingComments: 0,
    /** 评论总数 */
    totalComments: 0,
    /** 统计加载中 */
    statsLoading: false,
    /** 上次待审核数量（用于变化检测） */
    lastPendingCount: -1
  }),

  getters: {
    /** 是否有待审核评论 */
    hasPending: (state) => state.pendingComments > 0
  },

  actions: {
    /**
     * 获取评论统计数据
     * @returns {Promise<boolean>} 是否成功
     */
    async fetchCommentStats() {
      this.statsLoading = true;
      try {
        const res = await getCommentStats();
        if (res.code === 200 && res.data) {
          const newPending = res.data.pending || 0;
          const newTotal =
            (res.data.pending || 0) + (res.data.approved || 0) + (res.data.rejected || 0);

          this.pendingComments = newPending;
          this.totalComments = newTotal;

          // 更新变化记录
          if (this.lastPendingCount === -1) {
            this.lastPendingCount = newPending;
          } else {
            this.lastPendingCount = newPending;
          }

          return true;
        }
        return false;
      } catch (e) {
        console.error('获取评论统计失败：', e);
        throw e;
      } finally {
        this.statsLoading = false;
      }
    }
  }
});
