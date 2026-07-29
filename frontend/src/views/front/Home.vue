/** * @file Home.vue * @description 博客首页 - 暗夜哥特风格 * * 设计： * - 主题：暗夜血色（Deep Navy
+ Ember Red） * - Hero：全屏血月背景图 + 遮罩层 + Canvas 火星粒子动画（全页面） * -
内容：深色编辑风格文章列表 + 极简侧边栏 * - 动效：Hero 入场 / 火星飘动 / 滚动揭示 / 悬浮微交互 */
<template>
  <div class="home-page">
    <!-- ============ 全页面背景：火星粒子层 ============ -->
    <canvas ref="emberCanvasRef" class="ember-canvas-full" aria-hidden="true"></canvas>

    <!-- ============ Hero 全屏区域 ============ -->
    <section class="hero">
      <!-- 背景图 -->
      <div class="hero-bg" :style="{ backgroundImage: `url(${heroBg})` }" aria-hidden="true"></div>
      <!-- 暗色渐变遮罩 -->
      <div class="hero-overlay" aria-hidden="true"></div>
      <!-- 血月光晕 -->
      <div class="moon-glow" aria-hidden="true"></div>

      <!-- Hero 文案 -->
      <div class="hero-inner">
        <p class="hero-eyebrow animate-fade-in-down">BLOG</p>
        <h1 class="hero-title">
          <span class="title-text animate-glow">{{ siteDisplayName }}</span>
        </h1>
        <p class="hero-tagline animate-fade-in-up delay-200">{{ siteDescription }}</p>
        <div class="hero-actions animate-fade-in-up delay-400">
          <router-link to="/archive" class="hero-btn primary">
            <span>浏览归档</span>
            <span class="btn-glow" aria-hidden="true"></span>
          </router-link>
          <router-link to="/about" class="hero-btn ghost">关于本站</router-link>
        </div>
      </div>

      <!-- 滚动提示 -->
      <div class="scroll-hint" aria-hidden="true">
        <span class="scroll-text">SCROLL</span>
        <span class="scroll-line"></span>
      </div>
    </section>

    <!-- ============ 主体内容 ============ -->
    <div class="content-wrapper">
      <main class="content-main">
        <!-- 区域标题 -->
        <div ref="sectionHeaderRef" class="section-header reveal">
          <h2 class="section-title">最新文章</h2>
          <span class="section-meta">共 {{ total }} 篇</span>
        </div>

        <!-- 加载骨架 -->
        <div v-if="loading && articles.length === 0" class="article-list">
          <div v-for="n in 5" :key="n" class="article-row skeleton-row">
            <div class="skeleton-line w-70"></div>
            <div class="skeleton-line w-90"></div>
            <div class="skeleton-line w-40"></div>
          </div>
        </div>

        <!-- 文章列表（横向布局） -->
        <div v-else-if="articles.length > 0" class="article-list">
          <article
            v-for="(article, index) in articles"
            :key="article.id"
            class="article-row"
            :style="{ '--row-index': index }"
            @click="goToArticle(article.id)"
          >
            <!-- 主色强调条 -->
            <span class="accent-bar" aria-hidden="true"></span>

            <!-- 文章主体 -->
            <div class="article-body">
              <!-- 元信息 -->
              <div class="article-meta">
                <span v-if="article.category_name" class="meta-category">
                  {{ article.category_name }}
                </span>
                <span class="meta-date">{{ formatDate(article.created_at) }}</span>
                <span class="meta-views">
                  <el-icon><View /></el-icon>
                  {{ article.view_count || 0 }}
                </span>
              </div>
              <!-- 标题 -->
              <h3 class="article-title">{{ article.title }}</h3>
              <!-- 摘要 -->
              <p class="article-excerpt">{{ article.summary || '暂无摘要' }}</p>
              <!-- 阅读链接 -->
              <span class="article-read">
                阅读全文
                <span class="read-arrow">→</span>
              </span>
            </div>
          </article>
        </div>

        <!-- 空状态 -->
        <div v-else class="empty-state">
          <p class="empty-title">暂无文章</p>
          <p class="empty-desc">后台登录后即可发布第一篇文章</p>
        </div>

        <!-- 分页 -->
        <div v-if="total > pageSize" class="pagination-wrapper">
          <el-pagination
            :current-page="currentPage"
            :page-size="pageSize"
            :total="total"
            layout="prev, pager, next"
            background
            @current-change="handlePageChange"
          />
        </div>
      </main>

      <!-- ============ 侧边栏 ============ -->
      <aside class="sidebar">
        <!-- 热门文章 -->
        <section class="sidebar-block">
          <h3 class="sidebar-title">
            <span class="title-mark"></span>
            热门文章
          </h3>
          <ol v-if="hotArticles.length > 0" class="hot-list">
            <li
              v-for="(article, index) in hotArticles"
              :key="article.id"
              class="hot-item"
              @click="goToArticle(article.id)"
            >
              <span class="hot-rank" :class="{ top: index < 3 }">{{ index + 1 }}</span>
              <div class="hot-info">
                <p class="hot-title">{{ article.title }}</p>
                <span class="hot-views">{{ article.view_count || 0 }} 阅读</span>
              </div>
            </li>
          </ol>
          <p v-else class="sidebar-empty">暂无热门文章</p>
        </section>

        <!-- 分类导航 -->
        <section class="sidebar-block">
          <h3 class="sidebar-title">
            <span class="title-mark"></span>
            分类导航
          </h3>
          <div v-if="categories.length > 0" class="category-list">
            <router-link
              v-for="category in categories"
              :key="category.slug"
              :to="`/category/${category.slug}`"
              class="category-item"
            >
              {{ category.name }}
            </router-link>
          </div>
          <p v-else class="sidebar-empty">暂无分类</p>
        </section>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { View } from '@element-plus/icons-vue';
