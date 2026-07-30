<!--
  ReadingProgress.vue
  阅读进度条 + 返回顶部浮动按钮
  独立管理 scroll 事件，不依赖父组件
-->
<template>
  <!-- 阅读进度条：固定顶部，随滚动填充 -->
  <div class="progress-bar" :style="{ width: progress + '%' }"></div>

  <!-- 返回顶部浮动按钮 -->
  <transition name="fade-scale">
    <button v-if="showBackTop" class="back-top" aria-label="返回顶部" @click="scrollToTop">
      <el-icon><Top /></el-icon>
    </button>
  </transition>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { Top } from '@element-plus/icons-vue';

/** 阅读进度（0-100） */
const progress = ref(0);

/** 是否显示返回顶部按钮 */
const showBackTop = ref(false);

/**
 * 滚动监听：更新阅读进度 + 控制返回顶部按钮显隐
 */
function handleScroll() {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  progress.value = docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0;
  showBackTop.value = scrollTop > 400;
}

/** 平滑滚动到顶部 */
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
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

/* ========== 返回顶部按钮 ========== */
.back-top {
  position: fixed;
  bottom: 32px;
  right: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  font-size: 20px;
  color: #fff;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  z-index: 90;
  box-shadow: 0 8px 24px rgba(220, 38, 38, 0.4);
  transition:
    transform 0.3s var(--ease-spring),
    box-shadow 0.3s var(--ease-out);
}

.back-top:hover {
  transform: translateY(-4px) scale(1.05);
  box-shadow: 0 12px 32px rgba(220, 38, 38, 0.5);
}

/* 返回顶部按钮过渡 */
.fade-scale-enter-active,
.fade-scale-leave-active {
  transition:
    opacity 0.3s var(--ease-out),
    transform 0.3s var(--ease-spring);
}

.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.5);
}

/* ========== 响应式 ========== */
@media (max-width: 768px) {
  .back-top {
    right: 20px;
    bottom: 20px;
    width: 44px;
    height: 44px;
  }
}
</style>
