/** * @file Home.vue * @description 杂志风首页组件 * * 作用：展示博客首页内容，包含： * - Hero
区域（站点名称大标题 + 描述副标题 + 渐变背景） * - 最新文章网格（2-3
列卡片，含封面图/渐变占位、分类标签、标题、摘要、浏览量与日期） * - 侧边栏（桌面端）：热门文章 Top5
+ 分类导航 * - 分页器（ElPagination） * * 数据获取： * - getPublicArticles({ page, page_size: 9 })
获取文章列表 * - getHotArticles(5) 获取热门文章 * - getSettings() 获取站点名称与描述（用于 Hero） *
* 设计要点： * - 主色调青绿色 #0d9488 * - 卡片悬浮上移动画 + 封面图缩放 * -
封面图缺失时使用青绿系渐变占位背景 */
<template>
  <div class="home-page">
    <!-- Hero 区域：站点名称 + 描述 + 渐变背景 -->
    <section class="hero">
      <div class="hero-inner">
        <h1 class="hero-title">{{ siteName }}</h1>
        <p class="hero-subtitle">{{ siteDescription }}</p>
        <div class="hero-actions">
          <router-link to="/archive" class="hero-btn primary">浏览归档</router-link>
          <router-link to="/about" class="hero-btn ghost">关于本站</router-link>
        </div>
      </div>
      <!-- 装饰光斑（纯视觉，不可交互） -->
      <div class="hero-decoration" aria-hidden="true"></div>
    </section>

    <!-- 主体：文章网格 + 侧边栏 -->
    <div class="content-wrapper">
      <main class="content-main">
        <!-- 区域标题 -->
        <div class="section-header">
          <h2 class="section-title">最新文章</h2>
          <span class="section-sub">共 {{ total }} 篇</span>
        </div>

        <!-- 加载中骨架屏：首次加载且无数据时展示 -->
        <div v-if="loading && articles.length === 0" class="article-grid">
          <div v-for="n in 9" :key="n" class="article-card skeleton-card">
            <div class="card-cover skeleton-cover"></div>
            <div class="card-body">
              <div class="skeleton-line w-60"></div>
              <div class="skeleton-line w-90"></div>
              <div class="skeleton-line w-40"></div>
            </div>
          </div>
        </div>

        <!-- 文章网格：有数据时展示 -->
        <div v-else-if="articles.length > 0" class="article-grid">
          <article
            v-for="(article, index) in articles"
            :key="article.id"
            class="article-card"
            :style="{ '--card-index': index }"
            @click="goToArticle(article.id)"
          >
            <!-- 封面区：存在 cover_image 展示图片，否则使用渐变占位 -->
            <div class="card-cover">
              <img
                v-if="article.cover_image"
                :src="article.cover_image"
                :alt="article.title"
                class="cover-img"
                loading="lazy"
              />
              <div v-else class="cover-placeholder" :style="placeholderStyle(article.id)">
                <span class="placeholder-letter">{{ article.title.charAt(0) }}</span>
              </div>
              <!-- 分类标签：存在分类时展示 -->
              <span v-if="article.category_name" class="category-tag">
                {{ article.category_name }}
              </span>
            </div>
            <div class="card-body">
              <h3 class="card-title">{{ article.title }}</h3>
              <p class="card-summary">{{ article.summary || '暂无摘要' }}</p>
              <div class="card-footer">
                <span class="card-views">
                  <el-icon><View /></el-icon>
                  {{ article.view_count || 0 }}
                </span>
                <span class="card-date">{{ formatDate(article.created_at) }}</span>
              </div>
            </div>
          </article>
        </div>

        <!-- 空状态：非加载且无文章时展示 -->
        <div v-else class="empty-state">
          <el-icon :size="56" color="#cbd5e1"><Document /></el-icon>
          <p class="empty-text">暂无文章</p>
          <p class="empty-desc">后台登录后即可发布第一篇文章</p>
        </div>

        <!-- 分页器：文章总数超过单页数量时展示 -->
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

      <!-- 侧边栏（桌面端显示） -->
      <aside class="sidebar">
        <!-- 热门文章 Top5 -->
        <section class="sidebar-card">
          <h3 class="sidebar-title">
            <el-icon><TrendCharts /></el-icon>
            热门文章
          </h3>
          <!-- 有热门文章时展示列表 -->
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
                <span class="hot-views">
                  <el-icon><View /></el-icon>
                  {{ article.view_count || 0 }} 阅读
                </span>
              </div>
            </li>
          </ol>
          <!-- 无热门文章时兜底提示 -->
          <p v-else class="sidebar-empty">暂无热门文章</p>
        </section>

        <!-- 分类导航 -->
        <section class="sidebar-card">
          <h3 class="sidebar-title">
            <el-icon><Collection /></el-icon>
            分类导航
          </h3>
          <!-- 有分类时展示标签列表 -->
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
          <!-- 无分类时兜底提示 -->
          <p v-else class="sidebar-empty">暂无分类</p>
        </section>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { View, Document, TrendCharts, Collection } from '@element-plus/icons-vue';