import { getPublicArticles, getHotArticles } from '../../api/articles';
import { getSettings } from '../../api/settings';
// Hero 背景图
import heroBg from '../../assets/hero-bg.jpg';

const router = useRouter();

/** 文章列表 */
const articles = ref([]);

/** 热门文章 */
const hotArticles = ref([]);

/** 加载状态 */
const loading = ref(false);

/** 当前页码 */
const currentPage = ref(1);

/** 每页数量 */
const pageSize = 8;

/** 文章总数 */
const total = ref(0);

/** Intersection Observer 实例（用于滚动揭示动画） */
let observer = null;

/** 区块标题引用（用于初始化观察） */
const sectionHeaderRef = ref(null);

/** 火星粒子 Canvas 引用 */
const emberCanvasRef = ref(null);

/** 火星粒子动画帧 ID */
let emberAnimId = null;

/** 站点配置 */
const settings = ref({
  siteName: '个人博客',
  siteDescription: '分享技术，记录成长'
});

/** 站点显示名称（用于 Hero 标题，空时不显示文字，仅保留发光效果） */
const siteDisplayName = computed(() => {
  const name = settings.value.siteName || '';
  // 如果未配置或为默认值，返回空字符串
  return name && name !== '个人博客' ? name : '';
});

/** 站点描述（Hero 副标题） */
const siteDescription = computed(() => settings.value.siteDescription || '分享技术，记录成长');

/**
 * 从已加载文章中提取去重分类列表
 * @returns {Array<{name: string, slug: string}>}
 */
const categories = computed(() => {
  const map = new Map();
  for (const article of articles.value) {
    if (article.category_slug && article.category_name) {
      if (!map.has(article.category_slug)) {
        map.set(article.category_slug, {
          name: article.category_name,
          slug: article.category_slug
        });
      }
    }
  }
  return Array.from(map.values());
});

/**
 * 格式化日期为 YYYY-MM-DD
 * @param {string} dateStr
 * @returns {string}
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 跳转文章详情
 * @param {number} id
 */
function goToArticle(id) {
  router.push(`/article/${id}`);
}

/**
 * 加载文章列表
 * @param {number} page
 */
async function loadArticles(page = 1) {
  loading.value = true;
  try {
    const { data } = await getPublicArticles({ page, page_size: pageSize });
    if (data && data.list) {
      articles.value = data.list;
      total.value = data.pagination?.total ?? 0;
      await nextTick();
      initObserver();
    }
  } catch (e) {
    console.error('加载文章失败:', e);
  } finally {
    loading.value = false;
  }
}

