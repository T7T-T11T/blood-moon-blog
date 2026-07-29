<!--
  404 页面
  作用：访问不存在的路由时展示
  设计：全屏居中 —— 大号 404 渐变文字 + 浮动粒子背景
  动画：404 弹性入场 + 渐变流动 + 粒子上升（纯 CSS 实现）
-->
<template>
  <div class="not-found-page">
    <!-- 浮动粒子背景 -->
    <div class="particles">
      <span
        v-for="(p, i) in particles"
        :key="i"
        class="particle"
        :style="{
          left: p.left,
          width: p.size,
          height: p.size,
          animationDuration: p.duration,
          animationDelay: p.delay
        }"
      ></span>
    </div>

    <div class="content">
      <!-- 404 数字：弹性入场 + 渐变流动 -->
      <div class="error-code">404</div>
      <h1 class="error-title animate-fade-in-up">页面不存在</h1>
      <p class="error-desc animate-fade-in-up delay-200">您访问的页面已被移除，或从未存在过</p>
      <button class="back-btn animate-fade-in-up delay-300" @click="goHome">返回首页</button>
    </div>
  </div>
</template>

<script setup>
/**
 * 404 页面逻辑
 * - 预生成浮动粒子配置
 * - 提供返回首页入口
 */
import { useRouter } from 'vue-router';

const router = useRouter();

/**
 * 粒子配置：预生成位置、大小、动画时长与延迟
 * 使用稳定算法（非随机）确保渲染一致，避免每次重算
 */
const particles = Array.from({ length: 12 }, (_, i) => ({
  left: ((i * 37) % 100) + '%',
  size: 4 + (i % 4) * 3 + 'px',
  duration: 12 + (i % 5) * 4 + 's',
  delay: (i % 6) * -2 + 's'
}));

/**
 * 返回首页
 */
function goHome() {
  router.push('/');
}
</script>

<style scoped>
/* ========== 页面容器：全屏居中 ========== */
.not-found-page {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: linear-gradient(135deg, #f0fdfa 0%, #ecfeff 50%, #f0fdfa 100%);
}

/* ========== 浮动粒子 ========== */
.particles {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.particle {
  position: absolute;
  bottom: -20px;
  border-radius: 50%;
  background: rgba(13, 148, 136, 0.15);
  animation-name: rise;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}

/* ========== 内容区 ========== */
.content {
  position: relative;
  z-index: 2;
  text-align: center;
  padding: 40px;
}

/* 404 数字：弹性入场 + 渐变流动（两段动画并行） */
.error-code {
  font-size: 180px;
  font-weight: 900;
  line-height: 1;
  letter-spacing: -4px;
  background: linear-gradient(135deg, #0d9488, #14b8a6, #5eead4, #0d9488);
  background-size: 300% 300%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 20px;
  /* bounceIn：弹性入场（复用全局关键帧）；gradientFlow：渐变持续流动 */
  animation:
    bounceIn 0.6s var(--ease-spring) both,
    gradientFlow 6s ease infinite;
}

.error-title {
  font-size: 32px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 14px;
}

.error-desc {
  font-size: 16px;
  color: var(--text-secondary);
  margin: 0 0 40px;
}

/* ========== 返回按钮 ========== */
.back-btn {
  display: inline-block;
  padding: 14px 40px;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 2px;
  color: #fff;
  background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s var(--ease-out);
}

.back-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px rgba(13, 148, 136, 0.35);
}

.back-btn:active {
  transform: translateY(0) scale(0.98);
}

/* ========== 关键帧动画 ========== */
/* 渐变流动：背景位置循环位移 */
@keyframes gradientFlow {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

/* 粒子上升：从底部升至顶部并淡出 */
@keyframes rise {
  0% {
    transform: translateY(0) translateX(0);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  90% {
    opacity: 1;
  }
  100% {
    transform: translateY(-110vh) translateX(30px);
    opacity: 0;
  }
}

/* ========== 响应式 ========== */
@media (max-width: 480px) {
  .error-code {
    font-size: 120px;
  }

  .error-title {
    font-size: 24px;
  }
}
</style>
