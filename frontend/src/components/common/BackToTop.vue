/** * @file BackToTop.vue * @description 返回顶部浮动按钮组件 * * 功能： * - 滚动超过 300px
时显示返回顶部按钮 * - 点击平滑滚动回页面顶部 * - 带有悬浮动画效果 */
<template>
  <Transition name="fade">
    <button v-show="visible" class="back-to-top" title="返回顶部" @click="scrollToTop">
      <el-icon :size="20"><ArrowUp /></el-icon>
    </button>
  </Transition>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { ArrowUp } from '@element-plus/icons-vue';

/** 是否显示按钮 */
const visible = ref(false);

/** 滚动阈值（超过此值显示按钮） */
const threshold = 300;

/**
 * 处理滚动事件
 */
function handleScroll() {
  visible.value = window.scrollY > threshold;
}

/**
 * 平滑滚动到顶部
 */
function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll(); // 初始化检查
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
});
</script>

<style scoped>
.back-to-top {
  position: fixed;
  right: 24px;
  bottom: 80px;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  background: linear-gradient(135deg, #c62828 0%, #8e0000 100%);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(198, 40, 40, 0.4);
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease,
    opacity 0.3s ease;
  z-index: 999;
}

.back-to-top:hover {
  transform: translateY(-4px) scale(1.05);
  box-shadow: 0 8px 24px rgba(198, 40, 40, 0.5);
}

.back-to-top:active {
  transform: translateY(0) scale(0.95);
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

/* 响应式 */
@media (max-width: 768px) {
  .back-to-top {
    right: 16px;
    bottom: 70px;
    width: 40px;
    height: 40px;
  }
}
</style>