import { getPublicArticles, getHotArticles } from '../../api/articles';
import { getSettings } from '../../api/settings';

const router = useRouter();

/** 文章列表（当前页） */
const articles = ref([]);

/** 热门文章列表 */
const hotArticles = ref([]);

/** 加载状态（控制骨架屏展示） */
const loading = ref(false);

/** 当前页码 */
const currentPage = ref(1);

/** 每页数量（与 3 列网格 3 行布局匹配） */
const pageSize = 9;

/** 文章总数（来自后端分页信息） */
const total = ref(0);

/**
 * 站点配置（用于 Hero 区域展示，失败时使用默认值兜底）
 * @type {import('vue').Ref<Object>}
 * @property {string} siteName - 站点名称
 * @property {string} siteDescription - 站点描述
 */
const settings = ref({
  siteName: '个人博客',
  siteDescription: '分享技术，记录成长'
});

/** 站点名称（取自配置，兜底为默认值，作为 Hero 主标题） */
const siteName = computed(() => settings.value.siteName || '个人博客');

/** 站点描述（取自配置，兜底为默认值，作为 Hero 副标题） */
const siteDescription = computed(() => settings.value.siteDescription || '分享技术，记录成长');

/**
 * 从已加载文章中提取唯一分类列表
 * 用于侧边栏分类导航（仅使用文章接口返回的分类信息，无需额外接口）
 * 按 category_slug 去重，避免重复展示
 * @returns {Array<{name: string, slug: string}>} 分类列表
 */
