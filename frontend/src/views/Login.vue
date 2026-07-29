<!--
登录页面
作用：用户登录表单，提交后获取 token 存入 store
设计：借鉴 vue-pure-admin / vue-vben-admin 左右分栏布局
      左侧品牌展示区（粒子动画 + 特性介绍）+ 右侧登录表单区（毛玻璃卡片）
-->
<template>
  <div class="login-page">
    <!-- 粒子动画背景 -->
    <canvas ref="particleCanvas" class="particle-canvas"></canvas>

    <!-- 背景装饰 -->
    <div class="bg-decoration">
      <div class="shape shape-1"></div>
      <div class="shape shape-2"></div>
      <div class="shape shape-3"></div>
    </div>

    <!-- 左侧品牌展示区 -->
    <aside class="brand-side">
      <div class="brand-content">
        <!-- Logo区域 -->
        <div class="brand-logo animate-fade-in-up">
          <div class="logo-icon">
            <el-icon :size="42"><DataLine /></el-icon>
            <div class="logo-glow"></div>
          </div>
          <h1 class="logo-title">效率中心</h1>
          <p class="logo-slogan">专注当下，成就非凡</p>
        </div>

        <!-- 特性卡片 -->
        <div class="features">
          <div class="feature-item animate-fade-in-up delay-200">
            <div class="feature-icon">
              <el-icon :size="20"><Timer /></el-icon>
            </div>
            <div class="feature-text">
              <h3>番茄工作法</h3>
              <p>科学计时，高效专注</p>
            </div>
            <div class="feature-decoration"></div>
          </div>
          <div class="feature-item animate-fade-in-up delay-300">
            <div class="feature-icon">
              <el-icon :size="20"><EditPen /></el-icon>
            </div>
            <div class="feature-text">
              <h3>博客创作</h3>
              <p>记录想法，分享见解</p>
            </div>
            <div class="feature-decoration"></div>
          </div>
          <div class="feature-item animate-fade-in-up delay-400">
            <div class="feature-icon">
              <el-icon :size="20"><DataAnalysis /></el-icon>
            </div>
            <div class="feature-text">
              <h3>数据洞察</h3>
              <p>可视化你的成长轨迹</p>
            </div>
            <div class="feature-decoration"></div>
          </div>
        </div>

        <!-- 统计数据 -->
        <div class="brand-stats animate-fade-in-up delay-500">
          <div class="stat-item">
            <span class="stat-value">10K+</span>
            <span class="stat-label">专注时长</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-value">500+</span>
            <span class="stat-label">文章创作</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-value">99%</span>
            <span class="stat-label">完成率</span>
          </div>
        </div>

        <!-- 用户评价 -->
        <div class="brand-testimonial animate-fade-in-up delay-600">
          <div class="testimonial-avatar">
            <span>A</span>
          </div>
          <div class="testimonial-content">
            <p class="testimonial-text">"这个工具让我每天的工作效率提升了3倍，强烈推荐！"</p>
            <div class="testimonial-author">
              <span class="author-name">Alex Chen</span>
              <span class="author-role">产品经理</span>
            </div>
          </div>
        </div>
      </div>
    </aside>

    <!-- 右侧登录表单区 -->
    <main class="login-side">
      <div class="login-container">
        <!-- 移动端Logo -->
        <div class="mobile-logo">
          <div class="logo-icon">
            <el-icon :size="28"><DataLine /></el-icon>
          </div>
          <span class="logo-text">效率中心</span>
        </div>

        <!-- 登录卡片 -->
        <div class="login-card animate-scale-in">
          <div class="card-glow"></div>

          <div class="card-header">
            <h2 class="welcome-text">欢迎回来</h2>
            <p class="subtitle">登录您的账号，继续高效之旅</p>
          </div>

          <el-form ref="formRef" :model="form" :rules="rules" class="login-form" size="large">
            <el-form-item prop="username">
              <el-input
                v-model="form.username"
                placeholder="请输入用户名或邮箱"
                :prefix-icon="User"
                clearable
                class="form-input"
              />
            </el-form-item>
            <el-form-item prop="password">
              <el-input
                v-model="form.password"
                type="password"
                placeholder="请输入密码"
                show-password
                :prefix-icon="Lock"
                class="form-input"
              />
            </el-form-item>

            <div class="form-options">
              <el-checkbox
                v-model="rememberMe"
                label="记住我"
                class="remember-checkbox"
              ></el-checkbox>
              <el-link type="primary" :underline="false" class="forgot-link" @click="showForgotTip">
                <el-icon><Key /></el-icon>
                忘记密码？
              </el-link>
            </div>

            <el-button type="primary" :loading="loading" class="login-btn" @click="handleLogin">
              <span v-if="!loading">登 录</span>
              <span v-else>登录中...</span>
            </el-button>
          </el-form>

          <div class="divider">
            <span class="divider-text">其他登录方式</span>
          </div>

          <div class="social-login">
            <button class="social-btn github" title="GitHub">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path
                  d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.17c-3.34.72-4.04-1.42-4.04-1.42-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.21.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5 1 .11-.78.42-1.3.76-1.6-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23.96-.27 1.98-.4 3-.4s2.04.13 3 .4c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.82.58C20.57 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z"
                />
              </svg>
              <span>GitHub</span>
            </button>
            <button class="social-btn google" title="Google">
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>Google</span>
            </button>
            <button class="social-btn wechat" title="微信">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="#07C160">
                <path
                  d="M8.691 2C4.448 2 1 4.895 1 8.44c0 2.012 1.166 3.8 2.968 4.958l-.66 1.983 2.318-1.162c.83.166 1.503.334 2.318.334.166 0 .333-.008.498-.023-.104-.352-.159-.719-.159-1.1 0-3.293 3.11-5.97 6.938-5.97.162 0 .323.007.483.019C14.73 4.256 12.026 2 8.691 2zm-2.4 2.508c.457 0 .827.37.827.827 0 .457-.37.827-.827.827-.457 0-.827-.37-.827-.827 0-.457.37-.827.827-.827zm4.71 0c.457 0 .827.37.827.827 0 .457-.37.827-.827.827-.457 0-.827-.37-.827-.827 0-.457.37-.827.827-.827zm3.98 3.212c-3.557 0-6.438 2.407-6.438 5.378 0 2.971 2.881 5.378 6.438 5.378.756 0 1.492-.114 2.182-.324l1.974.987-.541-1.647c1.424-1.016 2.323-2.523 2.323-4.194 0-2.971-2.881-5.578-6.438-5.578zM12.23 12.3c-.384 0-.696-.312-.696-.696 0-.384.312-.696.696-.696.384 0 .696.312.696.696 0 .384-.312.696-.696.696zm3.93 0c-.384 0-.696-.312-.696-.696 0-.384.312-.696.696-.696.384 0 .696.312.696.696 0 .384-.312.696-.696.696z"
                />
              </svg>
              <span>微信</span>
            </button>
          </div>

          <div class="card-footer">
            <span>还没有账号？</span>
            <el-link type="primary" class="register-link" @click="$router.push('/register')">
              立即注册
              <el-icon><ArrowRight /></el-icon>
            </el-link>
          </div>
        </div>

        <div class="footer-links">
          <p>© 2024 效率中心. All rights reserved.</p>
          <div class="footer-links-row">
            <span>服务条款</span>
            <span class="divider-dot">·</span>
            <span>隐私政策</span>
            <span class="divider-dot">·</span>
            <span>帮助中心</span>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