/**
 * 加载热门文章
 */
async function loadHotArticles() {
  try {
    const { data } = await getHotArticles(5);
    hotArticles.value = Array.isArray(data) ? data : (data?.list ?? []);
  } catch (e) {
    console.error('加载热门文章失败:', e);
  }
}

/**
 * 加载站点配置
 */
async function loadSettings() {
  try {
    const { data } = await getSettings();
    if (data && typeof data === 'object') {
      settings.value = { ...settings.value, ...data };
    }
  } catch (e) {
    console.error('加载站点配置失败:', e);
  }
}

/**
 * 初始化火星粒子动画（Canvas 实现）
 * 多层粒子系统：前景火花 + 中景火星 + 背景微光
 * 带轨迹拖尾、风力漂移、闪烁爆发效果
 * 覆盖整个页面（包含 Hero 区域和内容区域）
 */
function initEmberParticles() {
  const canvas = emberCanvasRef.value;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = document.body.scrollHeight);

  /**
   * 粒子类（支持多层、轨迹、闪烁）
   */
  class Particle {
    /**
     * @param {string} layer - 层级 'front' | 'mid' | 'back'
     */
    constructor(layer) {
      this.layer = layer;
      this.reset(true);
    }

    /**
     * 重置粒子状态
     * @param {boolean} initial - 是否为初始随机分布
     */
    reset(initial) {
      this.x = Math.random() * width;
      this.y = initial ? Math.random() * height : height + Math.random() * 50;

      // 根据层级设置基础属性
      if (this.layer === 'front') {
        this.baseSize = Math.random() * 2.5 + 1.2;
        this.speedY = -(Math.random() * 1.2 + 0.6);
        this.speedX = (Math.random() - 0.5) * 1.0;
        this.baseOpacity = Math.random() * 0.5 + 0.5;
        this.fadeSpeed = Math.random() * 0.012 + 0.004;
        this.hue = Math.random() * 40 + 5; // 红到橙黄
      } else if (this.layer === 'mid') {
        this.baseSize = Math.random() * 1.8 + 0.6;
        this.speedY = -(Math.random() * 0.7 + 0.3);
        this.speedX = (Math.random() - 0.5) * 0.5;
        this.baseOpacity = Math.random() * 0.4 + 0.3;
        this.fadeSpeed = Math.random() * 0.008 + 0.002;
        this.hue = Math.random() * 30 + 10;
      } else {
        // back
        this.baseSize = Math.random() * 1.0 + 0.3;
        this.speedY = -(Math.random() * 0.4 + 0.15);
        this.speedX = (Math.random() - 0.5) * 0.3;
        this.baseOpacity = Math.random() * 0.25 + 0.15;
        this.fadeSpeed = Math.random() * 0.005 + 0.001;
        this.hue = Math.random() * 20 + 15;
      }

      this.size = this.baseSize;
      this.opacity = this.baseOpacity;

      // 轨迹历史点
      this.trail = [];
      this.trailLength = this.layer === 'front' ? 6 : this.layer === 'mid' ? 4 : 2;

      // 风力漂移：正弦波动
      this.windPhase = Math.random() * Math.PI * 2;
      this.windSpeed = Math.random() * 0.02 + 0.01;
      this.windAmp = this.layer === 'front' ? 1.5 : 0.8;

      // 闪烁
      this.flickerPhase = Math.random() * Math.PI * 2;
      this.flickerSpeed = Math.random() * 0.1 + 0.05;

      // 偶尔爆发的火花粒子
      this.isSpark = Math.random() < 0.03;
      if (this.isSpark) {
        this.speedY *= 2.5;
        this.speedX *= 3;
        this.hue = Math.random() * 15 + 45; // 金黄火花
        this.baseSize *= 0.6;
        this.fadeSpeed *= 3;
      }
    }

    /**
     * 更新粒子位置与状态
     */
    update() {
      // 记录轨迹
      this.trail.push({ x: this.x, y: this.y, size: this.size, opacity: this.opacity });
      if (this.trail.length > this.trailLength) {
        this.trail.shift();
      }

      // 风力漂移
      this.windPhase += this.windSpeed;
      const windOffset = Math.sin(this.windPhase) * this.windAmp;

      // 更新位置
      this.y += this.speedY;
      this.x += this.speedX + windOffset * 0.02;

      // 闪烁效果
      this.flickerPhase += this.flickerSpeed;
      const flicker = Math.sin(this.flickerPhase) * 0.3 + 0.7; // 0.4 ~ 1.0
      this.size = this.baseSize * flicker;

      // 渐隐
      this.opacity -= this.fadeSpeed;

      // 边界回收
      if (this.opacity <= 0 || this.y < -20 || this.x < -20 || this.x > width + 20) {
        this.reset(false);
      }
    }

    /**
     * 绘制粒子（含轨迹拖尾）
     * @param {CanvasRenderingContext2D} ctx
     */
    draw(ctx) {
      // 绘制轨迹拖尾
      for (let i = 0; i < this.trail.length; i++) {
        const t = this.trail[i];
        const trailRatio = (i + 1) / this.trail.length;
        const trailOpacity = t.opacity * trailRatio * 0.4;
        const trailSize = t.size * trailRatio * 0.6;

        if (trailOpacity > 0.01 && trailSize > 0.1) {
          ctx.beginPath();
          ctx.arc(t.x, t.y, trailSize, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${this.hue}, 100%, 65%, ${trailOpacity})`;
          ctx.shadowBlur = 4 * trailRatio;
          ctx.shadowColor = `hsla(${this.hue}, 100%, 50%, ${trailOpacity})`;
          ctx.fill();
        }
      }

      // 绘制主粒子
      ctx.beginPath();
      ctx.arc(this.x, this.y, Math.max(this.size, 0.1), 0, Math.PI * 2);
      const alpha = Math.max(this.opacity, 0);
      ctx.fillStyle = `hsla(${this.hue}, 100%, ${this.isSpark ? 75 : 60}%, ${alpha})`;
      ctx.shadowBlur = this.layer === 'front' ? 12 : this.layer === 'mid' ? 8 : 5;
      ctx.shadowColor = `hsla(${this.hue}, 100%, 50%, ${alpha * 0.8})`;
      ctx.fill();

      // 火花额外高光核心
      if (this.isSpark && alpha > 0.3) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${this.hue}, 80%, 90%, ${alpha * 0.9})`;
        ctx.shadowBlur = 6;
        ctx.shadowColor = `hsla(${this.hue}, 100%, 80%, ${alpha})`;
        ctx.fill();
      }
    }
  }

  /** 粒子数组（三层） */
  const particles = [];
  const LAYERS = [
    { name: 'back', count: 40 },
    { name: 'mid', count: 60 },
    { name: 'front', count: 30 }
  ];

  for (const layer of LAYERS) {
    for (let i = 0; i < layer.count; i++) {
      particles.push(new Particle(layer.name));
    }
  }

  // 按层级排序，背景先画，前景后画
  particles.sort((a, b) => {
    const order = { back: 0, mid: 1, front: 2 };
    return order[a.layer] - order[b.layer];
  });

  /**
   * 动画循环
   */
  function animate() {
    // 使用半透明清除产生拖影残影效果
    ctx.fillStyle = 'rgba(10, 14, 26, 0.25)';
    ctx.fillRect(0, 0, width, height);

    for (const p of particles) {
      p.update();
      p.draw(ctx);
    }
    emberAnimId = requestAnimationFrame(animate);
  }

  // 响应窗口 resize
  const handleResize = () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = document.body.scrollHeight;
  };
  window.addEventListener('resize', handleResize);

  // 页面滚动时更新高度
  const handleScroll = () => {
    height = canvas.height = document.body.scrollHeight;
  };
  window.addEventListener('scroll', handleScroll, { passive: true });

  animate();
}