const categories = computed(() => {
  const map = new Map();
  // 遍历当前页文章，收集分类（按 slug 去重）
  for (const article of articles.value) {
    // 仅在文章存在分类标识与名称时收集
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
 * @param {string} dateStr - 后端返回的日期字符串
 * @returns {string} 格式化后的日期，无效时返回空字符串
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  // 兼容无效日期，避免展示 NaN
  if (isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 根据文章 ID 生成稳定的渐变占位背景
 * 同一篇文章始终使用相同配色，保证视觉一致性
 * @param {number} id - 文章 ID
 * @returns {Object} 内联样式对象，包含 background 渐变
 */
function placeholderStyle(id) {
  // 预设多套青绿系渐变，按 id 取模选择，保证同篇文章配色稳定
  const gradients = [
    'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)',
    'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)',
    'linear-gradient(135deg, #0891b2 0%, #0d9488 100%)',
    'linear-gradient(135deg, #14b8a6 0%, #5eead4 100%)',
    'linear-gradient(135deg, #0f766e 0%, #0891b2 100%)'
  ];
  const index = id ? id % gradients.length : 0;
  return { background: gradients[index] };
}

/**
 * 跳转到文章详情页
 * @param {number} id - 文章 ID
 */
function goToArticle(id) {
  router.push(`/article/${id}`);
}

/**
 * 加载文章列表
 * @param {number} page - 页码，默认 1
 * @returns {Promise<void>}
 */
async function loadArticles(page = 1) {
  loading.value = true;
  try {
    const { data } = await getPublicArticles({ page, page_size: pageSize });
    // 兼容返回结构：data = { list, pagination }
    if (data && data.list) {
      articles.value = data.list;
      // 分页信息不存在时兜底为 0
      total.value = data.pagination?.total ?? 0;
    }
  } catch (e) {
    console.error('加载文章失败:', e);
  } finally {
    loading.value = false;
  }
}

/**
 * 加载热门文章（Top5）
 * 兼容返回值为数组或对象包裹的数组两种结构
 * @returns {Promise<void>}
 */
async function loadHotArticles() {
  try {
    const { data } = await getHotArticles(5);
    // 兼容数组或 { list } 两种返回结构
    hotArticles.value = Array.isArray(data) ? data : (data?.list ?? []);
  } catch (e) {
    console.error('加载热门文章失败:', e);
  }
}

/**
 * 加载站点配置（用于 Hero 区域标题与描述）
 * 失败时使用默认值，不阻断页面渲染
 * @returns {Promise<void>}
 */
async function loadSettings() {
  try {
    const { data } = await getSettings();
    // 仅在返回非空对象时合并，避免覆盖默认值
    if (data && typeof data === 'object') {
      settings.value = { ...settings.value, ...data };
    }
  } catch (e) {
    console.error('加载站点配置失败:', e);
  }
}

/**
 * 分页器页码变化回调
 * @param {number} page - 新页码
 */
function handlePageChange(page) {
  currentPage.value = page;
  loadArticles(page);
  // 切换页码后平滑回到顶部，便于浏览新内容
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

onMounted(() => {
  loadArticles(1);
  loadHotArticles();
  loadSettings();
});
</script>

<style scoped>
.home-page {
  --color-primary: #0d9488; /* 主色：青绿 */
  --color-primary-dark: #0f766e; /* 主色深 */
  --color-primary-light: #14b8a6; /* 主色浅 */
  --color-text: #0f172a; /* 主文本 */
  --color-text-secondary: #475569; /* 次级文本 */
  --color-text-muted: #94a3b8; /* 弱化文本 */
  --color-bg: #ffffff; /* 卡片背景 */
  --color-bg-soft: #f8fafc; /* 页面背景 */
  --color-border: #e2e8f0; /* 分割线 */
  --max-width: 1200px; /* 内容最大宽度 */
}

/* ========== Hero 区域 ========== */
.hero {
  position: relative;
  padding: 80px 32px 72px;
  background: linear-gradient(135deg, #0f766e 0%, #0d9488 45%, #14b8a6 100%);
  overflow: hidden;
  color: #fff;
}

.hero-inner {
  position: relative;
  z-index: 2;
  max-width: var(--max-width);
  margin: 0 auto;
  text-align: center;
}

.hero-title {
  margin: 0 0 16px;
  font-size: 56px;
  font-weight: 800;
  letter-spacing: -2px;
  line-height: 1.1;
  text-shadow: 0 2px 20px rgba(0, 0, 0, 0.15);
}

.hero-subtitle {
  margin: 0 0 32px;
  font-size: 18px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.9);
  letter-spacing: 0.5px;
}

.hero-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
}

.hero-btn {
  display: inline-flex;
  align-items: center;
  padding: 12px 28px;
  font-size: 15px;
  font-weight: 600;
  text-decoration: none;
  border-radius: 24px;
  transition:
    transform 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease;
}

.hero-btn.primary {
  background: #fff;
  color: var(--color-primary-dark);
}

.hero-btn.primary:hover {
  background: #f0fdfa;
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
}

.hero-btn.ghost {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.4);
}

.hero-btn.ghost:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* Hero 装饰光斑 */
.hero-decoration {
  position: absolute;
  top: -120px;
  right: -80px;
  width: 360px;
  height: 360px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.18) 0%, transparent 70%);
  border-radius: 50%;
  z-index: 1;
}

/* ========== 内容区 ========== */
.content-wrapper {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 56px 32px 64px;
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 40px;
}

.content-main {
  min-width: 0;
}

/* 区域标题 */
.section-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 28px;
  padding-bottom: 16px;
  border-bottom: 2px solid var(--color-border);
}

.section-title {
  margin: 0;
  font-size: 26px;
  font-weight: 700;
  color: var(--color-text);
  letter-spacing: -0.5px;
}

.section-sub {
  font-size: 13px;
  color: var(--color-text-muted);
}

/* ========== 文章网格 ========== */
.article-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.article-card {
  display: flex;
  flex-direction: column;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  overflow: hidden;
  cursor: pointer;
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease,
    border-color 0.3s ease;
  /* 卡片入场动画：按索引实现错峰淡入 */
  animation: card-in 0.5s ease backwards;
  animation-delay: calc(var(--card-index) * 60ms);
}

@keyframes card-in {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 卡片悬浮上移 + 阴影增强 */
.article-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.12);
  border-color: rgba(13, 148, 136, 0.4);
}

