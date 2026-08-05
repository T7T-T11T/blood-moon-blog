/** * Search.vue - 全站搜索页面 * * 接入 AsyncData 统一处理 loading/error/empty 状态 * 关键词高亮 +
分页 */
<template>
  <div ref="rootRef" class="search-page">
    <!-- ============ Hero 区域 ============ -->
    <section class="hero">
      <div class="hero-inner">
        <p class="hero-eyebrow animate-fade-in-down">SEARCH</p>
        <h1 class="hero-title animate-fade-in-up">搜索文章</h1>
        <div class="search-form animate-fade-in-up delay-100">
          <el-icon class="search-icon"><Search /></el-icon>
          <input
            ref="searchInputRef"
            v-model="keyword"
            type="text"
            class="search-input"
            placeholder="输入关键词搜索…"
            @keyup.enter="doSearch"
          />
          <button class="search-btn" @click="doSearch">搜索</button>
        </div>
      </div>
    </section>

    <!-- ============ 搜索结果 ============ -->
    <div class="content-wrapper">
      <AsyncData
        :loading="loading"
        :error="error"
        :empty="results.length === 0 && !loading && !error && searched"
        error-message="搜索失败，请稍后重试"
        empty-message="未找到匹配的文章，请尝试其他关键词"
        retry-text="重试"
        @retry="doSearch"
      >
        <!-- 结果统计 -->
        <div v-if="searched" class="search-stats">
          找到 <strong>{{ total }}</strong> 篇相关文章
        </div>

        <!-- 文章列表 -->
        <div class="article-list">
          <article
            v-for="(article, index) in results"
            :key="article.id"
            class="article-row reveal"
            :style="{ '--row-index': index }"
            @click="goToArticle(article.id)"
          >
            <span class="accent-bar" aria-hidden="true"></span>
            <div class="article-body">
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
              <!-- eslint-disable vue/no-v-html -->
              <h3 class="article-title" v-html="highlightKeyword(article.title)"></h3>
              <p
                class="article-excerpt"
                v-html="highlightKeyword(article.summary || '暂无摘要')"
              ></p>
              <!-- eslint-enable vue/no-v-html -->
              <span class="article-read">
                阅读全文
                <span class="read-arrow">→</span>
              </span>
            </div>
          </article>
        </div>

        <!-- 分页 -->
        <div v-if="totalPages > 1" class="pagination-wrapper">
          <el-pagination
            v-model:current-page="currentPage"
            :page-size="pageSize"
            :total="total"
            layout="prev, pager, next"
            background
            @current-change="onPageChange"
          />
        </div>
      </AsyncData>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Search, View } from '@element-plus/icons-vue';
import { formatDate } from '@/utils/format';
import { searchArticles } from '../../api/articles';
import AsyncData from '../../components/common/AsyncData.vue';

const route = useRoute();
const router = useRouter();

const rootRef = ref(null);
const searchInputRef = ref(null);
const keyword = ref('');
const results = ref([]);
const total = ref(0);
const totalPages = ref(0);
const currentPage = ref(1);
const pageSize = 10;
const loading = ref(false);
const error = ref(false);
const searched = ref(false);
let observer = null;

/** 当前搜索关键词（记录最近一次搜索，用于高亮） */
const lastKeyword = ref('');

