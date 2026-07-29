/**
 * 番茄钟状态管理
 * 作用：持久化番茄钟计时器状态，支持跨页面保持计时
 * 设计：
 * - 使用 Pinia store 保存计时器状态
 * - 通过 pinia-plugin-persistedstate 持久化关键状态到 localStorage
 * - 计时器的 interval 在 store 中创建，组件卸载时不会停止
 * - 通过 startTimestamp 计算实际经过的时间，确保计时准确性
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { addPomodoroAPI, getPomodoroAPI, deletePomodoroAPI } from '../api/pomodoro';
import { ElMessage } from 'element-plus';

export const usePomodoroStore = defineStore(
  'pomodoro',
  () => {
    /** 专注时长（分钟） */
    const duration = ref(25);
    /** 剩余时间（秒） */
    const remainingTime = ref(25 * 60);
    /** 是否正在运行 */
    const isRunning = ref(false);
    /** 是否暂停 */
    const isPaused = ref(false);
    /** 任务名称 */
    const taskName = ref('');
    /** 专注记录列表 */
    const sessions = ref([]);
    /** 加载状态 */
    const loadingSessions = ref(false);
    /** 计时器开始时间戳（用于持久化恢复时计算经过时间） */
    const startTime = ref(0);
    /** 已累积的秒数（暂停时使用，用于持久化恢复） */
    const accumulatedTime = ref(0);

    /** 计时器 interval ID（不持久化） */
    let timerInterval = null;

    /**
     * 计时器状态文本
     */
    const timerStatus = computed(() => {
      if (isRunning.value) return '专注中...';
      if (isPaused.value) return '已暂停';
      return '准备开始';
    });

    /**
     * 进度百分比
     */
    const progressPercent = computed(() => {
      const total = duration.value * 60;
      return ((total - remainingTime.value) / total) * 100;
    });

    /**
     * 启动计时器
     */
    function startTimer() {
      if (isRunning.value) return;

      if (!isPaused.value) {
        remainingTime.value = duration.value * 60;
        accumulatedTime.value = 0;
      }

      isRunning.value = true;
      isPaused.value = false;
      startTime.value = Date.now();

      if (timerInterval) {
        clearInterval(timerInterval);
      }

      timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime.value) / 1000) + accumulatedTime.value;
        remainingTime.value = Math.max(0, duration.value * 60 - elapsed);

        if (remainingTime.value <= 0) {
          stopTimer();
        }
      }, 250);
    }

    /**
     * 暂停计时器
     */
    function pauseTimer() {
      if (!isRunning.value) return;

      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }

      const elapsed = Math.floor((Date.now() - startTime.value) / 1000) + accumulatedTime.value;
      accumulatedTime.value = elapsed;

      isRunning.value = false;
      isPaused.value = true;
    }

    /**
     * 停止计时器并保存记录
     */
    async function stopTimer() {
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }

      const totalSeconds = duration.value * 60;
      const elapsedSeconds = totalSeconds - remainingTime.value;
      const minutes = Math.ceil(elapsedSeconds / 60);
      const completed = remainingTime.value <= 0;

      isRunning.value = false;
      isPaused.value = false;

      if (minutes > 0) {
        try {
          await addPomodoroAPI({
            duration: minutes,
            task_name: taskName.value || null,
            completed
          });
          ElMessage.success('记录已保存');
          loadSessions();
        } catch (e) {
          // 错误已在拦截器处理
        }
      }

      remainingTime.value = duration.value * 60;
      accumulatedTime.value = 0;
      startTime.value = 0;
      taskName.value = '';
    }

    /**
     * 从持久化状态恢复计时器
     * 计算实际经过的时间并更新剩余时间
     */
    function restoreFromPersisted() {
      if (isRunning.value || isPaused.value) {
        // 根据保存的开始时间戳计算经过的时间
        if (startTime.value > 0) {
          const elapsed = Math.floor((Date.now() - startTime.value) / 1000) + accumulatedTime.value;
          remainingTime.value = Math.max(0, duration.value * 60 - elapsed);

          // 如果已经完成，自动停止
          if (remainingTime.value <= 0) {
            isRunning.value = false;
            isPaused.value = false;
            remainingTime.value = duration.value * 60;
            accumulatedTime.value = 0;
            startTime.value = 0;
            return;
          }
        }

        // 如果之前是运行状态，重新启动计时器
        if (isRunning.value) {
          isRunning.value = false;
          startTimer();
        }
      }
    }

    /**
     * 设置时长
     * @param {number} minutes - 时长（分钟）
     */
    function setDuration(minutes) {
      if (!isRunning.value && !isPaused.value) {
        duration.value = minutes;
        remainingTime.value = minutes * 60;
      }
    }

    /**
     * 设置任务名称
     * @param {string} name - 任务名称
     */
    function setTaskName(name) {
      taskName.value = name;
    }

    /**
     * 加载专注记录
     */
    async function loadSessions() {
      loadingSessions.value = true;
      try {
        const res = await getPomodoroAPI({ limit: 50 });
        sessions.value = res.data;
      } catch (e) {
        // 错误已在拦截器处理
      } finally {
        loadingSessions.value = false;
      }
    }

    /**
     * 删除专注记录
     * @param {number} id - 记录ID
     */
    async function deleteSession(id) {
      try {
        await deletePomodoroAPI(id);
        ElMessage.success('已删除');
        loadSessions();
      } catch (e) {
        // 用户取消或错误已处理
      }
    }

    /**
     * 清理资源
     */
    function cleanup() {
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
    }

    return {
      duration,
      remainingTime,
      isRunning,
      isPaused,
      taskName,
      sessions,
      loadingSessions,
      timerStatus,
      progressPercent,
      startTimer,
      pauseTimer,
      stopTimer,
      restoreFromPersisted,
      setDuration,
      setTaskName,
      loadSessions,
      deleteSession,
      cleanup
    };
  },
  {
    persist: {
      // 持久化关键状态，用于恢复计时器
      // 注意：不持久化 remainingTime，因为恢复时会基于时间戳重新计算
      pick: ['duration', 'isRunning', 'isPaused', 'taskName', 'startTime', 'accumulatedTime'],
      // 使用 localStorage 存储
      storage: localStorage,
      // 恢复后自动计算经过时间并重启计时器
      afterRestore: (ctx) => {
        // 先计算 remainingTime，再恢复运行状态
        const state = ctx.store.$state;
        if (state.startTime > 0) {
          const elapsed = Math.floor((Date.now() - state.startTime) / 1000) + state.accumulatedTime;
          state.remainingTime = Math.max(0, state.duration * 60 - elapsed);
        }
        ctx.store.restoreFromPersisted();
      }
    }
  }
);
