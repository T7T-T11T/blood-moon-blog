<!--
番茄钟页面
作用：提供番茄钟计时器功能，支持设置时长、开始/暂停/结束，并记录专注历史
状态管理：使用 Pinia store 持久化计时器状态，支持跨页面保持计时
-->
<template>
  <div class="pomodoro-page">
    <div class="page-header animate-fade-in-down">
      <h2 class="page-title">番茄钟</h2>
      <span class="page-desc">专注当下，提升效率</span>
    </div>

    <!-- 计时器卡片 -->
    <div class="timer-card animate-scale-in delay-150">
      <div class="timer-section">
        <div class="timer-circle-wrapper">
          <svg class="progress-ring" width="280" height="280">
            <circle class="progress-ring-bg" cx="140" cy="140" r="125" />
            <circle class="progress-ring-fg" cx="140" cy="140" r="125" :style="progressStyle" />
          </svg>
          <div class="timer-display">
            <div class="timer-time">{{ formatTime(pomodoroStore.remainingTime) }}</div>
            <div class="timer-status" :class="{ active: pomodoroStore.isRunning }">
              {{ pomodoroStore.timerStatus }}
            </div>
          </div>
        </div>

        <div class="timer-controls">
          <div class="duration-select">
            <span class="control-label">时长</span>
            <el-input-number
              :model-value="pomodoroStore.duration"
              :min="1"
              :max="120"
              :disabled="pomodoroStore.isRunning || pomodoroStore.isPaused"
              size="large"
              @update:model-value="handleDurationChange"
            />
            <span class="control-unit">分钟</span>
          </div>

          <div class="control-buttons">
            <el-button type="primary" size="large" class="start-btn" @click="toggleTimer">
              <el-icon
                ><component
                  :is="
                    pomodoroStore.isRunning
                      ? 'VideoPause'
                      : pomodoroStore.isPaused
                        ? 'VideoPlay'
                        : 'VideoPlay'
                  "
              /></el-icon>
              {{ pomodoroStore.isRunning ? '暂停' : pomodoroStore.isPaused ? '继续' : '开始专注' }}
            </el-button>
            <el-button
              size="large"
              class="stop-btn"
              :disabled="!pomodoroStore.isRunning && !pomodoroStore.isPaused"
              @click="pomodoroStore.stopTimer()"
            >
              <el-icon><VideoPause /></el-icon>
              结束
            </el-button>
          </div>

          <div v-if="pomodoroStore.isRunning || pomodoroStore.isPaused" class="task-input">
            <el-input
              :model-value="pomodoroStore.taskName"
              placeholder="你在专注做什么？（选填）"
              size="large"
              :prefix-icon="Edit"
              @update:model-value="pomodoroStore.setTaskName"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 专注历史记录 -->
    <div class="history-card animate-fade-in-up delay-300">
      <div class="history-header">
        <div class="history-title">
          <el-icon><Clock /></el-icon>
          <span>专注记录</span>
        </div>
        <span class="history-count">共 {{ pomodoroStore.sessions.length }} 条</span>
      </div>
      <el-table
        v-loading="pomodoroStore.loadingSessions"
        :data="pomodoroStore.sessions"
        style="width: 100%"
      >
        <el-table-column prop="task_name" label="专注内容" min-width="200">
          <template #default="{ row }">
            <span class="task-name">{{ row.task_name || '未命名' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="duration" label="时长" width="120">
          <template #default="{ row }">
            <span class="duration-text">{{ row.duration }} 分钟</span>
          </template>
        </el-table-column>
        <el-table-column prop="completed" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.completed ? 'success' : 'warning'" size="small" round>
              {{ row.completed ? '已完成' : '已中断' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="started_at" label="开始时间" width="180">
          <template #default="{ row }">
            <span class="time-text">{{ formatDateTime(row.started_at) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ row }">
            <el-button type="danger" text size="small" @click="handleDelete(row)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
/**
 * 番茄钟计时器页面
 * - 使用 pomodoroStore 管理状态，支持跨页面保持计时
 * - 支持设置专注时长（1-120分钟）
 * - 支持开始、暂停、继续、结束
 * - 记录专注历史到后端
 */
import { computed, onMounted } from 'vue';
import { ElMessageBox } from 'element-plus';
import { Clock, Edit, Delete } from '@element-plus/icons-vue';
import { usePomodoroStore } from '../stores/pomodoro';

const pomodoroStore = usePomodoroStore();

/** SVG 环形进度样式 */
const progressStyle = computed(() => {
  const circumference = 2 * Math.PI * 125;
  const offset = circumference * (1 - pomodoroStore.progressPercent / 100);
  return {
    strokeDasharray: circumference,
    strokeDashoffset: offset,
    transition: 'stroke-dashoffset 0.5s ease'
  };
});

/** 切换计时器状态 */
function toggleTimer() {
  if (pomodoroStore.isRunning) {
    pomodoroStore.pauseTimer();
  } else {
    pomodoroStore.startTimer();
  }
}

/** 处理时长变更 */
function handleDurationChange(value) {
  pomodoroStore.setDuration(value);
}

/** 删除专注记录 */
async function handleDelete(row) {
  try {
    await ElMessageBox.confirm('确定删除？', '确认', { type: 'warning' });
    pomodoroStore.deleteSession(row.id);
  } catch (e) {
    // 用户取消
  }
}

/** 格式化秒数为 mm:ss */
function formatTime(s) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** 格式化日期时间 */
function formatDateTime(d) {
  if (!d) return '';
  const dt = new Date(d);
  return (
    dt.toLocaleDateString('zh-CN') +
    ' ' +
    dt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  );
}

onMounted(() => {
  pomodoroStore.loadSessions();
});
</script>

<style scoped>
.pomodoro-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.page-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.page-desc {
  font-size: 13px;
  color: var(--text-tertiary);
}

/* 计时器卡片 */
.timer-card {
  background: #fff;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-light);
  padding: 48px;
  display: flex;
  justify-content: center;
}

.timer-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
  max-width: 500px;
  width: 100%;
}

/* SVG 圆环 */
.timer-circle-wrapper {
  position: relative;
  width: 280px;
  height: 280px;
}

.progress-ring {
  transform: rotate(-90deg);
}

.progress-ring-bg {
  fill: none;
  stroke: var(--bg-hover);
  stroke-width: 8;
}

.progress-ring-fg {
  fill: none;
  stroke: var(--primary);
  stroke-width: 8;
  stroke-linecap: round;
}

.timer-display {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.timer-time {
  font-size: 56px;
  font-weight: 700;
  color: var(--text-primary);
  font-family: 'SF Mono', 'Fira Code', monospace;
  line-height: 1;
}

.timer-status {
  font-size: 14px;
  color: var(--text-tertiary);
  margin-top: 12px;
  font-weight: 500;
}

.timer-status.active {
  color: var(--primary);
}

/* 控制区 */
.timer-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 100%;
}

.duration-select {
  display: flex;
  align-items: center;
  gap: 12px;
}

.control-label {
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 500;
}

.control-unit {
  font-size: 14px;
  color: var(--text-secondary);
}

.control-buttons {
  display: flex;
  gap: 12px;
}

.start-btn {
  height: 48px;
  padding: 0 32px;
  font-size: 16px;
  font-weight: 600;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, #0d9488, #0891b2);
  border: none;
}

.stop-btn {
  height: 48px;
  padding: 0 24px;
  border-radius: var(--radius-md);
}

.task-input {
  width: 100%;
  max-width: 400px;
}

/* 历史记录 */
.history-card {
  background: #fff;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-light);
  overflow: hidden;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-light);
}

.history-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.history-title .el-icon {
  color: var(--primary);
}

.history-count {
  font-size: 13px;
  color: var(--text-tertiary);
}

.task-name {
  font-weight: 500;
  color: var(--text-primary);
}

.duration-text {
  font-weight: 600;
  color: var(--text-primary);
}

.time-text {
  font-size: 13px;
  color: var(--text-secondary);
}
</style>
