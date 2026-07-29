<template>
  <div v-loading="loading" class="article-detail">
    <!-- 返回按钮 -->
    <div class="back-bar">
      <button class="back-btn" @click="goBack">
        <el-icon><ArrowLeft /></el-icon>
        <span>返回列表</span>
      </button>
    </div>

    <!-- 文章内容 -->
    <article v-if="article" class="article-content">
      <!-- 文章头部 -->
      <header class="article-header">
        <div class="article-meta">
          <router-link
            v-if="article.category_slug"
            :to="`/category/${article.category_slug}`"
            class="category-tag"
          >
            {{ article.category_name }}
          </router-link>
          <span class="article-date">
            <el-icon><Clock /></el-icon>
            {{ formatDate(article.created_at) }}
          </span>
          <span class="article-views">
            <el-icon><View /></el-icon>
            {{ article.view_count }} 阅读
          </span>
        </div>
        <h1 class="article-title">{{ article.title }}</h1>
        <div v-if="article.tags?.length" class="article-tags">
          <router-link
            v-for="tag in article.tags"
            :key="tag.id"
            :to="`/tag/${tag.slug}`"
            class="tag-item"
          >
            #{{ tag.name }}
          </router-link>
        </div>
      </header>

      <!-- 文章正文 -->
      <div class="article-body" v-html="renderedContent"></div>

      <!-- 文章底部 -->
      <footer class="article-footer">
        <div class="prev-next">
          <router-link
            v-if="article.prev_article"
            :to="`/article/${article.prev_article.id}`"
            class="nav-link prev"
          >
            <el-icon><ArrowLeft /></el-icon>
            <span>{{ article.prev_article.title }}</span>
          </router-link>
          <router-link
            v-if="article.next_article"
            :to="`/article/${article.next_article.id}`"
            class="nav-link next"
          >
            <span>{{ article.next_article.title }}</span>
            <el-icon><ArrowRight /></el-icon>
          </router-link>
        </div>
      </footer>
    </article>

    <!-- 错误提示 -->
    <div v-if="!loading && !article" class="error-state">
      <el-icon :size="64" color="#94a3b8"><Warning /></el-icon>
      <p class="error-text">文章不存在或已被删除</p>
      <el-button type="primary" @click="goBack">返回首页</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { marked } from 'marked';
import { ArrowLeft, Clock, View, ArrowRight, Warning } from '@element-plus/icons-vue';

const route = useRoute();
const router = useRouter();

/** 文章数据 */
const article = ref(null);

/** 加载状态 */
const loading = ref(true);

/** 渲染后的内容 */
const renderedContent = computed(() => {
  if (!article.value) return '';
  return marked(article.value.content);
});

/** 格式化日期 */
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/** 加载文章详情 */
async function loadArticle() {
  loading.value = true;
  try {
    const id = route.params.id;
    const res = await fetch(`/api/articles/public/${id}`);
    const json = await res.json();
    if (json.code === 200) {
      article.value = json.data;
    }
  } catch (e) {
    console.error('加载文章失败:', e);
  } finally {
    loading.value = false;
  }
}

/** 返回列表 */
function goBack() {
  router.back();
}

onMounted(() => {
  loadArticle();
});
</script>

<style scoped>
.article-detail {
  max-width: 800px;
  margin: 0 auto;
}

/* 返回按钮 */
.back-bar {
  margin-bottom: 24px;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  color: #64748b;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.back-btn:hover {
  border-color: #0d9488;
  color: #0d9488;
}

/* 文章内容 */
.article-content {
  background: #fff;
  border-radius: 16px;
  padding: 48px;
  border: 1px solid #e2e8f0;
}

/* 文章头部 */
.article-header {
  margin-bottom: 40px;
  padding-bottom: 32px;
  border-bottom: 1px solid #e2e8f0;
}

.article-meta {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 16px;
  font-size: 14px;
  color: #64748b;
}

.category-tag {
  display: inline-block;
  padding: 4px 14px;
  background: linear-gradient(135deg, rgba(13, 148, 136, 0.1), rgba(8, 145, 178, 0.1));
  color: #0d9488;
  border-radius: 20px;
  font-weight: 500;
  text-decoration: none;
}

.category-tag:hover {
  background: linear-gradient(135deg, rgba(13, 148, 136, 0.2), rgba(8, 145, 178, 0.2));
}

.article-date,
.article-views {
  display: flex;
  align-items: center;
  gap: 4px;
}

.article-title {
  font-size: 36px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 20px;
  line-height: 1.3;
}

.article-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.tag-item {
  font-size: 14px;
  color: #0d9488;
  background: rgba(13, 148, 136, 0.08);
  padding: 6px 14px;
  border-radius: 16px;
  text-decoration: none;
  transition: all 0.2s ease;
}

.tag-item:hover {
  background: rgba(13, 148, 136, 0.15);
}

/* 文章正文 */
.article-body {
  font-size: 17px;
  line-height: 1.8;
  color: #334155;
}

.article-body :deep(h1) {
  font-size: 32px;
  margin: 48px 0 24px;
  padding-bottom: 12px;
  border-bottom: 2px solid #e2e8f0;
}

.article-body :deep(h2) {
  font-size: 26px;
  margin: 40px 0 20px;
}

.article-body :deep(h3) {
  font-size: 22px;
  margin: 32px 0 16px;
}

.article-body :deep(p) {
  margin: 16px 0;
}

.article-body :deep(ul),
.article-body :deep(ol) {
  padding-left: 24px;
  margin: 16px 0;
}

.article-body :deep(li) {
  margin: 8px 0;
}

.article-body :deep(code) {
  background: #f1f5f9;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 15px;
}

.article-body :deep(pre) {
  background: #1e293b;
  color: #e2e8f0;
  padding: 20px;
  border-radius: 12px;
  overflow-x: auto;
  margin: 24px 0;
}

.article-body :deep(pre code) {
  background: transparent;
  padding: 0;
  color: inherit;
}

.article-body :deep(blockquote) {
  border-left: 4px solid #0d9488;
  padding: 16px 24px;
  background: rgba(13, 148, 136, 0.05);
  border-radius: 0 8px 8px 0;
  margin: 24px 0;
}

/* 文章底部 */
.article-footer {
  margin-top: 48px;
  padding-top: 32px;
  border-top: 1px solid #e2e8f0;
}

.prev-next {
  display: flex;
  justify-content: space-between;
  gap: 24px;
}

.nav-link {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px;
  background: #f8fafc;
  border-radius: 12px;
  text-decoration: none;
  color: #475569;
  transition: all 0.2s ease;
}

.nav-link:hover {
  background: #f1f5f9;
  color: #0d9488;
}

.nav-link span {
  font-weight: 500;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.nav-link.next {
  flex-direction: row-reverse;
  text-align: right;
}

/* 错误状态 */
.error-state {
  text-align: center;
  padding: 80px 0;
}

.error-text {
  font-size: 16px;
  color: #475569;
  margin: 16px 0 24px;
}

/* 响应式 */
@media (max-width: 768px) {
  .article-content {
    padding: 32px 24px;
  }

  .article-title {
    font-size: 28px;
  }

  .prev-next {
    flex-direction: column;
  }
}
</style>
