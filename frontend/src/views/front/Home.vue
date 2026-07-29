<template>
  <div class="home-page">
    <!-- 页面头部 -->
    <div class="page-header animate-fade-in-down">
      <div class="header-content">
        <h1 class="page-title">最新文章</h1>
        <p class="page-desc">分享技术，记录成长</p>
      </div>
      <div class="header-stats">
        <div v-for="stat in stats" :key="stat.label" class="stat-item">
          <span class="stat-value">{{ stat.value }}</span>
          <span class="stat-label">{{ stat.label }}</span>
        </div>
      </div>
    </div>

    <!-- 文章列表 -->
    <div class="article-list">
      <article
        v-for="(article, index) in articles"
        :key="article.id"
        class="article-item animate-fade-in-up"
        :style="{ animationDelay: index * 100 + 'ms' }"
        @click="goToArticle(article.id)"
      >
        <div class="article-content">
          <div class="article-meta">
            <span v-if="article.category_name" class="category-tag">
              {{ article.category_name }}
            </span>
            <span class="article-date">
              <el-icon><Clock /></el-icon>
              {{ formatDate(article.created_at) }}
            </span>
            <span class="article-views">
              <el-icon><View /></el-icon>
              {{ article.view_count }} 阅读
            </span>
          </div>
          <h2 class="article-title">{{ article.title }}</h2>
          <p class="article-summary">{{ article.summary }}</p>
          <div v-if="article.tags?.length" class="article-tags">
            <span v-for="tag in article.tags" :key="tag.id" class="tag-item">
              #{{ tag.name }}
            </span>
          </div>
        </div>
        <div class="article-arrow">
          <el-icon :size="20"><ArrowRight /></el-icon>
        </div>
      </article>
    </div>

    <!-- 加载更多 -->
    <div v-if="hasMore" class="load-more">
      <el-button type="primary" size="large" :loading="loading" @click="loadMore">
        加载更多
      </el-button>
    </div>

    <!-- 空状态 -->
    <div v-if="!loading && articles.length === 0" class="empty-state">
      <el-icon :size="64" color="#94a3b8"><Document /></el-icon>
      <p class="empty-text">暂无文章</p>
      <p class="empty-desc">后台登录后可以创建第一篇文章</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Clock, View, ArrowRight, Document } from '@element-plus/icons-vue';

const route = useRoute();
const router = useRouter();

/** 文章列表 */
const articles = ref([]);

/** 加载状态 */
const loading = ref(false);

/** 当前页码 */
const page = ref(1);

/** 每页数量 */
const pageSize = 10;

/** 是否还有更多数据 */
const hasMore = computed(() => page.value * pageSize < total.value);

/** 文章总数 */
const total = ref(0);

/** 统计数据 */
const stats = ref([
  { label: '文章', value: 0 },
  { label: '阅读', value: 0 },
  { label: '分类', value: 0 }
]);

/** 格式化日期 */
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/** 跳转到文章详情 */
function goToArticle(id) {
  router.push(`/article/${id}`);
}

/** 加载文章列表 */
async function loadArticles(reset = false) {
  if (reset) {
    page.value = 1;
    articles.value = [];
  }

  loading.value = true;
  try {
    const keyword = route.query.keyword || '';
    const url = `/api/articles/public?page=${page.value}&page_size=${pageSize}${keyword ? `&keyword=${encodeURIComponent(keyword)}` : ''}`;
    const res = await fetch(url);
    const json = await res.json();

    if (json.code === 200) {
      if (reset) {
        articles.value = json.data.list;
      } else {
        articles.value.push(...json.data.list);
      }
      total.value = json.data.pagination.total;

      // 更新统计
      stats.value[0].value = total.value;
      stats.value[1].value = articles.value.reduce((sum, a) => sum + (a.view_count || 0), 0);
    }
  } catch (e) {
    console.error('加载文章失败:', e);
  } finally {
    loading.value = false;
  }
}

/** 加载更多 */
function loadMore() {
  page.value++;
  loadArticles();
}

onMounted(() => {
  loadArticles(true);
});
</script>

<style scoped>
.home-page {
  animation: fade-in 0.5s ease;
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 页面头部 */
.page-header {
  text-align: center;
  margin-bottom: 48px;
  padding: 48px 0;
}

.header-content {
  margin-bottom: 32px;
}

.page-title {
  font-size: 42px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 12px;
  letter-spacing: -1px;
}

.page-desc {
  font-size: 18px;
  color: #64748b;
  margin: 0;
}

.header-stats {
  display: flex;
  justify-content: center;
  gap: 48px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 28px;
  font-weight: 700;
  color: #0d9488;
}

.stat-label {
  font-size: 14px;
  color: #94a3b8;
}

/* 文章列表 */
.article-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.article-item {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 28px 32px;
  background: #fff;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid #e2e8f0;
}

.article-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.1);
  border-color: #0d9488;
}

.article-content {
  flex: 1;
}

.article-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
  font-size: 13px;
  color: #64748b;
}

.category-tag {
  display: inline-block;
  padding: 4px 12px;
  background: linear-gradient(135deg, rgba(13, 148, 136, 0.1), rgba(8, 145, 178, 0.1));
  color: #0d9488;
  border-radius: 20px;
  font-weight: 500;
}

.article-date,
.article-views {
  display: flex;
  align-items: center;
  gap: 4px;
}

.article-title {
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 12px;
  line-height: 1.4;
  transition: color 0.2s ease;
}

.article-item:hover .article-title {
  color: #0d9488;
}

.article-summary {
  font-size: 15px;
  color: #475569;
  line-height: 1.7;
  margin: 0 0 16px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.article-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-item {
  font-size: 13px;
  color: #0d9488;
  background: rgba(13, 148, 136, 0.08);
  padding: 4px 10px;
  border-radius: 12px;
}

.article-arrow {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  transition: all 0.2s ease;
}

.article-item:hover .article-arrow {
  color: #0d9488;
  transform: translateX(4px);
}

/* 加载更多 */
.load-more {
  text-align: center;
  margin-top: 32px;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 80px 0;
}

.empty-text {
  font-size: 18px;
  color: #475569;
  margin: 16px 0 8px;
}

.empty-desc {
  font-size: 14px;
  color: #94a3b8;
  margin: 0;
}

/* 响应式 */
@media (max-width: 768px) {
  .page-title {
    font-size: 32px;
  }

  .header-stats {
    gap: 32px;
  }

  .article-item {
    flex-direction: column;
    align-items: flex-start;
    padding: 24px;
  }

  .article-arrow {
    display: none;
  }
}
</style>
