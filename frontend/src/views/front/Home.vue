/** * @file Home.vue * @description 博客首页 - 全屏沉浸式 Hero + 横向文章列表 * * 作用： * - 全屏
Hero 区域（动画渐变 + 浮动光斑 + 大号品牌字 + 标语） * -
滚动触发的文章列表（横向布局，非卡片，悬浮显示主色强调条） * - 侧边栏：热门文章 Top5 + 分类导航 * -
分页器 * * 设计： * - 主色青绿色 #0d9488 * - 牺牲卡片化，使用列 + 分隔线 + 大标题组织信息 * -
Intersection Observer 实现滚动入场动画 * - 三组动效：Hero 渐变流动 / 滚动揭示 / 悬浮强调条 */
<template>
  <div class="home-page">
    <!-- ============ Hero 全屏区域 ============ -->
    <section class="hero">
      <!-- 动画渐变背景层 -->
      <div class="hero-bg" aria-hidden="true"></div>
      <!-- 浮动光斑装饰 -->
      <div class="hero-orbs" aria-hidden="true">
        <span class="orb orb-1"></span>
        <span class="orb orb-2"></span>
        <span class="orb orb-3"></span>
      </div>

      <!-- Hero 文案 -->
      <div class="hero-inner">
        <p class="hero-eyebrow animate-fade-in-down">WELCOME</p>
        <h1 class="hero-title animate-fade-in-up">{{ siteName }}</h1>
        <p class="hero-tagline animate-fade-in-up delay-100">{{ siteDescription }}</p>
        <div class="hero-actions animate-fade-in-up delay-200">
          <router-link to="/archive" class="hero-btn primary">浏览归档</router-link>
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
            <!-- 主色强调条：悬浮时从左侧展开 -->
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

/** 站点配置 */
const settings = ref({
  siteName: '个人博客',
  siteDescription: '分享技术，记录成长'
});

/** 站点名（Hero 主标题） */
const siteName = computed(() => settings.value.siteName || '个人博客');

/** 站点描述（Hero 副标题） */
const siteDescription = computed(() => settings.value.siteDescription || '分享技术，记录成长');

/**
 * 从已加载文章中提取去重分类列表
 * 按 category_slug 去重，避免重复展示
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
 * @returns {Promise<void>}
 */
async function loadArticles(page = 1) {
  loading.value = true;
  try {
    const { data } = await getPublicArticles({ page, page_size: pageSize });
    if (data && data.list) {
      articles.value = data.list;
      total.value = data.pagination?.total ?? 0;
      // 数据更新后重新初始化滚动揭示
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
 * @returns {Promise<void>}
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
 * @returns {Promise<void>}
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
 * 初始化 Intersection Observer
 * 监听所有 .reveal 元素，进入视口时添加 visible 类触发动画
 */
function initObserver() {
  // 清理旧观察者
  if (observer) observer.disconnect();
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          // 揭示后停止观察，避免重复触发
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -60px 0px' }
  );
  // 观察所有 reveal 与 article-row 元素（article-row 自带错峰延迟）
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

onMounted(() => {
  loadArticles(1);
  loadHotArticles();
  loadSettings();
});

onUnmounted(() => {
  if (observer) observer.disconnect();
});
</script>

<style scoped>
/* ========== Hero 全屏区域 ========== */
.hero {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  color: #fff;
  isolation: isolate;
}

/* 动画渐变背景层 */
.hero-bg {
  position: absolute;
  inset: 0;
  z-index: -2;
  background: linear-gradient(135deg, #0f766e 0%, #0d9488 40%, #14b8a6 100%);
  background-size: 200% 200%;
  animation: heroGradient 12s ease infinite;
}

@keyframes heroGradient {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

/* 浮动光斑 */
.hero-orbs {
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
}

.orb {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.25) 0%, transparent 70%);
  filter: blur(2px);
  animation: floatOrb 16s ease-in-out infinite;
}

.orb-1 {
  width: 480px;
  height: 480px;
  top: -120px;
  left: -100px;
  animation-delay: 0s;
}

.orb-2 {
  width: 360px;
  height: 360px;
  bottom: -80px;
  right: -60px;
  animation-delay: -5s;
}

.orb-3 {
  width: 280px;
  height: 280px;
  top: 40%;
  right: 20%;
  animation-delay: -10s;
}

@keyframes floatOrb {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  33% {
    transform: translate(40px, -30px) scale(1.1);
  }
  66% {
    transform: translate(-30px, 40px) scale(0.95);
  }
}

/* Hero 文案容器 */
.hero-inner {
  position: relative;
  z-index: 1;
  max-width: 880px;
  padding: 0 32px;
  text-align: center;
}

.hero-eyebrow {
  margin: 0 0 24px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 6px;
  color: rgba(255, 255, 255, 0.75);
}

.hero-title {
  margin: 0 0 24px;
  font-size: clamp(48px, 8vw, 96px);
  font-weight: 800;
  letter-spacing: -3px;
  line-height: 1.05;
  text-shadow: 0 4px 30px rgba(0, 0, 0, 0.2);
}

.hero-tagline {
  margin: 0 0 40px;
  font-size: clamp(16px, 2vw, 20px);
  font-weight: 400;
  color: rgba(255, 255, 255, 0.9);
  letter-spacing: 1px;
}

.hero-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
}

.hero-btn {
  display: inline-flex;
  align-items: center;
  padding: 14px 32px;
  font-size: 15px;
  font-weight: 600;
  text-decoration: none;
  border-radius: 28px;
  transition:
    transform 0.3s var(--ease-spring),
    background 0.3s var(--ease-out),
    box-shadow 0.3s var(--ease-out);
}

.hero-btn.primary {
  background: #fff;
  color: var(--primary-dark);
}

.hero-btn.primary:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2);
}