/* 封面区 */
.card-cover {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: var(--color-bg-soft);
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

/* 悬浮时封面图缓慢放大 */
.article-card:hover .cover-img {
  transform: scale(1.06);
}

/* 渐变占位背景（无封面图时） */
.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-letter {
  font-size: 56px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.85);
}

/* 分类标签 */
.category-tag {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  background: rgba(13, 148, 136, 0.92);
  border-radius: 12px;
  backdrop-filter: blur(4px);
}

/* 卡片正文 */
.card-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 18px 18px 16px;
}

.card-title {
  margin: 0 0 10px;
  font-size: 17px;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1.45;
  /* 标题最多 2 行，超出截断 */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  transition: color 0.2s ease;
}

/* 悬浮时标题变为主色 */
.article-card:hover .card-title {
  color: var(--color-primary);
}

.card-summary {
  margin: 0 0 16px;
  font-size: 14px;
  color: var(--color-text-secondary);
  line-height: 1.65;
  /* 摘要最多 2 行，超出截断 */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
  font-size: 12px;
  color: var(--color-text-muted);
}

.card-views {
  display: flex;
  align-items: center;
  gap: 4px;
}

.card-date {
  font-variant-numeric: tabular-nums;
}

/* ========== 骨架屏 ========== */
.skeleton-card {
  pointer-events: none;
}

.skeleton-cover {
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

.skeleton-line {
  height: 12px;
  margin-bottom: 10px;
  border-radius: 6px;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

.w-40 {
  width: 40%;
}
.w-60 {
  width: 60%;
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

.empty-text {
  margin: 16px 0 8px;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.empty-desc {
  margin: 0;
  font-size: 14px;
  color: var(--color-text-muted);
}

/* ========== 分页器 ========== */
.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 40px;
}

/* ========== 侧边栏 ========== */
.sidebar {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.sidebar-card {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  padding: 20px;
}

.sidebar-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text);
}

.sidebar-title .el-icon {
  color: var(--color-primary);
}

/* 热门文章列表 */
.hot-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.hot-item {
  display: flex;
  gap: 12px;
  padding: 8px;
  margin: 0 -8px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.hot-item:hover {
  background: var(--color-bg-soft);
}

/* 排名序号 */
.hot-rank {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-muted);
  background: var(--color-bg-soft);
  border-radius: 6px;
}

/* 前三名使用主色渐变高亮 */
.hot-rank.top {
  color: #fff;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%);
}

.hot-info {
  min-width: 0;
}

.hot-title {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
  line-height: 1.4;
  /* 标题最多 2 行，超出截断 */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  transition: color 0.2s ease;
}

.hot-item:hover .hot-title {
  color: var(--color-primary);
}

.hot-views {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--color-text-muted);
}

/* 分类导航 */
.category-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.category-item {
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-primary);
  text-decoration: none;
  background: rgba(13, 148, 136, 0.08);
  border-radius: 16px;
  transition:
    background 0.2s ease,
    transform 0.2s ease;
}

.category-item:hover {
  background: rgba(13, 148, 136, 0.15);
  transform: translateY(-1px);
}

.sidebar-empty {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-muted);
  text-align: center;
  padding: 16px 0;
}

/* ========== 响应式 ========== */
/* 平板：网格降为 2 列，侧边栏收窄 */
@media (max-width: 1024px) {
  .article-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .content-wrapper {
    grid-template-columns: 1fr 280px;
    gap: 32px;
  }
}

/* 手机：单列布局，侧边栏移至下方 */
@media (max-width: 768px) {
  .hero {
    padding: 56px 20px 48px;
  }
  .hero-title {
    font-size: 36px;
  }
  .hero-subtitle {
    font-size: 15px;
  }
  .hero-btn {
    padding: 10px 22px;
    font-size: 14px;
  }
  .content-wrapper {
    grid-template-columns: 1fr;
    padding: 32px 16px 48px;
  }
  .article-grid {
    grid-template-columns: 1fr;
  }
  .section-title {
    font-size: 22px;
  }
}

/* 小屏手机：Hero 按钮纵向排列 */
@media (max-width: 480px) {
  .hero-title {
    font-size: 30px;
  }
  .hero-actions {
    flex-direction: column;
    align-items: center;
  }
}
</style>