/** 高亮关键词（转义 HTML 防止 XSS） */
function highlightKeyword(text) {
  if (!lastKeyword.value || !text) return text;
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const kw = lastKeyword.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${kw})`, 'gi');
  return escaped.replace(regex, '<mark>$1</mark>');
}

/** 执行搜索 */
async function doSearch() {
  const kw = keyword.value.trim();
  if (!kw) return;

  currentPage.value = 1;
  await fetchResults();
  // 同步 URL 参数
  router.replace({ query: { keyword: kw } });
}

/** 分页切换 */
async function onPageChange(page) {
  currentPage.value = page;
  await fetchResults();
  // 滚动到顶部
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/** 请求搜索结果 */
async function fetchResults() {
  const kw = keyword.value.trim();
  if (!kw) return;

  loading.value = true;
  error.value = false;
  searched.value = true;

  try {
    const res = await searchArticles({ keyword: kw, page: currentPage.value, page_size: pageSize });
    const data = res.data || {};
    results.value = data.list || [];
    total.value = (data.pagination && data.pagination.total) || 0;
    totalPages.value = (data.pagination && data.pagination.total_pages) || 0;
    lastKeyword.value = kw;
    await nextTick();
    initObserver();
  } catch (e) {
    console.error('搜索失败:', e);
    error.value = true;
  } finally {
    loading.value = false;
  }
}

/** 跳转到文章详情 */
function goToArticle(id) {
  router.push(`/article/${id}`);
}

/** 初始化滚动动画 */
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
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
  );
  rootRef.value.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
}

onMounted(() => {
  // 从 URL 参数读取关键词
  const queryKw = route.query.keyword;
  if (queryKw) {
    keyword.value = queryKw;
    fetchResults();
  }
});

onUnmounted(() => {
  if (observer) observer.disconnect();
});
</script>

<style scoped>
/* ========== Hero ========== */
.hero {
  position: relative;
  padding: 120px 32px 80px;
  background: linear-gradient(
    180deg,
    rgba(6, 9, 18, 0.55) 0%,
    rgba(10, 14, 26, 0.45) 50%,
    rgba(18, 24, 40, 0.65) 100%
  );
  overflow: hidden;
  color: #fff;
  isolation: isolate;
  border-bottom: 1px solid var(--border);
}

.hero::before {
  content: '';
  position: absolute;
  top: 5%;
  left: 50%;
  transform: translateX(-50%);
  width: 480px;
  height: 480px;
  background: radial-gradient(
    circle,
    rgba(220, 38, 38, 0.1) 0%,
    rgba(153, 27, 27, 0.04) 40%,
    transparent 70%
  );
  border-radius: 50%;
  z-index: 0;
  pointer-events: none;
}

.hero-inner {
  position: relative;
  z-index: 2;
  max-width: 720px;
  margin: 0 auto;
  text-align: center;
}

.hero-eyebrow {
  margin: 0 0 20px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 6px;
  color: rgba(248, 113, 113, 0.8);
}

.hero-title {
  margin: 0 0 32px;
  font-size: clamp(40px, 7vw, 64px);
  font-weight: 800;
  letter-spacing: -2px;
  background: linear-gradient(180deg, #ffffff 0%, #fca5a5 60%, #dc2626 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* ========== 搜索表单 ========== */
.search-form {
  display: flex;
  align-items: center;
  gap: 0;
  max-width: 560px;
  margin: 0 auto;
  background: rgba(26, 32, 53, 0.8);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  transition:
    border-color 0.25s var(--ease-out),
    box-shadow 0.25s var(--ease-out);
}

.search-form:focus-within {
  border-color: var(--primary);
  box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.12);
}

.search-icon {
  margin-left: 16px;
  font-size: 18px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  padding: 14px 16px;
  border: none;
  outline: none;
  background: transparent;
  font-size: 15px;
  color: var(--text-primary);
}

.search-input::placeholder {
  color: var(--text-tertiary);
}

.search-btn {
  padding: 14px 28px;
  background: var(--primary);
  border: none;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.25s var(--ease-out);
  flex-shrink: 0;
}

.search-btn:hover {
  background: var(--primary-dark);
}

/* ========== 内容区 ========== */
.content-wrapper {
  max-width: 960px;
  margin: 0 auto;
  padding: 48px 32px 96px;
}

/* 结果统计 */
.search-stats {
  margin-bottom: 32px;
  font-size: 14px;
  color: var(--text-secondary);
}

.search-stats strong {
  color: var(--primary);
  font-weight: 700;
}

/* ========== 文章列表 ========== */
.article-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.article-row {
  position: relative;
  display: flex;
  align-items: stretch;
  padding: 28px 0;
  border-bottom: 1px solid rgba(30, 41, 59, 0.5);
  cursor: pointer;
  transition:
    padding-left 0.3s var(--ease-out),
    background 0.25s var(--ease-out);
  opacity: 0;
  transform: translateY(24px);
  transition:
    opacity 0.6s var(--ease-out),
    transform 0.6s var(--ease-out),
    padding-left 0.3s var(--ease-out),
    background 0.25s var(--ease-out);
}

.article-row.visible {
  opacity: 1;
  transform: translateY(0);
}

.article-row:hover {
  padding-left: 16px;
  background: rgba(220, 38, 38, 0.04);
}

/* 主色强调条 */
.accent-bar {
  position: absolute;
  left: 0;
  top: 28px;
  bottom: 28px;
  width: 3px;
  background: var(--primary);
  border-radius: 0 3px 3px 0;
  transform: scaleY(0.3);
  opacity: 0;
  transition:
    transform 0.35s var(--ease-spring),
    opacity 0.25s var(--ease-out);
}

.article-row:hover .accent-bar {
  transform: scaleY(1);
  opacity: 1;
}

.article-body {
  flex: 1;
  min-width: 0;
}

.article-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
  font-size: 13px;
  color: var(--text-tertiary);
}

.meta-category {
  padding: 2px 10px;
  background: rgba(220, 38, 38, 0.15);
  color: var(--primary);
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.meta-date,
.meta-views {
  display: flex;
  align-items: center;
  gap: 4px;
}

.article-title {
  margin: 0 0 10px;
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  transition: color 0.25s var(--ease-out);
}

.article-row:hover .article-title {
  color: var(--primary);
}

.article-excerpt {
  margin: 0 0 12px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 高亮关键词 */
:deep(.article-title mark),
:deep(.article-excerpt mark) {
  background: rgba(220, 38, 38, 0.25);
  color: #fca5a5;
  padding: 1px 3px;
  border-radius: 3px;
}

.article-read {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-tertiary);
  transition:
    color 0.25s var(--ease-out),
    gap 0.25s var(--ease-out);
}

.article-row:hover .article-read {
  color: var(--primary);
  gap: 10px;
}

.read-arrow {
  transition: transform 0.25s var(--ease-out);
}

.article-row:hover .read-arrow {
  transform: translateX(3px);
}

/* ========== 分页 ========== */
.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 48px;
}

:deep(.el-pagination) {
  --el-pagination-bg-color: rgba(26, 32, 53, 0.6);
  --el-pagination-text-color: var(--text-secondary);
  --el-pagination-button-bg-color: rgba(26, 32, 53, 0.6);
  --el-pagination-button-disabled-bg-color: rgba(26, 32, 53, 0.3);
}

:deep(.el-pager li) {
  border-radius: 8px;
  font-weight: 600;
}

:deep(.el-pager li.is-active) {
  background: var(--primary);
  color: #fff;
}

/* ========== 响应式 ========== */
@media (max-width: 768px) {
  .hero {
    padding: 80px 20px 56px;
  }
  .content-wrapper {
    padding: 32px 20px 64px;
  }
  .search-btn {
    padding: 14px 18px;
    font-size: 13px;
  }
  .article-title {
    font-size: 17px;
  }
}
</style>
