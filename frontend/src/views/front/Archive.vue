/** * @file Archive.vue * @description 文章归档时间线页（杂志风，卡片化舍弃） * * 作用： * -
按年月分组展示所有已发布文章，提供时间线式浏览体验 * - 左侧竖线 + 年月节点，右侧文章列表 * -
每篇文章：标题（点击跳转详情 /article/:id）、日期、悬浮揭示摘要 * * 数据获取： * -
getArticleArchives() 返回数组 [{ year, month, articles: [{ id, title, created_at, summary }] }] * -
兼容返回 { list } 或数组两种结构 * * 动效（2-3 组）： * - 入场：Hero 文案 fade-in-up 错峰 * -
滚动：时间线分组进入视口时 fade-in-up + 组内文章级联（Intersection Observer） * -
悬浮：文章标题变主色 + 右移 + 摘要展开 */
<template>
  <div ref="rootRef" class="archive-page">
    <!-- ============ Hero 区域 ============ -->
    <section class="hero">
      <div class="hero-inner">
        <p class="hero-eyebrow animate-fade-in-down">ARCHIVE</p>
        <h1 class="hero-title animate-fade-in-up">文章归档</h1>
        <p class="hero-subtitle animate-fade-in-up delay-100">
          共 {{ totalArticles }} 篇文章 · 按时间倒序
        </p>
      </div>
      <!-- 装饰光斑（纯视觉） -->
      <div class="hero-orb" aria-hidden="true"></div>
    </section>

    <!-- ============ 主体：时间线 ============ -->
    <div class="content-wrapper">
      <main class="content-main">
        <!-- 加载骨架：首次加载且无数据时展示 -->
        <div v-if="loading && archives.length === 0" class="timeline-skeleton">
          <div v-for="n in 4" :key="n" class="skeleton-group">
            <div class="skeleton-label"></div>
            <div v-for="m in 3" :key="m" class="skeleton-line"></div>
          </div>
        </div>

        <!-- 时间线 -->
        <div v-else-if="archives.length > 0" class="timeline">
          <section
            v-for="(group, gi) in archives"
            :key="`${group.year}-${group.month}`"
            class="timeline-group reveal"
            :style="{ '--row-index': gi }"
          >
            <!-- 年月节点：竖线上的圆点 + 年月标签 -->
            <div class="timeline-node">
              <span class="node-dot" aria-hidden="true"></span>
              <span class="node-year">{{ group.year }}</span>
              <span class="node-month">{{ monthLabel(group.month) }}</span>
              <span class="node-count">{{ group.articles.length }} 篇</span>
            </div>

            <!-- 文章列表 -->
            <ul class="article-list">
              <li
                v-for="(article, ai) in group.articles"
                :key="article.id"
                class="article-item"
                :style="{ '--item-index': ai }"
              >
                <router-link :to="`/article/${article.id}`" class="article-link">
                  <span class="article-date">{{ formatDate(article.created_at) }}</span>
                  <span class="article-title">{{ article.title }}</span>
                  <span class="article-summary">{{ article.summary || '暂无摘要' }}</span>
                </router-link>
              </li>
            </ul>
          </section>
        </div>

        <!-- 空状态 -->
        <div v-else class="empty-state">
          <p class="empty-title">暂无文章归档</p>
          <p class="empty-desc">文章发布后将在此按时间归档展示</p>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { getArticleArchives } from '../../api/articles';

/** 组件根节点引用（用于作用域内的滚动观察） */
const rootRef = ref(null);

/** 归档数据（按年月分组的数组） */
const archives = ref([]);

/** 加载状态（控制骨架屏展示） */
const loading = ref(false);

/** Intersection Observer 实例（滚动揭示动画） */
let observer = null;

/**
 * 文章总数（汇总所有年月分组下的文章数量）
 * @returns {number} 文章总篇数
 */
const totalArticles = computed(() => {
  let count = 0;
  // 仅在分组存在 articles 数组时累加，避免无效数据
  for (const group of archives.value) {
    if (Array.isArray(group.articles)) count += group.articles.length;
  }
  return count;
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
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 将月份字段转为中文展示标签
 * 兼容数字（1-12）、数字字符串、已带"月"的字符串
 * @param {number|string} month - 月份
 * @returns {string} 形如 "3月" 的标签
 */
function monthLabel(month) {
  if (month == null || month === '') return '';
  // 已是字符串且包含"月"直接返回
  if (typeof month === 'string' && month.includes('月')) return month;
  const n = Number(month);
  // 数字月份转为 "X月"
  if (!isNaN(n) && n >= 1 && n <= 12) return `${n}月`;
  return String(month);
}

/**
 * 加载归档数据
 * 兼容返回值为数组或对象包裹的数组两种结构
 * @returns {Promise<void>}
 */
async function loadArchives() {
  loading.value = true;
  try {
    const { data } = await getArticleArchives();
    // 兼容数组或 { list } 两种返回结构
    archives.value = Array.isArray(data) ? data : (data?.list ?? []);
    // 数据更新后初始化滚动揭示
    await nextTick();
    initObserver();
  } catch (e) {
    console.error('加载归档失败:', e);
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
          // 揭示后停止观察，避免重复触发
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -60px 0px' }
  );
  // 仅观察组件内的 reveal 元素，避免跨页面干扰
  rootRef.value.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
}

onMounted(() => {
  loadArchives();
});

onUnmounted(() => {
  // 组件卸载时清理观察者，避免内存泄漏
  if (observer) observer.disconnect();
});
</script>

<style scoped>
/* ========== Hero 区域 ========== */
.hero {
  position: relative;
  padding: 88px 32px 72px;
  background: linear-gradient(135deg, #0f766e 0%, #0d9488 45%, #14b8a6 100%);
  overflow: hidden;
  color: #fff;
  isolation: isolate;
}

.hero-inner {
  position: relative;
  z-index: 2;
  max-width: 960px;
  margin: 0 auto;
  text-align: center;
}

.hero-eyebrow {
  margin: 0 0 14px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 5px;
  color: rgba(255, 255, 255, 0.78);
}

.hero-title {
  margin: 0 0 16px;
  font-size: clamp(40px, 6vw, 56px);
  font-weight: 800;
  letter-spacing: -1.5px;
  text-shadow: 0 2px 20px rgba(0, 0, 0, 0.15);
}

.hero-subtitle {
  margin: 0;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.9);
  letter-spacing: 0.5px;
}

/* Hero 装饰光斑 */
.hero-orb {
  position: absolute;
  top: -120px;
  right: -80px;
  width: 360px;
  height: 360px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.18) 0%, transparent 70%);
  border-radius: 50%;
  z-index: 1;
  pointer-events: none;
}

