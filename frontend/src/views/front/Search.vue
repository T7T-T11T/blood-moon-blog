/** * @file Search.vue * @description 搜索结果页（杂志风设计） * *
作用：根据用户输入的关键词搜索文章并展示结果列表，包含： * - 搜索头部：搜索框（可重新输入关键词）+
搜索结果统计 * - 搜索结果列表：文章卡片（封面图/渐变占位、分类标签、标题、摘要、元信息） * -
分页器：结果总数超过单页数量时展示 * - 空状态：无搜索关键词或无结果时展示对应提示 * * 数据获取： * -
getPublicArticles({ keyword, page, page_size: 10 }) 搜索文章 * * 路由参数： * -
useRoute().query.keyword 获取搜索关键词 * - 关键词变化时自动重新搜索 * * 设计要点： * - 主色调青绿色
#0d9488 * - 搜索结果卡片悬浮上移动画 + 封面图缩放 * - 关键词高亮显示（搜索框内） */
<template>
  <div class="search-page">
    <!-- 搜索头部：标题 + 搜索框 + 结果统计 -->
    <section class="search-header">
      <h1 class="page-title">
        <el-icon><Search /></el-icon>
        搜索文章
      </h1>

      <!-- 搜索框：可重新输入关键词搜索 -->
      <div class="search-box">
        <el-input
          v-model="searchInput"
          placeholder="输入关键词搜索文章..."
          size="large"
          clearable
          @keyup.enter="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
          <template #append>
            <el-button type="primary" :loading="loading" @click="handleSearch">搜索</el-button>
          </template>
        </el-input>
      </div>

      <!-- 搜索结果统计：存在关键词且非首次加载时展示 -->
      <div v-if="keyword && searched" class="search-stats">
        <span class="stats-text">
          关键词「<span class="stats-keyword">{{ keyword }}</span
          >」共找到 <span class="stats-count">{{ total }}</span> 篇文章
        </span>
      </div>
    </section>

    <!-- 搜索结果区域 -->
    <div class="search-content">
      <!-- 加载中骨架屏：首次加载时展示 -->
      <div v-if="loading && articles.length === 0" class="article-list">
        <div v-for="n in 5" :key="n" class="article-card skeleton-card">
          <div class="card-cover skeleton-cover"></div>
          <div class="card-body">
            <div class="skeleton-line w-60"></div>
            <div class="skeleton-line w-90"></div>
            <div class="skeleton-line w-40"></div>
          </div>
        </div>
      </div>

      <!-- 搜索结果列表：有数据时展示 -->
      <div v-else-if="articles.length > 0" class="article-list">
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
            <h3 class="card-title" v-html="highlightKeyword(article.title)"></h3>
            <p class="card-summary" v-html="highlightKeyword(article.summary || '暂无摘要')"></p>
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

      <!-- 空状态：已搜索但无结果 -->
      <div v-else-if="keyword && searched && !loading" class="empty-state">
        <el-icon :size="64" color="#cbd5e1"><Document /></el-icon>
        <p class="empty-text">未找到与「{{ keyword }}」相关的文章</p>
        <p class="empty-desc">尝试更换关键词或浏览其他文章</p>
      </div>

      <!-- 初始状态：未输入关键词 -->
      <div v-else-if="!keyword" class="empty-state">
        <el-icon :size="64" color="#cbd5e1"><Search /></el-icon>
        <p class="empty-text">请输入关键词开始搜索</p>
        <p class="empty-desc">支持按文章标题、摘要、内容进行搜索</p>
      </div>

      <!-- 分页器：结果总数超过单页数量时展示 -->
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
import { ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Search, View, Document } from '@element-plus/icons-vue';
import { getPublicArticles } from '../../api/articles';

const route = useRoute();
const router = useRouter();

/** 搜索框输入值（双向绑定） */
const searchInput = ref('');

/** 当前搜索关键词（实际用于查询的值，与输入框分离避免每次输入都触发搜索） */
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
 * 关键词高亮处理
 * 将文本中匹配关键词的部分用 <mark> 标签包裹，实现视觉高亮
 * @param {string} text - 原始文本
 * @returns {string} 包含高亮标签的 HTML 字符串
 */
