/** * @file Search.vue * @description 搜索结果页（杂志风，卡片化舍弃，列表 + 强调条） * * 作用： * -
顶部突出展示搜索关键词 + 结果统计 * - 搜索结果为简洁列表（标题、摘要、日期、分类），悬浮主色强调条 *
- 空状态带友好文案与动画 * * 数据获取： * - getPublicArticles({ keyword, page, page_size }) 搜索文章
* - 返回 { list, pagination: { total } } * * 路由参数： * - route.query.keyword 获取搜索关键词 * -
关键词变化时自动重新搜索 * * 动效（2-3 组）： * - 入场：关键词标题 fade-in-up * -
滚动：结果项进入视口时 fade-in-up 错峰（Intersection Observer） * - 悬浮：标题变主色 +
左侧强调条展开 + 阅读箭头右移 */
<template>
  <div ref="rootRef" class="search-page">
    <!-- ============ 搜索头部：关键词突出展示 ============ -->
    <section class="search-header">
      <p class="eyebrow animate-fade-in-down">SEARCH</p>
      <h1 class="keyword-title animate-fade-in-up">
        <span v-if="keyword" class="keyword-text">{{ keyword }}</span>
        <span v-else class="keyword-empty">搜索文章</span>
      </h1>
      <p v-if="keyword && searched" class="result-stats animate-fade-in-up delay-100">
        共找到 <span class="stats-count">{{ total }}</span> 篇相关文章
      </p>
    </section>

    <!-- ============ 搜索结果区域 ============ -->
    <div class="content-wrapper">
      <!-- 加载骨架 -->
      <div v-if="loading && articles.length === 0" class="article-list">
        <div v-for="n in 5" :key="n" class="skeleton-row">
          <div class="skeleton-line w-70"></div>
          <div class="skeleton-line w-90"></div>
          <div class="skeleton-line w-40"></div>
        </div>
      </div>

      <!-- 结果列表 -->
      <div v-else-if="articles.length > 0" class="article-list">
        <article
          v-for="(article, index) in articles"
          :key="article.id"
          class="article-row reveal"
          :style="{ '--row-index': index }"
          @click="goToArticle(article.id)"
        >
          <!-- 主色强调条：悬浮时从左侧展开 -->
          <span class="accent-bar" aria-hidden="true"></span>
          <div class="article-body">
            <!-- 元信息 -->
            <div class="article-meta">
              <span v-if="article.category_name" class="meta-category">
                {{ article.category_name }}
              </span>
              <span class="meta-date">{{ formatDate(article.created_at) }}</span>
            </div>
            <!-- 标题（关键词高亮） -->
            <h3 class="article-title" v-html="highlightKeyword(article.title)"></h3>
            <!-- 摘要（关键词高亮） -->
            <p class="article-excerpt" v-html="highlightKeyword(article.summary || '暂无摘要')"></p>
            <!-- 阅读链接 -->
            <span class="article-read">
              阅读全文
              <span class="read-arrow">→</span>
            </span>
          </div>
        </article>
      </div>

      <!-- 空状态：已搜索但无结果 -->
      <div v-else-if="keyword && searched && !loading" class="empty-state animate-fade-in-up">
        <div class="empty-icon" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            width="64"
            height="64"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <p class="empty-title">未找到与「{{ keyword }}」相关的文章</p>
        <p class="empty-desc">尝试更换关键词或浏览其他文章</p>
      </div>

      <!-- 初始状态：未输入关键词 -->
      <div v-else-if="!keyword" class="empty-state animate-fade-in-up">
        <div class="empty-icon" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            width="64"
            height="64"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <p class="empty-title">请输入关键词开始搜索</p>
        <p class="empty-desc">支持按文章标题、摘要、内容进行搜索</p>
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
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getPublicArticles } from '../../api/articles';

const route = useRoute();
const router = useRouter();

/** 组件根节点引用（用于作用域内的滚动观察） */
const rootRef = ref(null);

/** 当前搜索关键词（实际用于查询的值） */
const keyword = ref('');

/** 搜索结果列表 */
const articles = ref([]);

/** 加载状态 */
const loading = ref(false);

/** 是否已执行过搜索（控制空状态与初始状态的展示差异） */
const searched = ref(false);

/** 当前页码 */
const currentPage = ref(1);

/** 每页数量 */
const pageSize = 10;

/** 搜索结果总数 */
const total = ref(0);

/** Intersection Observer 实例（滚动揭示动画） */
let observer = null;

/**
 * 转义字符串中的正则特殊字符
 * 用于安全构建关键词高亮正则，避免用户输入导致正则注入
 * @param {string} str - 需要转义的字符串
 * @returns {string} 转义后的字符串
 */
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 格式化日期为 YYYY-MM-DD
 * @param {string} dateStr - 后端返回的日期字符串
 * @returns {string} 格式化后的日期，无效时返回空字符串
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
 * 关键词高亮处理
 * 将文本中匹配关键词的部分用 <mark> 标签包裹，实现视觉高亮
 * @param {string} text - 原始文本
 * @returns {string} 包含高亮标签的 HTML 字符串
 */