/**
 * 停止火星粒子动画
 */
function stopEmberParticles() {
  if (emberAnimId) {
    cancelAnimationFrame(emberAnimId);
    emberAnimId = null;
  }
}

/**
 * 初始化 Intersection Observer
 */
function initObserver() {
  if (observer) observer.disconnect();
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -60px 0px' }
  );
  document.querySelectorAll('.reveal, .article-row').forEach((el) => observer.observe(el));
}

/**
 * 分页回调
 * @param {number} page
 */
function handlePageChange(page) {
  currentPage.value = page;
  loadArticles(page);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

onMounted(async () => {
  // 等待 DOM 渲染后启动粒子动画
  await nextTick();
  initEmberParticles();

  loadArticles(1);
  loadHotArticles();
  loadSettings();
});

onUnmounted(() => {
  stopEmberParticles();
  if (observer) observer.disconnect();
});
</script>

<style scoped>
/* ========== 全页面火星粒子层 ========== */
.ember-canvas-full {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}

/* ========== Hero 全屏区域 ========== */
.hero {
  position: relative;
  min-height: 100vh;
  min-height: 100svh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  color: #fff;
  isolation: isolate;
  z-index: 1;
}

/* 背景图 */
.hero-bg {
  position: absolute;
  inset: 0;
  z-index: -3;
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
}

/* 暗色渐变遮罩 */
.hero-overlay {
  position: absolute;
  inset: 0;
  z-index: -2;
  background: linear-gradient(
    180deg,
    rgba(10, 14, 26, 0.55) 0%,
    rgba(10, 14, 26, 0.35) 30%,
    rgba(10, 14, 26, 0.55) 70%,
    rgba(10, 14, 26, 0.95) 100%
  );
}

/* 血月光晕（纯装饰） */
.moon-glow {
  position: absolute;
  top: 18%;
  left: 50%;
  transform: translateX(-50%);
  width: 320px;
  height: 320px;
  background: radial-gradient(
    circle,
    rgba(220, 38, 38, 0.15) 0%,
    rgba(220, 38, 38, 0.05) 40%,
    transparent 70%
  );
  border-radius: 50%;
  z-index: -1;
  pointer-events: none;
  animation: moonPulse 8s ease-in-out infinite;
}

@keyframes moonPulse {
  0%,
  100% {
    opacity: 0.6;
    transform: translateX(-50%) scale(1);
  }
  50% {
    opacity: 1;
    transform: translateX(-50%) scale(1.1);
  }
}

/* Hero 文案容器 */
.hero-inner {
  position: relative;
  z-index: 1;
  max-width: 800px;
  padding: 0 32px;
  text-align: center;
}

.hero-eyebrow {
  margin: 0 0 24px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 8px;
  color: rgba(248, 113, 113, 0.8);
}

.hero-title {
  margin: 0 0 24px;
  font-size: clamp(56px, 9vw, 112px);
  font-weight: 800;
  letter-spacing: -4px;
  line-height: 1;
}

/* 发光文字效果 */
.title-text {
  display: inline-block;
  background: linear-gradient(180deg, #ffffff 0%, #fca5a5 50%, #dc2626 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 0 30px rgba(220, 38, 38, 0.4));
  animation: titleGlow 4s ease-in-out infinite;
}

@keyframes titleGlow {
  0%,
  100% {
    filter: drop-shadow(0 0 30px rgba(220, 38, 38, 0.4));
  }
  50% {
    filter: drop-shadow(0 0 50px rgba(220, 38, 38, 0.7));
  }
}

.hero-tagline {
  margin: 0 0 48px;
  font-size: clamp(16px, 2vw, 20px);
  font-weight: 400;
  color: rgba(241, 245, 249, 0.75);
  letter-spacing: 2px;
  line-height: 1.6;
}

.hero-actions {
  display: flex;
  justify-content: center;
  gap: 20px;
  flex-wrap: wrap;
}

.hero-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  padding: 16px 36px;
  font-size: 15px;
  font-weight: 600;
  text-decoration: none;
  border-radius: 30px;
  overflow: hidden;
  transition:
    transform 0.3s var(--ease-spring),
    box-shadow 0.3s var(--ease-out);
}

.hero-btn.primary {
  background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
  color: #fff;
  box-shadow: 0 4px 20px rgba(220, 38, 38, 0.4);
}

.hero-btn.primary:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 30px rgba(220, 38, 38, 0.55);
}