/* ========== 内容区 ========== */
.content-wrapper {
  max-width: 960px;
  margin: 0 auto;
  padding: 64px 32px 80px;
}

.content-main {
  min-width: 0;
}

/* ========== 时间线 ========== */
.timeline {
  position: relative;
}

/* 连续竖线：贯穿所有分组 */
.timeline::before {
  content: '';
  position: absolute;
  left: 119px;
  top: 8px;
  bottom: 8px;
  width: 2px;
  background: var(--border);
}

/* 分组：入场前隐藏 */
.timeline-group {
  position: relative;
  display: flex;
  align-items: flex-start;
  margin-bottom: 56px;
  opacity: 0;
  transform: translateY(24px);
  transition:
    opacity 0.6s var(--ease-out),
    transform 0.6s var(--ease-out);
  transition-delay: calc(var(--row-index) * 80ms);
}

/* 进入视口后揭示 */
.timeline-group.visible {
  opacity: 1;
  transform: translateY(0);
}

/* 年月节点列 */
.timeline-node {
  position: relative;
  flex: 0 0 120px;
  padding-right: 24px;
  text-align: right;
  box-sizing: border-box;
}

/* 节点圆点：位于竖线上 */
.node-dot {
  position: absolute;
  top: 6px;
  right: -8px;
  width: 14px;
  height: 14px;
  background: var(--primary);
  border: 3px solid #fff;
  border-radius: 50%;
  box-shadow: 0 0 0 2px var(--primary);
}

.node-year {
  display: block;
  font-size: 30px;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1;
  letter-spacing: -0.5px;
}

.node-month {
  display: block;
  margin-top: 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--primary);
}

.node-count {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-tertiary);
}

/* 文章列表 */
.article-list {
  list-style: none;
  margin: 0;
  padding: 0 0 0 32px;
  flex: 1;
  min-width: 0;
}

/* 文章项：组揭示后级联展开 */
.article-item {
  opacity: 0;
  transform: translateY(12px);
  transition:
    opacity 0.5s var(--ease-out),
    transform 0.5s var(--ease-out);
  transition-delay: calc(var(--item-index) * 50ms);
}

.timeline-group.visible .article-item {
  opacity: 1;
  transform: translateY(0);
}

/* 文章链接：日期 + 标题同行，摘要悬浮展开 */
.article-link {
  display: block;
  padding: 14px 16px;
  border-radius: var(--radius-md);
  text-decoration: none;
  color: inherit;
  transition:
    background 0.25s var(--ease-out),
    transform 0.25s var(--ease-out);
}

.article-link:hover {
  background: var(--bg-body);
  transform: translateX(6px);
}

.article-date {
  display: inline-block;
  margin-right: 16px;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  color: var(--text-tertiary);
}

.article-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  transition: color 0.25s var(--ease-out);
}

/* 悬浮时标题变主色 */
.article-link:hover .article-title {
  color: var(--primary);
}

/* 摘要：默认收起，悬浮展开 */
.article-summary {
  display: block;
  max-height: 0;
  overflow: hidden;
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-secondary);
  opacity: 0;
  transition:
    max-height 0.35s var(--ease-out),
    opacity 0.3s var(--ease-out),
    margin 0.35s var(--ease-out);
}

.article-link:hover .article-summary {
  max-height: 80px;
  margin-top: 8px;
  opacity: 1;
}

/* ========== 骨架屏 ========== */
.timeline-skeleton {
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.skeleton-group {
  padding-left: 152px;
}

.skeleton-label {
  width: 120px;
  height: 32px;
  margin-left: auto;
  margin-bottom: 20px;
  border-radius: 6px;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

.skeleton-line {
  height: 14px;
  margin: 12px 0;
  border-radius: 6px;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
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

/* ========== 响应式 ========== */
@media (max-width: 768px) {
  .hero {
    padding: 56px 20px 48px;
  }
  .content-wrapper {
    padding: 40px 16px 56px;
  }
  /* 竖线移至最左侧 */
  .timeline::before {
    left: 7px;
  }
  /* 分组改为纵向布局，左侧留出竖线空间 */
  .timeline-group {
    flex-direction: column;
    padding-left: 32px;
  }
  /* 节点改为顶部标签 */
  .timeline-node {
    flex: none;
    width: auto;
    padding-right: 0;
    padding-bottom: 16px;
    text-align: left;
  }
  /* 圆点移至竖线上（左侧） */
  .node-dot {
    left: -29px;
    right: auto;
    top: 4px;
  }
  .node-year {
    font-size: 24px;
  }
  .article-list {
    padding-left: 0;
  }
  .skeleton-group {
    padding-left: 32px;
  }
}
</style>
