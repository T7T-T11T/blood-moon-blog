/** * @file CategoryList.vue * @description 分类文章列表页（杂志风，与首页同款横向列表） * * 作用：
* - 读取 route.params.slug，展示对应分类下的文章 * -
分类名作为大标题，文章以横向列表呈现（非卡片，悬浮主色强调条） * - 底部分页器 * * 数据获取： * -
getArticlesByCategory(slug, { page, page_size }) * - 返回 { list, pagination, category }（category
字段可选，缺失时用 slug 兜底） * * 路由参数： * - route.params.slug 分类标识 * - slug
变化时自动重新加载 * * 动效（2-3 组）： * - 入场：分类标题 fade-in-up * - 滚动：文章项进入视口时
fade-in-up 错峰（Intersection Observer） * - 悬浮：标题变主色 + 左侧强调条展开 + 阅读箭头右移 */
<template>
  <div ref="rootRef" class="category-page">
    <!-- ============ 分类标题头部 ============ -->
    <section class="page-header">
      <p class="eyebrow animate-fade-in-down">CATEGORY</p>
      <h1 class="page-title animate-fade-in-up">{{ heading }}</h1>
      <p v-if="total > 0" class="page-subtitle animate-fade-in-up delay-100">
        共 {{ total }} 篇文章
      </p>
    </section>

    <!-- ============ 文章列表 ============ -->
    <div class="content-wrapper">
      <!-- 加载骨架 -->
      <div v-if="loading && articles.length === 0" class="article-list">
        <div v-for="n in 5" :key="n" class="skeleton-row">
          <div class="skeleton-line w-70"></div>
          <div class="skeleton-line w-90"></div>
          <div class="skeleton-line w-40"></div>
        </div>
      </div>

      <!-- 文章列表（横向布局，与首页一致） -->
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
        <p class="empty-title">该分类下暂无文章</p>
        <p class="empty-desc">去看看其他分类的内容吧</p>
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
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { View } from '@element-plus/icons-vue';
import { formatDate } from '@/utils/format';
import { getArticlesByCategory } from '../../api/articles';

const route = useRoute();
const router = useRouter();

/** 组件根节点引用（用于作用域内的滚动观察） */
const rootRef = ref(null);

/** 文章列表 */
const articles = ref([]);

/** 加载状态 */
const loading = ref(false);

/** 当前页码 */
const currentPage = ref(1);

/** 每页数量 */
const pageSize = 10;

/** 文章总数 */
const total = ref(0);

/** 分类信息（后端可能返回，用于展示名称） */
const category = ref(null);

/** Intersection Observer 实例（滚动揭示动画） */
let observer = null;

/**
 * 分类展示标题
 * 优先使用后端返回的分类名，缺失时用 slug 兜底
 * @returns {string} 分类名
 */
const heading = computed(() => {
  if (category.value?.name) return category.value.name;
  const slug = route.params.slug;
  if (!slug) return '分类';
  // slug 转为可读形式：横线/下划线转空格 + 首字母大写
  return String(slug)
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
});

/**
 * 跳转到文章详情页
 * @param {number} id - 文章 ID
 */
function goToArticle(id) {
  router.push(`/article/${id}`);
}

/**
 * 加载分类文章
 * @returns {Promise<void>}
 */
async function loadArticles() {
  const slug = route.params.slug;
  if (!slug) return;
  loading.value = true;
  try {
    const { data } = await getArticlesByCategory(slug, {
      page: currentPage.value,
      page_size: pageSize
    });
    // 兼容返回结构：data = { list, pagination, category }
    if (data && data.list) {
      articles.value = data.list;
      total.value = data.pagination?.total ?? 0;
      category.value = data.category ?? null;
    } else {
      articles.value = [];
      total.value = 0;
    }
    await nextTick();
    initObserver();
  } catch (e) {
    console.error('加载分类文章失败:', e);
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
  loadArticles();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * 监听路由 slug 变化
 * 在不同分类间切换时重置页码并重新加载
 */
watch(
  () => route.params.slug,
  () => {
    currentPage.value = 1;
    loadArticles();
  }
);

onMounted(() => {
  loadArticles();
});

onUnmounted(() => {
  if (observer) observer.disconnect();
});
</script>

<style scoped>
/* ========== 页面头部 ========== */
.page-header {
  max-width: 960px;
  margin: 0 auto;
  padding: 72px 32px 48px;
  text-align: center;
  background: linear-gradient(
    180deg,
    rgba(6, 9, 18, 0.55) 0%,
    rgba(10, 14, 26, 0.45) 50%,
    rgba(18, 24, 40, 0.65) 100%
  );
  backdrop-filter: blur(2px);
  transition: opacity 0.8s ease-out;
}

.eyebrow {
  margin: 0 0 14px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 5px;
  color: var(--text-tertiary);
}

.page-title {
  margin: 0 0 16px;
  font-size: clamp(40px, 7vw, 64px);
  font-weight: 800;
  letter-spacing: -2px;
  line-height: 1.1;
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

.page-subtitle {
  margin: 0;
  font-size: 15px;
  color: var(--text-secondary);
}

/* ========== 内容区 ========== */
.content-wrapper {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 32px 80px;
  background: rgba(10, 14, 26, 0.3);
}

/* ========== 文章列表（横向布局，与首页一致） ========== */
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
  gap: 16px;
  margin-bottom: 12px;
  font-size: 12px;
  color: var(--text-tertiary);
  letter-spacing: 0.5px;
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
  background: #1a2035;
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

/* ========== 响应式 ========== */
@media (max-width: 768px) {
  .page-header {
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