/* 按钮发光脉冲 */
.btn-glow {
  position: absolute;
  inset: -2px;
  background: linear-gradient(135deg, #f87171 0%, #dc2626 100%);
  border-radius: 32px;
  opacity: 0;
  z-index: -1;
  filter: blur(12px);
  transition: opacity 0.3s var(--ease-out);
}

.hero-btn.primary:hover .btn-glow {
  opacity: 1;
}

.hero-btn.ghost {
  background: rgba(255, 255, 255, 0.06);
  color: #f1f5f9;
  border: 1px solid rgba(241, 245, 249, 0.2);
  backdrop-filter: blur(8px);
}

.hero-btn.ghost:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(248, 113, 113, 0.4);
  color: #fca5a5;
  transform: translateY(-3px);
}

/* 滚动提示 */
.scroll-hint {
  position: absolute;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  z-index: 1;
}

.scroll-text {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 4px;
  color: rgba(241, 245, 249, 0.5);
}

.scroll-line {
  width: 1px;
  height: 50px;
  background: linear-gradient(to bottom, rgba(248, 113, 113, 0.6), transparent);
  position: relative;
  overflow: hidden;
}

.scroll-line::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 20px;
  background: rgba(248, 113, 113, 0.8);
  animation: scrollDown 2s ease-in-out infinite;
}

