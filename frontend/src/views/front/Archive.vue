/** * @file Archive.vue * @description 文章归档时间线组件（杂志风） * *
作用：按年月分组展示所有已发布文章，提供时间线式浏览体验 * - 顶部 Hero：归档标题 + 文章总数统计 * -
时间线主体：左侧年月节点 + 右侧文章列表 * - 每篇文章：可点击标题跳转详情（/article/:id）、发布日期 *
- 加载中骨架 / 空状态兜底 * * 数据获取： * - getArticleArchives() 获取按年月分组的归档数据 *
返回数组，每项：{ year, month, label: "2026年7月", articles: [{ id, title, created_at }] } * *
设计要点： * - 主色调青绿色 #0d9488 * - 时间线竖线 + 节点圆点，年月作为分组标题 * - 文章条目悬浮高亮
* - 响应式：移动端节点移至顶部，文章列表纵向堆叠 */
<template>
  <div class="archive-page">
    <!-- Hero 区域：归档标题 + 文章总数统计 -->
    <section class="hero">
      <div class="hero-inner">
        <p class="hero-eyebrow">ARCHIVE</p>
        <h1 class="hero-title">文章归档</h1>
        <p class="hero-subtitle">共 {{ totalArticles }} 篇文章 · 按时间倒序排列</p>
      </div>
      <!-- 装饰光斑（纯视觉，不可交互） -->
      <div class="hero-decoration" aria-hidden="true"></div>
    </section>

    <!-- 主体：时间线 -->
    <div class="content-wrapper">
      <main class="content-main">
        <!-- 加载中骨架：首次加载且无数据时展示 -->
        <div v-if="loading && archives.length === 0" class="timeline-skeleton">
          <div v-for="n in 4" :key="n" class="skeleton-group">
            <div class="skeleton-label"></div>
            <div v-for="m in 3" :key="m" class="skeleton-line"></div>
          </div>
        </div>

        <!-- 时间线：有归档数据时展示 -->
        <div v-else-if="archives.length > 0" class="timeline">
          <section
            v-for="(group, index) in archives"
            :key="`${group.year}-${group.month}`"
            class="timeline-group"
            :style="{ '--group-index': index }"
          >
            <!-- 年月节点：竖线上的圆点 + 年月标签 -->
            <div class="timeline-node">
              <span class="node-dot"></span>
              <div class="node-label">
                <span class="node-year">{{ group.year }}</span>
                <span class="node-month">{{ group.label }}</span>
                <span class="node-count">{{ group.articles.length }} 篇</span>
              </div>
            </div>

            <!-- 文章列表：当前年月下的所有文章 -->
            <ul class="article-list">
              <li
                v-for="article in group.articles"
                :key="article.id"
                class="article-item"
                @click="goToArticle(article.id)"
              >
                <span class="article-date">{{ formatDate(article.created_at) }}</span>
                <span class="article-title">{{ article.title }}</span>
              </li>
            </ul>
          </section>
        </div>

        <!-- 空状态：非加载且无归档时展示 -->
        <div v-else class="empty-state">
          <el-icon :size="56" color="#cbd5e1"><Document /></el-icon>
          <p class="empty-text">暂无文章归档</p>
          <p class="empty-desc">文章发布后将在此按时间归档展示</p>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Document } from '@element-plus/icons-vue';
import { getArticleArchives } from '../../api/articles';

const router = useRouter();

/** 归档数据（按年月分组的数组） */
const archives = ref([]);

/** 加载状态（控制骨架屏展示） */
const loading = ref(false);

/**
 * 文章总数（汇总所有年月分组下的文章数量）
 * @returns {number} 文章总篇数
 */
const totalArticles = computed(() => {
  let count = 0;
  // 遍历每个年月分组，累加文章数量
  for (const group of archives.value) {
    // 仅在分组存在 articles 数组时累加，避免无效数据
    if (Array.isArray(group.articles)) {
      count += group.articles.length;
    }
  }
  return count;
});

/**
 * 格式化日期为 YYYY-MM-DD
 * @param {string} dateStr - 后端返回的日期字符串
 * @returns {string} 格式化后的日期，无效时返回空字符串
 */