function highlightKeyword(text) {
  if (!keyword.value || !text) return text || '';
  const escaped = escapeRegExp(keyword.value);
  // 全局匹配正则替换所有出现位置
  const reg = new RegExp(`(${escaped})`, 'gi');
  return text.replace(reg, '<mark class="highlight">$1</mark>');
}

/**
 * 跳转到文章详情页
 * @param {number} id - 文章 ID
 */
function goToArticle(id) {
  router.push(`/article/${id}`);
}

/**
 * 执行搜索
 * 重置页码后调用搜索接口获取结果
 * @returns {Promise<void>}
 */
async function doSearch() {
  const kw = keyword.value.trim();
  // 关键词为空时不执行搜索
  if (!kw) {
    articles.value = [];
    total.value = 0;
    searched.value = false;
    return;
  }
  loading.value = true;
  searched.value = true;
  try {
    const { data } = await getPublicArticles({
      keyword: kw,
      page: currentPage.value,
      page_size: pageSize
    });
    // 兼容返回结构：data = { list, pagination }
    if (data && data.list) {
      articles.value = data.list;
      total.value = data.pagination?.total ?? 0;
    } else {
      articles.value = [];
      total.value = 0;
    }
    await nextTick();
    initObserver();
  } catch (e) {
    console.error('搜索失败:', e);
    articles.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

/**
 * 初始化 Intersection Observer
 * 监听组件内所有 .reveal 元素，进入视口时添加 visible 类触发动画
 */
function initObserver() {
  if (observer) observer.disconnect();
  if (!rootRef.value) return;
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
  rootRef.value.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
}

/**
 * 分页器页码变化回调
 * @param {number} page - 新页码
 */
function handlePageChange(page) {
  currentPage.value = page;
  doSearch();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * 监听路由查询参数变化
 * 外部链接或浏览器前进/后退导致 keyword 变化时同步状态并重新搜索
 */
watch(
  () => route.query.keyword,
  (newKeyword) => {
    const kw = newKeyword ? String(newKeyword).trim() : '';
    // 仅在关键词实际变化时处理，避免重复搜索
    if (kw !== keyword.value) {
      keyword.value = kw;
      currentPage.value = 1;
      if (kw) {
        doSearch();
      } else {
        articles.value = [];
        total.value = 0;
        searched.value = false;
      }
    }
  }
);

onMounted(() => {
  // 初始化：从路由查询参数读取关键词
  const initialKeyword = route.query.keyword ? String(route.query.keyword).trim() : '';
  if (initialKeyword) {
    keyword.value = initialKeyword;
    doSearch();
  }
});

onUnmounted(() => {
  if (observer) observer.disconnect();
});
</script>

<style scoped>
/* ========== 搜索头部 ========== */
.search-header {
  max-width: 960px;
  margin: 0 auto;
  padding: 72px 32px 48px;
  text-align: center;
}

.eyebrow {
  margin: 0 0 14px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 5px;
  color: var(--text-tertiary);
}

/* 关键词突出展示：超大字号 */
.keyword-title {
  margin: 0 0 16px;
  font-size: clamp(40px, 7vw, 64px);
  font-weight: 800;
  letter-spacing: -2px;
  line-height: 1.1;
  color: var(--text-primary);
}

.keyword-text {
  background: linear-gradient(
    135deg,
    var(--primary-dark) 0%,
    var(--primary) 50%,
    var(--primary-light) 100%
  );
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.keyword-empty {
  color: var(--text-tertiary);
}

.result-stats {
  margin: 0;
  font-size: 15px;
  color: var(--text-secondary);
}

.stats-count {
  color: var(--primary);
  font-weight: 700;
  font-size: 18px;
  margin: 0 4px;
}

/* ========== 内容区 ========== */
.content-wrapper {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 32px 80px;
}

/* ========== 结果列表（横向布局，非卡片） ========== */
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
  gap: 14px;
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

/* 标题 */
.article-title {
  margin: 0 0 12px;
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.4;
  letter-spacing: -0.5px;
  transition: color 0.25s var(--ease-out);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.article-row:hover .article-title {
  color: var(--primary);
}

/* 摘要 */
.article-excerpt {
  margin: 0 0 16px;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.7;
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

/* 关键词高亮（通过 v-html 渲染） */
.article-title :deep(mark.highlight),
.article-excerpt :deep(mark.highlight) {
  background: rgba(13, 148, 136, 0.15);
  color: var(--primary-dark);
  padding: 1px 4px;
  border-radius: 3px;
  font-weight: 600;
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

.empty-icon {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
  color: var(--text-tertiary);
  /* 轻微呼吸动画 */
  animation: pulse-soft 2.4s ease-in-out infinite;
}

@keyframes pulse-soft {
  0%,
  100% {
    opacity: 0.5;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.05);
  }
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

/* ========== 响应式 ========== */
@media (max-width: 768px) {
  .search-header {
    padding: 48px 20px 32px;
  }
  .content-wrapper {
    padding: 0 16px 56px;
  }
  .article-title {
    font-size: 18px;
  }
  .article-row {
    padding-left: 20px;
  }
  .article-row:hover {
    padding-left: 24px;
  }
}
</style>