@keyframes scrollDown {
  0% {
    transform: translateY(-100%);
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    transform: translateY(150%);
    opacity: 0;
  }
}

/* ========== 主体内容包装 ========== */
.content-wrapper {
  position: relative;
  z-index: 1;
  max-width: 1200px;
  margin: 0 auto;
  padding: 96px 32px 80px;
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 56px;
}

.content-main {
  min-width: 0;
}

/* 区域标题 */
.section-header {
  display: flex;
  align-items: baseline;
  gap: 16px;
  margin-bottom: 48px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border);
}

.section-title {
  margin: 0;
  font-size: 32px;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -1px;
}

.section-meta {
  font-size: 13px;
  color: var(--text-tertiary);
  letter-spacing: 0.5px;
}

/* ========== 文章列表 ========== */
.article-list {
  display: flex;
  flex-direction: column;
}

.article-row {
  position: relative;
  display: flex;
  padding: 32px 0 32px 28px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  opacity: 0;
  transform: translateY(24px);
  transition:
    opacity 0.6s var(--ease-out),
    transform 0.6s var(--ease-out),
    padding-left 0.3s var(--ease-out);
  transition-delay: calc(var(--row-index) * 80ms);
}

.article-row.visible {
  opacity: 1;
  transform: translateY(0);
}

.article-row:hover {
  padding-left: 36px;
}

.accent-bar {
  position: absolute;
  left: 0;
  top: 32px;
  bottom: 32px;
  width: 0;
  background: linear-gradient(to bottom, var(--primary), var(--primary-light));
  border-radius: 2px;
  transition: width 0.3s var(--ease-spring);
}

.article-row:hover .accent-bar {
  width: 3px;
  box-shadow: 0 0 12px rgba(220, 38, 38, 0.4);
}

.article-body {
  flex: 1;
  min-width: 0;
}

.article-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
  font-size: 12px;
  color: var(--text-tertiary);
  letter-spacing: 0.5px;
}

.meta-category {
  padding: 3px 10px;
  font-weight: 600;
  color: #fca5a5;
  background: var(--primary-bg);
  border-radius: 10px;
}

.meta-date {
  font-variant-numeric: tabular-nums;
}

.meta-views {
  display: flex;
  align-items: center;
  gap: 4px;
}