.hero-btn.ghost {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(4px);
}

.hero-btn.ghost:hover {
  background: rgba(255, 255, 255, 0.2);
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
  letter-spacing: 3px;
  color: rgba(255, 255, 255, 0.7);
}

.scroll-line {
  width: 1px;
  height: 50px;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0.7), transparent);
  position: relative;
  overflow: hidden;
}

/* 滚动线动画：模拟下滑指示 */
.scroll-line::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 20px;
  background: #fff;
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

/* ========== 文章列表（横向布局，非卡片） ========== */
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
  /* 入场前隐藏 */
  opacity: 0;
  transform: translateY(24px);
  transition:
    opacity 0.6s var(--ease-out),
    transform 0.6s var(--ease-out),
    padding-left 0.3s var(--ease-out);
  /* 错峰延迟 */
  transition-delay: calc(var(--row-index) * 80ms);
}

/* 进入视口后揭示 */
.article-row.visible {
  opacity: 1;
  transform: translateY(0);
}

/* 悬浮：左移 + 强调条展开 */
.article-row:hover {
  padding-left: 36px;
}

/* 主色强调条：左侧从 0 展开到 4px */
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
  width: 4px;
}

/* 文章主体 */
.article-body {
  flex: 1;
  min-width: 0;
}

/* 元信息行 */
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
  color: var(--primary);
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

/* 标题 */
.article-title {
  margin: 0 0 12px;
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.35;
  letter-spacing: -0.5px;
  transition: color 0.25s var(--ease-out);
  /* 单行省略 */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.article-row:hover .article-title {
  color: var(--primary);
}

/* 摘要 */
.article-excerpt {
  margin: 0 0 16px;
  font-size: 15px;
  color: var(--text-secondary);
  line-height: 1.7;
  /* 两行截断 */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 阅读链接 */
.article-read {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--primary);
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
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
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

/* ========== 侧边栏 ========== */
.sidebar {
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.sidebar-block {
  /* 卡片化被舍弃，使用区块 + 分隔线 */
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

/* 标题前小方块装饰 */
.title-mark {
  display: inline-block;
  width: 12px;
  height: 12px;
  background: var(--primary);
  border-radius: 3px;
  transform: rotate(45deg);
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
  background: var(--bg-body);
  border-radius: 8px;
  font-variant-numeric: tabular-nums;
}

/* 前三名主色高亮 */
.hot-rank.top {
  color: #fff;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%);
  box-shadow: 0 4px 10px rgba(13, 148, 136, 0.3);
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
  color: var(--primary);
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
  color: var(--primary);
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
}

.sidebar-empty {
  margin: 0;
  font-size: 13px;
  color: var(--text-tertiary);
}

/* ========== 滚动揭示动画（用于非列表元素） ========== */
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
}

@media (max-width: 768px) {
  .hero-eyebrow {
    margin-bottom: 16px;
    font-size: 11px;
    letter-spacing: 4px;
  }
  .hero-tagline {
    margin-bottom: 32px;
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
    /* 移动端允许两行 */
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
}
</style>