function formatDate(dateStr) {
  // 日期为空直接返回空字符串
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
 * 跳转到文章详情页
 * @param {number} id - 文章 ID
 */
function goToArticle(id) {
  router.push(`/article/${id}`);
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
  } catch (e) {
    console.error('加载归档失败:', e);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadArchives();
});
</script>

<style scoped>
.archive-page {
  --color-primary: #0d9488; /* 主色：青绿 */
  --color-primary-dark: #0f766e; /* 主色深 */
  --color-primary-light: #14b8a6; /* 主色浅 */
  --color-text: #0f172a; /* 主文本 */
  --color-text-secondary: #475569; /* 次级文本 */
  --color-text-muted: #94a3b8; /* 弱化文本 */
  --color-bg: #ffffff; /* 卡片背景 */
  --color-bg-soft: #f8fafc; /* 页面背景 */
  --color-border: #e2e8f0; /* 分割线 */
  --max-width: 960px; /* 内容最大宽度 */
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

.hero-eyebrow {
  margin: 0 0 12px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 4px;
  color: rgba(255, 255, 255, 0.8);
}

.hero-title {
  margin: 0 0 16px;
  font-size: 48px;
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
.hero-decoration {
  position: absolute;
  top: -100px;
  right: -60px;
  width: 320px;
  height: 320px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.18) 0%, transparent 70%);
  border-radius: 50%;
  z-index: 1;
}

/* ========== 内容区 ========== */
.content-wrapper {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 56px 32px 64px;
}

.content-main {
  min-width: 0;
}

/* ========== 时间线 ========== */
.timeline {
  position: relative;
}

/* 时间线连续竖线：贯穿所有分组 */
.timeline::before {
  content: '';
  position: absolute;
  left: 179px; /* 与节点右边缘对齐 */
  top: 8px;
  bottom: 8px;
  width: 2px;
  background: var(--color-border);
}

.timeline-group {
  position: relative;
  display: flex;
  align-items: flex-start;
  margin-bottom: 48px;
  /* 分组入场动画：按索引错峰淡入 */
  animation: group-in 0.5s ease backwards;
  animation-delay: calc(var(--group-index) * 80ms);
}

@keyframes group-in {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 年月节点：左侧标签列 */
.timeline-node {
  position: relative;
  flex: 0 0 180px;
  box-sizing: border-box;
  padding-right: 24px;
  text-align: right;
}

/* 节点圆点：位于竖线上 */
.node-dot {
  position: absolute;
  top: 6px;
  right: -8px;
  width: 14px;
  height: 14px;
  background: var(--color-primary);
  border: 3px solid #fff;
  border-radius: 50%;
  box-shadow: 0 0 0 2px var(--color-primary);
}

.node-year {
  display: block;
  font-size: 28px;
  font-weight: 800;
  color: var(--color-text);
  line-height: 1;
  letter-spacing: -0.5px;
}

.node-month {
  display: block;
  margin-top: 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-primary);
}

.node-count {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text-muted);
}

/* 文章列表 */
.article-list {
  list-style: none;
  margin: 0;
  padding: 0 0 0 28px;
  flex: 1;
  min-width: 0;
}

.article-item {
  display: flex;
  align-items: baseline;
  gap: 16px;
  padding: 14px 16px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.article-item:hover {
  background: var(--color-bg-soft);
}

.article-date {
  flex-shrink: 0;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted);
}

.article-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--color-text);
  line-height: 1.5;
  transition: color 0.2s ease;
}

/* 悬浮时标题变为主色 */
.article-item:hover .article-title {
  color: var(--color-primary);
}

/* ========== 骨架屏 ========== */
.timeline-skeleton {
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.skeleton-group {
  padding-left: 180px;
}

.skeleton-label {
  width: 140px;
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

/* ========== 响应式 ========== */
/* 手机：节点移至顶部，文章列表纵向堆叠 */
@media (max-width: 768px) {
  .hero {
    padding: 56px 20px 48px;
  }

  .hero-title {
    font-size: 36px;
  }

  .content-wrapper {
    padding: 32px 16px 48px;
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
    position: relative;
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
    font-size: 22px;
  }

  /* 文章列表取消左缩进 */
  .article-list {
    padding-left: 0;
  }

  .skeleton-group {
    padding-left: 32px;
  }
}
</style>
