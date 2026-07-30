<!--
  ReadingProgress.vue
  阅读进度条组件
  文章详情页专用，显示阅读进度百分比
-->
<template>
  <!-- 阅读进度条：固定顶部，随滚动填充 -->
  <div class="progress-bar" :style="{ width: progress + '%' }"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

/** 阅读进度（0-100） */
const progress = ref(0);

/**
 * 滚动监听：更新阅读进度
 */
function handleScroll() {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  progress.value = docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0;
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true });
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
});
</script>

<style scoped>
/* ========== 阅读进度条 ========== */
.progress-bar {
  position: fixed;
  top: 0;
  left: 0;
  height: 3px;
  background: linear-gradient(to right, var(--primary), var(--primary-light));
  z-index: 200;
  transition: width 0.1s linear;
  box-shadow: 0 0 8px rgba(220, 38, 38, 0.4);
}
</style>