/**
 * 登录页面逻辑
 * - 粒子动画背景（Canvas实现）
 * - 表单校验
 * - 调用登录接口
 * - 登录成功后存 token，跳转首页
 */
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import {
  User,
  Lock,
  DataLine,
  Timer,
  EditPen,
  DataAnalysis,
  Key,
  ArrowRight
} from '@element-plus/icons-vue';
import { loginAPI } from '../api/auth';
import { useUserStore } from '../stores/user';

const router = useRouter();
const userStore = useUserStore();
const formRef = ref();
const loading = ref(false);
const rememberMe = ref(false);
const particleCanvas = ref(null);

/** 表单数据 */
const form = reactive({
  username: '',
  password: ''
});

/** 表单校验规则 */
const rules = {
  username: [{ required: true, message: '请输入用户名或邮箱', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
};

/**
 * 处理登录
 * @description 表单校验通过后调用登录API，成功后存储token并跳转首页
 */
async function handleLogin() {
  await formRef.value.validate();
  loading.value = true;
  try {
    const res = await loginAPI(form);
    userStore.setLogin(res.data.token, res.data.user.username);
    ElMessage.success('登录成功，欢迎回来！');
    router.push('/');
  } catch (err) {
    // 错误已在拦截器中处理
  } finally {
    loading.value = false;
  }
}

/** 忘记密码提示 */
function showForgotTip() {
  ElMessage.info('请联系管理员重置密码');
}

// ========== 粒子动画系统 ==========

/** 粒子配置 */
const PARTICLE_CONFIG = {
  count: 60,
  maxDistance: 120,
  speed: 0.25,
  size: { min: 1, max: 3 },
  colors: ['#ffffff', '#5eead4', '#99f6e4', '#67e8f9', '#a7f3d0']
};

/**
 * 粒子类
 * @description 管理单个粒子的位置、速度、颜色和绘制
 */
class Particle {
  /**
   * 创建粒子
   * @param {number} width - 画布宽度
   * @param {number} height - 画布高度
   */
  constructor(width, height) {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.vx = (Math.random() - 0.5) * PARTICLE_CONFIG.speed;
    this.vy = (Math.random() - 0.5) * PARTICLE_CONFIG.speed;
    this.size =
      Math.random() * (PARTICLE_CONFIG.size.max - PARTICLE_CONFIG.size.min) +
      PARTICLE_CONFIG.size.min;
    this.color = PARTICLE_CONFIG.colors[Math.floor(Math.random() * PARTICLE_CONFIG.colors.length)];
    this.opacity = Math.random() * 0.4 + 0.2;
  }

  /**
   * 更新粒子位置
   * @param {number} width - 画布宽度
   * @param {number} height - 画布高度
   * @param {object} mouse - 鼠标位置 {x, y}
   */
  update(width, height, mouse) {
    this.x += this.vx;
    this.y += this.vy;

    if (this.x < 0 || this.x > width) this.vx *= -1;
    if (this.y < 0 || this.y > height) this.vy *= -1;

    if (mouse) {
      const dx = mouse.x - this.x;
      const dy = mouse.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 150) {
        const force = ((150 - dist) / 150) * 0.008;
        this.vx += dx * force;
        this.vy += dy * force;
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed > 0.8) {
          this.vx = (this.vx / speed) * 0.8;
          this.vy = (this.vy / speed) * 0.8;
        }
      }
    }
  }

  /**
   * 绘制粒子
   * @param {CanvasRenderingContext2D} ctx - 画布上下文
   */
  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.globalAlpha = this.opacity;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

let particles = [];
let animationId = null;
let ctx = null;
let mouse = null;

/** 初始化粒子系统 */
function initParticles() {
  const canvas = particleCanvas.value;
  if (!canvas) return;

  ctx = canvas.getContext('2d');
  resizeCanvas();

  particles = [];
  for (let i = 0; i < PARTICLE_CONFIG.count; i++) {
    particles.push(new Particle(canvas.width, canvas.height));
  }

  mouse = { x: canvas.width / 2, y: canvas.height / 2 };
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseleave', handleMouseLeave);
  window.addEventListener('resize', resizeCanvas);

  animate();
}

/** 处理鼠标移动 */
function handleMouseMove(e) {
  const canvas = particleCanvas.value;
  const rect = canvas.getBoundingClientRect();
  mouse = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
}

/** 处理鼠标离开 */
function handleMouseLeave() {
  mouse = null;
}

/** 调整画布大小 */
function resizeCanvas() {
  const canvas = particleCanvas.value;
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

/**
 * 绘制粒子之间的连线
 * @param {CanvasRenderingContext2D} ctx - 画布上下文
 */
function drawConnections(ctx) {
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < PARTICLE_CONFIG.maxDistance) {
        const opacity = (1 - dist / PARTICLE_CONFIG.maxDistance) * 0.25;
        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.strokeStyle = `rgba(94, 234, 212, ${opacity})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
  }
}

/** 动画循环 */
function animate() {
  const canvas = particleCanvas.value;
  if (!canvas || !ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  particles.forEach((particle) => {
    particle.update(canvas.width, canvas.height, mouse);
    particle.draw(ctx);
  });

  drawConnections(ctx);

  animationId = requestAnimationFrame(animate);
}

/** 清理粒子系统 */
function cleanupParticles() {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  const canvas = particleCanvas.value;
  if (canvas) {
    canvas.removeEventListener('mousemove', handleMouseMove);
    canvas.removeEventListener('mouseleave', handleMouseLeave);
    window.removeEventListener('resize', resizeCanvas);
  }
  particles = [];
}

onMounted(async () => {
  await nextTick();
  initParticles();
});

onUnmounted(() => {
  cleanupParticles();
});
</script>

<style scoped>
/* ========== 页面主容器 ========== */
.login-page {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background: linear-gradient(135deg, #0f766e 0%, #14b8a6 40%, #0891b2 100%);
  display: flex;
}

/* ========== 粒子画布 ========== */
.particle-canvas {
  position: absolute;
  inset: 0;
  z-index: 0;
}

/* ========== 背景装饰 ========== */
.bg-decoration {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.shape {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.3;
}

.shape-1 {
  width: 400px;
  height: 400px;
  background: #5eead4;
  top: -100px;
  right: -100px;
  animation: float 20s ease-in-out infinite;
}

.shape-2 {
  width: 300px;
  height: 300px;
  background: #22d3ee;
  bottom: -50px;
  left: 20%;
  animation: float 15s ease-in-out infinite reverse;
}

.shape-3 {
  width: 250px;
  height: 250px;
  background: #99f6e4;
  top: 40%;
  right: 10%;
  animation: float 25s ease-in-out infinite;
}

/* ========== 左侧品牌展示区 ========== */
.brand-side {
  position: relative;
  z-index: 1;
  flex: 1.2;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px;
  color: #fff;
  overflow: hidden;
}

.brand-side::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(15, 118, 110, 0.2) 0%, rgba(8, 145, 178, 0.05) 100%);
}

.brand-content {
  position: relative;
  z-index: 1;
  max-width: 460px;
}

/* Logo区域 */
.brand-logo {
  text-align: left;
  margin-bottom: 40px;
}

.logo-icon {
  width: 76px;
  height: 76px;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(12px);
  border-radius: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  position: relative;
  overflow: hidden;
}

.logo-glow {
  position: absolute;
  inset: -50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, transparent 60%);
  animation: rotate 8s linear infinite;
}

.logo-title {
  font-size: 38px;
  font-weight: 700;
  margin: 0 0 10px;
  letter-spacing: 3px;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.logo-slogan {
  font-size: 16px;
  opacity: 0.9;
  margin: 0;
  letter-spacing: 1px;
}

/* 特性列表 */
.features {
  display: flex;
  flex-direction: column;
  gap: 18px;
  margin-bottom: 40px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 22px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.feature-item:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateX(6px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
}

.feature-decoration {
  position: absolute;
  right: 0;
  top: 0;
  width: 4px;
  height: 100%;
  background: linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transform: translateX(100%);
  transition: transform 0.4s ease;
}

.feature-item:hover .feature-decoration {
  transform: translateX(0);
}

.feature-icon {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #0d9488, #0891b2);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.feature-text h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 4px;
}

.feature-text p {
  font-size: 13px;
  opacity: 0.85;
  margin: 0;
}

/* 统计数据 */
.brand-stats {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22px 28px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(12px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  margin-bottom: 30px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.stat-value {
  font-size: 26px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.stat-label {
  font-size: 12px;
  opacity: 0.85;
}

.stat-divider {
  width: 1px;
  height: 36px;
  background: rgba(255, 255, 255, 0.25);
}

/* 用户评价 */
.brand-testimonial {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.testimonial-avatar {
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, #0d9488, #0891b2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 600;
  flex-shrink: 0;
}

.testimonial-content {
  flex: 1;
}

.testimonial-text {
  font-size: 14px;
  line-height: 1.6;
  margin: 0 0 10px;
  opacity: 0.9;
}

.testimonial-author {
  display: flex;
  gap: 10px;
  align-items: baseline;
}

.author-name {
  font-size: 14px;
  font-weight: 600;
}

.author-role {
  font-size: 12px;
  opacity: 0.75;
}

/* ========== 右侧登录表单区 ========== */
.login-side {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  background: linear-gradient(180deg, #f0fdfa 0%, #ffffff 100%);
}

.login-container {
  width: 100%;
  max-width: 440px;
}

/* 移动端Logo */
.mobile-logo {
  display: none;
  align-items: center;
  gap: 10px;
  margin-bottom: 28px;
}

.mobile-logo .logo-icon {
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, #0d9488, #0891b2);
  border-radius: 14px;
  margin: 0;
}

.mobile-logo .logo-text {
  font-size: 20px;
  font-weight: 600;
  color: #111827;
}

/* 登录卡片 */
.login-card {
  background: #fff;
  border-radius: 24px;
  padding: 44px 40px;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.05),
    0 10px 40px -5px rgba(0, 0, 0, 0.08),
    0 20px 60px -10px rgba(13, 148, 136, 0.08);
  position: relative;
  overflow: hidden;
}

.card-glow {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle at 30% 20%, rgba(13, 148, 136, 0.04) 0%, transparent 50%);
  pointer-events: none;
}

.card-header {
  margin-bottom: 36px;
  text-align: center;
}

.welcome-text {
  font-size: 30px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 10px;
  letter-spacing: -0.5px;
}

.subtitle {
  font-size: 15px;
  color: #6b7280;
  margin: 0;
}

/* 表单 */
.login-form :deep(.el-form-item) {
  margin-bottom: 22px;
}

.login-form :deep(.el-input__wrapper) {
  padding: 8px 16px;
  background: #f8fafc;
  border-radius: 14px;
  box-shadow: none;
  border: 2px solid transparent;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.login-form :deep(.el-input__wrapper:hover) {
  border-color: #e2e8f0;
  background: #fff;
}

.login-form :deep(.el-input__wrapper.is-focus) {
  background: #fff;
  border-color: #0d9488;
  box-shadow: 0 0 0 4px rgba(13, 148, 136, 0.1);
}

.login-form :deep(.el-input__inner) {
  height: 44px;
  font-size: 15px;
  color: #111827;
}

.login-form :deep(.el-input__prefix-inner) {
  color: #94a3b8;
}

/* 表单选项 */
.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28px;
}

.remember-checkbox :deep(.el-checkbox__label) {
  color: #64748b;
  font-size: 14px;
}

.forgot-link {
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.forgot-link .el-icon {
  font-size: 14px;
}

/* 登录按钮 */
.login-btn {
  width: 100%;
  height: 52px;
  font-size: 16px;
  font-weight: 600;
  background: linear-gradient(135deg, #0d9488 0%, #0891b2 100%);
  border: none;
  border-radius: 14px;
  letter-spacing: 2px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.login-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 50%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.login-btn:hover::before {
  opacity: 1;
}

.login-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(13, 148, 136, 0.35);
}

.login-btn:active {
  transform: translateY(0) scale(0.98);
}

/* 分割线 */
.divider {
  position: relative;
  text-align: center;
  margin: 32px 0 24px;
}

.divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
}

.divider-text {
  position: relative;
  padding: 0 20px;
  background: #fff;
  font-size: 13px;
  color: #94a3b8;
}

/* 第三方登录 */
.social-login {
  display: flex;
  gap: 14px;
  margin-bottom: 32px;
}

.social-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 48px;
  background: #fff;
  border: 2px solid #f1f5f9;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 13px;
  font-weight: 500;
  color: #475569;
}

.social-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.social-btn.github:hover {
  border-color: #24292e;
  color: #24292e;
}

.social-btn.google:hover {
  border-color: #4285f4;
  color: #4285f4;
}

.social-btn.wechat:hover {
  border-color: #07c160;
  color: #07c160;
}

/* 卡片底部 */
.card-footer {
  text-align: center;
  font-size: 14px;
  color: #64748b;
}

.register-link {
  font-weight: 600;
  margin-left: 6px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.register-link .el-icon {
  transition: transform 0.3s ease;
}

.register-link:hover .el-icon {
  transform: translateX(4px);
}

/* 页脚链接 */
.footer-links {
  text-align: center;
  margin-top: 36px;
  font-size: 12px;
  color: #94a3b8;
}

.footer-links p {
  margin: 0 0 8px;
}

.footer-links-row {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
}

.divider-dot {
  opacity: 0.5;
}

/* ========== 动画关键帧 ========== */
@keyframes float {
  0%,
  100% {
    transform: translateY(0) rotate(0deg);
  }
  50% {
    transform: translateY(-30px) rotate(5deg);
  }
}

@keyframes rotate {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* ========== 响应式 ========== */
@media (max-width: 1024px) {
  .brand-side {
    padding: 40px;
  }

  .brand-logo {
    margin-bottom: 32px;
  }

  .logo-title {
    font-size: 30px;
  }

  .features {
    gap: 14px;
    margin-bottom: 32px;
  }

  .brand-stats {
    padding: 18px 20px;
  }

  .stat-value {
    font-size: 22px;
  }
}

@media (max-width: 900px) {
  .login-page {
    flex-direction: column;
  }

  .brand-side {
    display: none;
  }

  .login-side {
    flex: 1;
    min-height: 100vh;
    padding: 32px 24px;
  }

  .mobile-logo {
    display: flex;
  }

  .login-card {
    padding: 36px 28px;
    border-radius: 20px;
  }

  .welcome-text {
    font-size: 26px;
  }

  .social-btn span {
    display: none;
  }

  .social-btn {
    padding: 0;
  }
}

@media (max-width: 480px) {
  .login-container {
    max-width: 100%;
  }

  .login-card {
    padding: 32px 24px;
  }

  .welcome-text {
    font-size: 24px;
  }

  .stat-value {
    font-size: 20px;
  }
}
</style>