function highlightKeyword(text) {
  // 无关键词或无文本时直接返回原文
  if (!keyword.value || !text) return text || '';
  const escaped = escapeRegExp(keyword.value);
  // 使用全局匹配正则替换所有出现位置
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
 * 重置页码，调用搜索接口获取结果
 * @returns {Promise<void>}
 */
async function doSearch() {
  // 关键词为空时不执行搜索
  const kw = keyword.value.trim();
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
      // 分页信息不存在时兜底为 0
      total.value = data.pagination?.total ?? 0;
    } else {
      // 兜底：返回结构不符合预期时清空结果
      articles.value = [];
      total.value = 0;
    }
  } catch (e) {
    console.error('搜索失败:', e);
    articles.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

/**
 * 搜索按钮点击 / 回车触发
 * 同步输入框值到当前关键词，重置页码后执行搜索
 */
function handleSearch() {
  keyword.value = searchInput.value.trim();
  currentPage.value = 1;
  // 同步关键词到 URL 查询参数，便于分享与刷新保持状态
  router.replace({ query: { ...route.query, keyword: keyword.value } });
  doSearch();
  // 搜索后回到顶部
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * 分页器页码变化回调
 * @param {number} page - 新页码
 */
function handlePageChange(page) {
  currentPage.value = page;
  doSearch();
  // 切换页码后回到顶部
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
      searchInput.value = kw;
      currentPage.value = 1;
      if (kw) {
        doSearch();
      } else {
        // 关键词为空时清空结果
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
    searchInput.value = initialKeyword;
    doSearch();
  }
});
</script>

<style scoped>
.search-page {
  --color-primary: #0d9488; /* 主色：青绿 */
  --color-primary-dark: #0f766e; /* 主色深 */
  --color-primary-light: #14b8a6; /* 主色浅 */
  --color-text: #0f172a; /* 主文本 */
  --color-text-secondary: #475569; /* 次级文本 */
  --color-text-muted: #94a3b8; /* 弱化文本 */
  --color-bg: #ffffff; /* 卡片背景 */
  --color-bg-soft: #f8fafc; /* 弱化背景 */
  --color-border: #e2e8f0; /* 分割线 */
  --max-width: 960px; /* 内容最大宽度 */
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 40px 24px 64px;
}

/* ========== 搜索头部 ========== */
.search-header {
  margin-bottom: 40px;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 24px;
  font-size: 32px;
  font-weight: 800;
  color: var(--color-text);
  letter-spacing: -1px;
}

.page-title .el-icon {
  color: var(--color-primary);
}

.search-box {
  margin-bottom: 16px;
}

/* 搜索按钮主色化 */
.search-box :deep(.el-button--primary) {
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.search-box :deep(.el-button--primary:hover) {
  background: var(--color-primary-dark);
  border-color: var(--color-primary-dark);
}

.search-stats {
  padding: 12px 0;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.stats-keyword {
  color: var(--color-primary);
  font-weight: 600;
}

.stats-count {
  color: var(--color-primary-dark);
  font-weight: 700;
  font-size: 16px;
  margin: 0 4px;
}

/* ========== 搜索结果列表 ========== */
.article-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.article-card {
  display: flex;
  gap: 20px;
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
  transform: translateY(-4px);
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.12);
  border-color: rgba(13, 148, 136, 0.4);
}

/* 封面区 */
.card-cover {
  position: relative;
  flex-shrink: 0;
  width: 200px;
  height: 140px;
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
  font-size: 48px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.85);
}

/* 分类标签 */
.category-tag {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  background: rgba(13, 148, 136, 0.92);
  border-radius: 10px;
  backdrop-filter: blur(4px);
}

/* 卡片正文 */
.card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 18px 20px;
  min-width: 0;
}

.card-title {
  margin: 0 0 10px;
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1.5;
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
  margin: 0 0 12px;
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
  padding-top: 10px;
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

/* 关键词高亮（通过 v-html 渲染） */
.card-title :deep(mark.highlight),
.card-summary :deep(mark.highlight) {
  background: rgba(13, 148, 136, 0.15);
  color: var(--color-primary-dark);
  padding: 1px 4px;
  border-radius: 3px;
  font-weight: 600;
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

/* ========== 响应式 ========== */
/* 平板：封面图收窄 */
@media (max-width: 768px) {
  .search-page {
    padding: 24px 16px 48px;
  }

  .page-title {
    font-size: 24px;
    margin-bottom: 16px;
  }

  .card-cover {
    width: 120px;
    height: 100px;
  }

  .placeholder-letter {
    font-size: 32px;
  }

  .card-body {
    padding: 14px 16px;
  }

  .card-title {
    font-size: 16px;
  }

  .card-summary {
    font-size: 13px;
  }
}

/* 小屏手机：封面图隐藏，仅展示文字 */
@media (max-width: 480px) {
  .card-cover {
    display: none;
  }

  .article-card {
    gap: 0;
  }
}
</style>
