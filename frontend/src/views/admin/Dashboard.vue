<template>
  <div class="dashboard-page">
    <!-- 统计卡片 -->
    <div class="stats-row">
      <div class="stat-card animate-fade-in-up" style="--delay: 0ms">
        <div class="stat-icon articles">
          <el-icon :size="24"><Document /></el-icon>
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.articles }}</span>
          <span class="stat-label">总文章</span>
        </div>
        <div class="stat-trend up">
          <el-icon><Top /></el-icon>
          +12%
        </div>
      </div>
      <div class="stat-card animate-fade-in-up" style="--delay: 100ms">
        <div class="stat-icon views">
          <el-icon :size="24"><View /></el-icon>
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.views }}</span>
          <span class="stat-label">总阅读</span>
        </div>
        <div class="stat-trend up">
          <el-icon><Top /></el-icon>
          +25%
        </div>
      </div>
      <div class="stat-card animate-fade-in-up" style="--delay: 200ms">
        <div class="stat-icon categories">
          <el-icon :size="24"><Folder /></el-icon>
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.categories }}</span>
          <span class="stat-label">分类数</span>
        </div>
      </div>
      <div class="stat-card animate-fade-in-up" style="--delay: 300ms">
        <div class="stat-icon comments">
          <el-icon :size="24"><ChatDotRound /></el-icon>
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.tags }}</span>
          <span class="stat-label">标签数</span>
        </div>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="content-row">
      <!-- 热门文章 -->
      <div class="card hot-articles">
        <div class="card-header">
          <h3>热门文章</h3>
          <router-link to="/admin/articles" class="view-all">查看全部</router-link>
        </div>
        <div class="card-body">
          <div v-for="(article, index) in hotArticles" :key="article.id" class="article-item">
            <span class="rank" :class="{ top: index < 3 }">{{ index + 1 }}</span>
            <div class="article-info">
              <h4 class="article-title">{{ article.title }}</h4>
              <span class="article-meta">{{ article.view_count }} 阅读</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 最新文章 -->
      <div class="card latest-articles">
        <div class="card-header">
          <h3>最新文章</h3>
          <router-link to="/admin/articles" class="view-all">查看全部</router-link>
        </div>
        <div class="card-body">
          <div v-for="article in latestArticles" :key="article.id" class="article-item">
            <div class="article-info">
              <h4 class="article-title">{{ article.title }}</h4>
              <span class="article-meta">{{ formatDate(article.created_at) }}</span>
            </div>
            <el-tag size="small" :type="article.status === '已发布' ? 'success' : 'info'">
              {{ article.status }}
            </el-tag>
          </div>
        </div>
      </div>
    </div>

    <!-- 快捷操作 -->
    <div class="quick-actions">
      <h3 class="section-title">快捷操作</h3>
      <div class="action-grid">
        <router-link to="/admin/articles/add" class="action-card">
          <el-icon :size="32" color="#0d9488"><EditPen /></el-icon>
          <span>写文章</span>
        </router-link>
        <router-link to="/admin/categories" class="action-card">
          <el-icon :size="32" color="#0d9488"><Folder /></el-icon>
          <span>管理分类</span>
        </router-link>
        <router-link to="/admin/tags" class="action-card">
          <el-icon :size="32" color="#0d9488"><PriceTag /></el-icon>
          <span>管理标签</span>
        </router-link>
        <router-link to="/admin/tasks" class="action-card">
          <el-icon :size="32" color="#0d9488"><List /></el-icon>
          <span>任务管理</span>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import {
  Document,
  View,
  Folder,
  ChatDotRound,
  Top,
  EditPen,
  PriceTag,
  List
} from '@element-plus/icons-vue';

/** 统计数据 */
const stats = ref({
  articles: 0,
  views: 0,
  categories: 0,
  tags: 0
});

/** 热门文章 */
const hotArticles = ref([]);

/** 最新文章 */
const latestArticles = ref([]);

/** 格式化日期 */
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric'
  });
}

/** 加载仪表盘数据 */
async function loadDashboard() {
  try {
    // 加载统计数据
    const [articlesRes, categoriesRes, tagsRes] = await Promise.all([
      fetch('/api/articles/public?page_size=1'),
      fetch('/api/categories?with_count=true'),
      fetch('/api/tags?with_count=true')
    ]);

    const articlesJson = await articlesRes.json();
    const categoriesJson = await categoriesRes.json();
    const tagsJson = await tagsRes.json();

    if (articlesJson.code === 200) {
      stats.value.articles = articlesJson.data.pagination.total;
      stats.value.views = articlesJson.data.list.reduce((sum, a) => sum + (a.view_count || 0), 0);
    }

    if (categoriesJson.code === 200) {
      stats.value.categories = categoriesJson.data.length;
    }

    if (tagsJson.code === 200) {
      stats.value.tags = tagsJson.data.length;
    }

    // 加载热门文章
    const hotRes = await fetch('/api/articles/public/hot?limit=5');
    const hotJson = await hotRes.json();
    if (hotJson.code === 200) {
      hotArticles.value = hotJson.data;
    }

    // 加载最新文章
    const latestRes = await fetch('/api/articles/public/latest?limit=5');
    const latestJson = await latestRes.json();
    if (latestJson.code === 200) {
      latestArticles.value = latestJson.data;
    }
  } catch (e) {
    console.error('加载仪表盘数据失败:', e);
  }
}

onMounted(() => {
  loadDashboard();
});
</script>

<style scoped>
.dashboard-page {
  animation: fade-in 0.3s ease;
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* 统计卡片 */
.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.stat-icon.articles {
  background: linear-gradient(135deg, #0d9488, #0891b2);
}

.stat-icon.views {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
}

.stat-icon.categories {
  background: linear-gradient(135deg, #f59e0b, #d97706);
}

.stat-icon.comments {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
}

.stat-info {
  flex: 1;
}

.stat-value {
  display: block;
  font-size: 28px;
  font-weight: 700;
  color: #0f172a;
}

.stat-label {
  font-size: 14px;
  color: #64748b;
}

.stat-trend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 500;
}

.stat-trend.up {
  color: #22c55e;
}

.stat-trend.down {
  color: #ef4444;
}

/* 内容区域 */
.content-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 24px;
}

.card {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #f1f5f9;
}

.card-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
  margin: 0;
}

.view-all {
  font-size: 14px;
  color: #0d9488;
  text-decoration: none;
}

.view-all:hover {
  text-decoration: underline;
}

.card-body {
  padding: 16px 24px;
}

.article-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #f1f5f9;
}

.article-item:last-child {
  border-bottom: none;
}

.rank {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1f5f9;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  flex-shrink: 0;
}

.rank.top {
  background: linear-gradient(135deg, #0d9488, #0891b2);
  color: #fff;
}

.article-info {
  flex: 1;
  min-width: 0;
}

.article-title {
  font-size: 15px;
  font-weight: 500;
  color: #0f172a;
  margin: 0 0 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.article-meta {
  font-size: 12px;
  color: #94a3b8;
}

/* 快捷操作 */
.quick-actions {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
  margin: 0 0 20px;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 16px;
}

.action-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px 16px;
  background: #f8fafc;
  border-radius: 14px;
  text-decoration: none;
  color: #475569;
  transition: all 0.3s ease;
}

.action-card:hover {
  background: linear-gradient(135deg, rgba(13, 148, 136, 0.1), rgba(8, 145, 178, 0.05));
  transform: translateY(-4px);
}

.action-card span {
  font-size: 14px;
  font-weight: 500;
}

/* 响应式 */
@media (max-width: 768px) {
  .content-row {
    grid-template-columns: 1fr;
  }

  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
