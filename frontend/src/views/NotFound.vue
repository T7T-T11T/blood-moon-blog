/** * NotFound.vue - 404 页面（创意设计 + 实用导航） * * 增强内容：搜索入口、随机推荐文章列表 */
<template>
  <div class="not-found-page">
    <div class="nf-container">
      <!-- 大号 404 -->
      <h1 class="nf-code">404</h1>
      <p class="nf-title">页面不见了</p>
      <p class="nf-subtitle">
        你访问的页面{{ routePath ? `「${routePath}」` : '' }}不存在或已被移除
      </p>

      <!-- 操作按钮 -->
      <div class="nf-actions">
        <router-link to="/" class="nf-btn primary">返回首页</router-link>
        <button class="nf-btn secondary" @click="goBack">返回上一页</button>
      </div>

      <!-- 搜索入口 -->
      <div class="nf-search" @keydown.enter="doSearch">
        <el-icon class="search-icon"><Search /></el-icon>
        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="搜索文章…"
          maxlength="100"
        />
        <button class="search-btn" :disabled="!searchQuery.trim()" @click="doSearch">
          <el-icon><Search /></el-icon>
        </button>
      </div>

      <!-- 随机推荐文章 -->
      <div v-if="articles.length > 0" class="nf-articles">
        <h2 class="nf-articles-title">或许你感兴趣</h2>
        <div class="nf-article-list">
          <router-link
            v-for="article in articles"
            :key="article.id"
            :to="`/article/${article.id}`"
            class="nf-article-item"
          >
            <span class="nf-article-name">{{ article.title }}</span>
            <span class="nf-article-date">{{ formatDate(article.created_at) }}</span>
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Search } from '@element-plus/icons-vue';
import { formatDate } from '@/utils/format';
import { getPublicArticles } from '../api/articles';

const route = useRoute();
const router = useRouter();

const routePath = computed(() => {
  const p = route.path;
  return p && p !== '/404' ? p : '';
});

const searchQuery = ref('');
const articles = ref([]);

function goBack() {
  router.back();
}

function doSearch() {
  const q = searchQuery.value.trim();
  if (q) {
    router.push({ path: '/search', query: { q } });
  }
}

async function loadRecommended() {
  try {
    const { data } = await getPublicArticles({ page: 1, page_size: 6 });
    articles.value = Array.isArray(data) ? data : (data?.list ?? []);
    // 随机打乱顺序呈现
    articles.value = articles.value.sort(() => Math.random() - 0.5);
  } catch (e) {
    console.error('加载推荐文章失败:', e);
  }
}

onMounted(() => {
  loadRecommended();
});
</script>

<style scoped>
/* ========== 404 容器 ========== */
.not-found-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
  padding: 48px 24px;
}

.nf-container {
  text-align: center;
  max-width: 560px;
  width: 100%;
}

.nf-code {
  margin: 0 0 8px;
  font-size: clamp(96px, 16vw, 180px);
  font-weight: 900;
  line-height: 1;
  background: linear-gradient(
    180deg,
    var(--primary) 0%,
    var(--primary-light) 50%,
    var(--primary-dark) 100%
  );
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: -6px;
}

.nf-title {
  margin: 0 0 12px;
  font-size: clamp(22px, 3vw, 32px);
  font-weight: 700;
  color: var(--text-primary);
}

.nf-subtitle {
  margin: 0 auto 32px;
  max-width: 400px;
  font-size: 15px;
  line-height: 1.6;
  color: var(--text-tertiary);
}

/* ========== 操作按钮 ========== */
.nf-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  margin-bottom: 40px;
}

.nf-btn {
  padding: 10px 28px;
  font-size: 14px;
  font-weight: 600;
  border-radius: 24px;
  text-decoration: none;
  cursor: pointer;
  transition:
    background 0.25s var(--ease-out),
    transform 0.25s var(--ease-spring),
    box-shadow 0.25s var(--ease-out);
  border: none;
  display: inline-flex;
  align-items: center;
}

.nf-btn.primary {
  color: #fff;
  background: var(--primary);
}

.nf-btn.primary:hover {
  background: var(--primary-dark);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(220, 38, 38, 0.35);
}

.nf-btn.secondary {
  color: var(--text-secondary);
  background: var(--bg-body);
  border: 1px solid var(--border);
}

.nf-btn.secondary:hover {
  color: var(--primary);
  border-color: var(--primary);
  transform: translateY(-2px);
}

/* ========== 搜索入口 ========== */
.nf-search {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 auto 48px;
  max-width: 400px;
  padding: 10px 16px;
  background: var(--bg-body);
  border: 1px solid var(--border);
  border-radius: 28px;
  transition:
    border-color 0.25s var(--ease-out),
    box-shadow 0.25s var(--ease-out);
}

.nf-search:focus-within {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.12);
}

.search-icon {
  flex-shrink: 0;
  font-size: 16px;
  color: var(--text-tertiary);
}

.search-input {
  flex: 1;
  min-width: 0;
  height: 28px;
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
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: var(--primary);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  transition:
    background 0.25s var(--ease-out),
    transform 0.25s var(--ease-spring);
}

.search-btn:hover:not(:disabled) {
  background: var(--primary-dark);
  transform: scale(1.08);
}

.search-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ========== 推荐文章 ========== */
.nf-articles {
  margin-top: 8px;
}

.nf-articles-title {
  margin: 0 0 20px;
  font-size: 16px;
  font-weight: 700;
  color: var(--text-secondary);
  letter-spacing: 1px;
}

.nf-article-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nf-article-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 18px;
  text-decoration: none;
  border-radius: 10px;
  transition: background 0.2s var(--ease-out);
}

.nf-article-item:hover {
  background: var(--bg-body);
}

.nf-article-name {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.2s var(--ease-out);
}

.nf-article-item:hover .nf-article-name {
  color: var(--primary);
}

.nf-article-date {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--text-tertiary);
}
</style>
