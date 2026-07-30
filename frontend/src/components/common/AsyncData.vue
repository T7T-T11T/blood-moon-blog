<!--
  AsyncData.vue
  统一处理 loading / error / empty 三种异步数据状态
  Props: loading, error, empty, errorMessage, emptyMessage, loadingMessage
  Slots: default (数据就绪内容), error, empty, loading
-->
<template>
  <div class="async-data">
    <!-- 错误状态 -->
    <div v-if="error" class="async-state async-error">
      <slot name="error">
        <p class="state-text">{{ errorMessage }}</p>
        <button v-if="retryText" class="retry-btn" @click="$emit('retry')">{{ retryText }}</button>
      </slot>
    </div>

    <!-- 加载状态 -->
    <div v-else-if="loading" class="async-state async-loading">
      <slot name="loading">
        <div class="loading-spinner" aria-label="加载中"></div>
        <p class="state-text">{{ loadingMessage }}</p>
      </slot>
    </div>

    <!-- 空状态 -->
    <div v-else-if="empty" class="async-state async-empty">
      <slot name="empty">
        <p class="state-text">{{ emptyMessage }}</p>
      </slot>
    </div>

    <!-- 数据就绪 -->
    <slot v-else />
  </div>
</template>

<script setup>
defineProps({
  loading: { type: Boolean, default: false },
  error: { type: Boolean, default: false },
  empty: { type: Boolean, default: false },
  errorMessage: { type: String, default: '加载失败，请稍后重试' },
  emptyMessage: { type: String, default: '暂无数据' },
  loadingMessage: { type: String, default: '加载中...' },
  retryText: { type: String, default: '' }
});

defineEmits(['retry']);
</script>

<style scoped>
.async-data {
  position: relative;
}

.async-state {
  text-align: center;
  padding: 80px 20px;
}

.state-text {
  margin: 0;
  font-size: 15px;
  color: var(--text-tertiary);
}

/* 加载动画 */
.loading-spinner {
  width: 36px;
  height: 36px;
  margin: 0 auto 16px;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 重试按钮 */
.retry-btn {
  margin-top: 16px;
  padding: 8px 24px;
  font-size: 14px;
  font-weight: 500;
  color: #fff;
  background: var(--primary);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition:
    background 0.25s var(--ease-out),
    transform 0.25s var(--ease-spring);
}

.retry-btn:hover {
  background: var(--primary-dark);
  transform: translateY(-2px);
}
</style>