.article-title {
  margin: 0 0 12px;
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.35;
  letter-spacing: -0.5px;
  transition: color 0.25s var(--ease-out);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.article-row:hover .article-title {
  color: var(--primary-light);
}

.article-excerpt {
  margin: 0 0 16px;
  font-size: 15px;
  color: var(--text-secondary);
  line-height: 1.7;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.article-read {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--primary-light);
  letter-spacing: 0.5px;
}

.read-arrow {
  transition: transform 0.3s var(--ease-spring);
}

.article-row:hover .read-arrow {
  transform: translateX(6px);
}

/* ========== 骨架屏 ========== */
.skeleton-row {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 24px 0;
  border-bottom: 1px solid var(--border);
}

.skeleton-line {
  height: 14px;
  border-radius: 6px;
  background: linear-gradient(90deg, #1a2035 25%, #252d44 50%, #1a2035 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

.w-40 {
  width: 40%;
}
.w-70 {
  width: 70%;
}
.w-90 {
  width: 90%;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* ========== 空状态 ========== */
.empty-state {
  text-align: center;
  padding: 80px 20px;
}

.empty-title {
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 700;
  color: var(--text-secondary);
}

.empty-desc {
  margin: 0;
  font-size: 14px;
  color: var(--text-tertiary);
}

/* ========== 分页 ========== */
.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 56px;
}

:deep(.el-pagination.is-background .el-pager li) {
  background-color: var(--bg-hover);
  color: var(--text-secondary);
}

:deep(.el-pagination.is-background .el-pager li.is-active) {
  background-color: var(--primary);
  color: #fff;
}

:deep(.el-pagination.is-background .btn-next),
:deep(.el-pagination.is-background .btn-prev) {
  background-color: var(--bg-hover);
  color: var(--text-secondary);
}

/* ========== 侧边栏 ========== */
.sidebar {
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.sidebar-block {
  padding-bottom: 32px;
  border-bottom: 1px solid var(--border);
}

.sidebar-block:last-child {
  border-bottom: none;
}

.sidebar-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 24px;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 2px;
  text-transform: uppercase;
}

.title-mark {
  display: inline-block;
  width: 10px;
  height: 10px;
  background: var(--primary);
  border-radius: 2px;
  box-shadow: 0 0 8px rgba(220, 38, 38, 0.5);
}

/* 热门文章列表 */
.hot-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hot-item {
  display: flex;
  gap: 14px;
  cursor: pointer;
  transition: transform 0.25s var(--ease-out);
}

.hot-item:hover {
  transform: translateX(4px);
}

.hot-rank {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-tertiary);
  background: var(--bg-hover);
  border-radius: 8px;
  font-variant-numeric: tabular-nums;
}

.hot-rank.top {
  color: #fff;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  box-shadow: 0 4px 10px rgba(220, 38, 38, 0.3);
}

.hot-info {
  min-width: 0;
  flex: 1;
}

.hot-title {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  transition: color 0.2s var(--ease-out);
}

.hot-item:hover .hot-title {
  color: var(--primary-light);
}

.hot-views {
  font-size: 12px;
  color: var(--text-tertiary);
}

/* 分类列表 */
.category-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.category-item {
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 500;
  color: var(--primary-light);
  text-decoration: none;
  background: var(--primary-bg);
  border-radius: 16px;
  transition:
    background 0.25s var(--ease-out),
    transform 0.25s var(--ease-spring);
}

.category-item:hover {
  background: var(--primary);
  color: #fff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
}

.sidebar-empty {
  margin: 0;
  font-size: 13px;
  color: var(--text-tertiary);
}

/* ========== 滚动揭示 ========== */
.reveal {
  opacity: 0;
  transform: translateY(24px);
  transition:
    opacity 0.6s var(--ease-out),
    transform 0.6s var(--ease-out);
}

.reveal.visible {
  opacity: 1;
  transform: translateY(0);
}

/* ========== 响应式 ========== */
@media (max-width: 1024px) {
  .content-wrapper {
    grid-template-columns: 1fr 280px;
    gap: 40px;
  }
  .hero-bg {
    background-attachment: scroll;
  }
}

@media (max-width: 768px) {
  .hero-eyebrow {
    margin-bottom: 16px;
    font-size: 11px;
    letter-spacing: 4px;
  }
  .hero-tagline {
    margin-bottom: 32px;
    font-size: 15px;
  }
  .content-wrapper {
    grid-template-columns: 1fr;
    padding: 64px 20px 48px;
    gap: 48px;
  }
  .section-title {
    font-size: 26px;
  }
  .article-title {
    font-size: 20px;
    white-space: normal;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .article-row {
    padding-left: 20px;
  }
  .article-row:hover {
    padding-left: 24px;
  }
  .moon-glow {
    width: 200px;
    height: 200px;
    top: 10%;
  }
}
</style>
