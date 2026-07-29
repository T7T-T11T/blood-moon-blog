<template>
  <div class="category-page">
    <!-- 分类信息 -->
    <div v-if="category" class="category-header">
      <h1 class="category-name">{{ category.name }}</h1>
      <p v-if="category.description" class="category-desc">{{ category.description }}</p>
      <span class="article-count">{{ pagination.total }} 篇文章</span>
    </div>

    <!-- 文章列表 -->
    <div v-else-if="articles.length" class="article-list">
      <article
        v-for="(article, index) in articles"
        :key="article.id"
        class="article-item animate-fade-in-up"
        :style="{ animationDelay: index * 80 + 'ms' }"
        @click="goToArticle(article.id)"
      >
        <div class="article-content">
          <h2 class="article-title">{{ article.title }}</h2>
          <p class="article-summary">{{ article.summary }}</p>
          <div class="article-meta">
            <span>{{ formatDate(article.created_at) }}</span>
            <span>·</span>
            <span>{{ article.view_count }} 阅读</span>
          </div>
        </div>
      </article>
    </div>

    <!-- 分页 -->
    <div v-if="pagination.total_pages > 1" class="pagination">
      <el-pagination
        v-model:current-page="pagination.page"
        :page-size="pagination.page_size"
        :total="pagination.total"
        layout="prev, pager, next"
        @current-change="handlePageChange"
      />
    </div>

    <!-- 空状态 -->
    <div v-if="!loading && articles.length === 0" class="empty-state">
      <el-icon :size="64" color="#94a3b8"><Document /></el-icon>
      <p class="empty-text">该分类下暂无文章</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Document } from '@element-plus/icons-vue';

const route = useRoute();
const router = useRouter();

/** 分类信息 */
const category = ref(null);

/** 文章列表 */
const articles = ref([]);

/** 加载状态 */
const loading = ref(false);

/** 分页信息 */
const pagination = ref({
  page: 1,
  page_size: 10,
  total: 0,
  total_pages: 0
});

/** 格式化日期 */
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/** 跳转到文章详情 */
function goToArticle(id) {
  router.push(`/article/${id}`);
}

/** 加载分类文章 */
async function loadArticles() {
  loading.value = true;
  try {
    const slug = route.params.slug;
    const page = pagination.value.page;
    const url = `/api/articles/public/category/${slug}?page=${page}&page_size=${pagination.value.page_size}`;
    const res = await fetch(url);
    const json = await res.json();

    if (json.code === 200) {
      category.value = json.data.category;
      articles.value = json.data.list;
      pagination.value = json.data.pagination;
    }
  } catch (e) {
    console.error('加载失败:', e);
  } finally {
    loading.value = false;
  }
}

/** 处理分页变化 */
function handlePageChange(page) {
  pagination.value.page = page;
  loadArticles();
}

onMounted(() => {
  loadArticles();
});
</script>

<style scoped>
.category-page {
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

.category-header {
  text-align: center;
  margin-bottom: 40px;
  padding: 40px;
  background: linear-gradient(135deg, rgba(13, 148, 136, 0.1), rgba(8, 145, 178, 0.05));
  border-radius: 20px;
}

.category-name {
  font-size: 36px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 12px;
}

.category-desc {
  font-size: 16px;
  color: #64748b;
  margin: 0 0 16px;
}

.article-count {
  display: inline-block;
  padding: 6px 16px;
  background: #fff;
  color: #0d9488;
  border-radius: 20px;
  font-weight: 500;
}

.article-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.article-item {
  padding: 24px 28px;
  background: #fff;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid #e2e8f0;
}

.article-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
  border-color: #0d9488;
}

.article-title {
  font-size: 20px;
  font-weight: 600;
  color: #0f172a;
  margin: 0 0 12px;
}

.article-item:hover .article-title {
  color: #0d9488;
}

.article-summary {
  font-size: 15px;
  color: #475569;
  line-height: 1.6;
  margin: 0 0 16px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.article-meta {
  font-size: 13px;
  color: #94a3b8;
  display: flex;
  gap: 8px;
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 40px;
}

.empty-state {
  text-align: center;
  padding: 80px 0;
}

.empty-text {
  font-size: 16px;
  color: #64748b;
  margin: 16px 0 0;
}
</style>
