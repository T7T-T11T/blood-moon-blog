<template>
  <div class="dashboard-page">
    <!-- 统计卡片行 -->
    <div class="stats-row">
      <div
        v-for="(stat, index) in statCards"
        :key="stat.label"
        class="stat-card animate-fade-in-up hover-lift"
        :class="'delay-' + (index + 1) * 100"
      >
        <div class="stat-icon" :class="stat.theme">
          <el-icon :size="22"><component :is="stat.icon" /></el-icon>
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ stat.value }}</span>
          <span class="stat-label">{{ stat.label }}</span>
        </div>
      </div>
    </div>

    <!-- 双栏内容区：热门文章 + 最新文章 -->
    <div class="content-row">
      <!-- 热门文章 -->
      <section class="content-card animate-fade-in-up delay-200">
        <div class="card-header">
          <h3 class="card-title">
            <el-icon><TrendCharts /></el-icon>
            热门文章
          </h3>
          <router-link to="/admin/articles" class="view-all">查看全部</router-link>
        </div>
        <div class="card-body">
          <div v-for="(article, index) in hotArticles" :key="article.id" class="article-item">
            <span class="rank" :class="{ top: index < 3 }">{{ index + 1 }}</span>
            <div class="article-info">
              <h4 class="article-title">{{ article.title }}</h4>
              <span class="article-meta">{{ article.view_count || 0 }} 阅读</span>
            </div>
          </div>
          <div v-if="!hotArticles.length" class="empty-tip">暂无数据</div>
        </div>
      </section>

      <!-- 最新文章 -->
      <section class="content-card animate-fade-in-up delay-300">
        <div class="card-header">
          <h3 class="card-title">
            <el-icon><Clock /></el-icon>
            最新文章
          </h3>
          <router-link to="/admin/articles" class="view-all">查看全部</router-link>
        </div>
        <div class="card-body">
          <div v-for="article in latestArticles" :key="article.id" class="article-item">
            <div class="article-info">
              <h4 class="article-title">{{ article.title }}</h4>
              <span class="article-meta">{{ formatDate(article.created_at) }}</span>
            </div>
            <el-tag
              size="small"
              :type="article.status === '已发布' ? 'success' : 'info'"
              effect="plain"
            >
              {{ article.status || '草稿' }}
            </el-tag>
          </div>
          <div v-if="!latestArticles.length" class="empty-tip">暂无数据</div>
        </div>
      </section>
    </div>

    <!-- 快捷操作 -->
    <section class="quick-actions animate-fade-in-up delay-300">
      <h3 class="section-title">快捷操作</h3>
      <div class="action-grid">
        <router-link
          v-for="action in quickActions"
          :key="action.label"
          :to="action.path"
          class="action-card"
        >
          <el-icon :size="28" color="var(--primary)"><component :is="action.icon" /></el-icon>
          <span>{{ action.label }}</span>
          <span v-if="action.label === '评论管理' && pendingComments > 0" class="badge">{{
            pendingComments
          }}</span>
        </router-link>
      </div>
    </section>

    <!-- 最近活动 + 待办提醒 -->
    <div class="content-row">
      <!-- 待办提醒 -->
      <section class="content-card animate-fade-in-up delay-300">
        <div class="card-header">
          <h3 class="card-title">
            <el-icon><Bell /></el-icon>
            待办提醒
          </h3>
        </div>
        <div class="card-body">
          <div class="todo-item">
            <div class="todo-icon comment">
              <el-icon><ChatDotSquare /></el-icon>
            </div>
            <div class="todo-info">
              <span class="todo-title">待审核评论</span>
              <span class="todo-desc">有 {{ pendingComments }} 条评论等待审核</span>
            </div>
            <router-link to="/admin/comments?status=待审核" class="todo-action">
              去处理
            </router-link>
          </div>
          <div v-if="pendingComments === 0" class="empty-tip">暂无待办事项</div>
        </div>
      </section>

      <!-- 最近活动 -->
      <section class="content-card animate-fade-in-up delay-400">
        <div class="card-header">
          <h3 class="card-title">
            <el-icon><TrendCharts /></el-icon>
            最近活动
          </h3>
          <router-link to="/admin/logs" class="view-all">查看日志</router-link>
        </div>
        <div class="card-body">
          <div v-for="log in recentLogs" :key="log.id" class="log-item">
            <div class="log-dot" :class="log.resource_type"></div>
            <div class="log-info">
              <span class="log-action">{{ log.action }}</span>
              <span class="log-user">{{ log.username }}</span>
              <span v-if="log.resource_type" class="log-resource">
                {{ getResourceLabel(log.resource_type) }}
              </span>
            </div>
            <span class="log-time">{{ formatTime(log.created_at) }}</span>
          </div>
          <div v-if="!recentLogs.length" class="empty-tip">暂无活动记录</div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
/**
 * @file Dashboard.vue
 * @description 后台仪表盘页面
 * 作用：并行加载文章/分类/标签/热门/最新数据，展示统计概览、热门与最新文章列表及快捷操作入口。
 * 依赖 API：getPublicArticles / getCategories / getTags / getHotArticles / getLatestArticles
 */
import { ref, computed, onMounted, onBeforeUnmount, markRaw } from 'vue';
import {
  Document,
  View,
  Folder,
  PriceTag,
  TrendCharts,
  Clock,
  EditPen,
  Bell,
  ChatDotSquare,
  Delete
} from '@element-plus/icons-vue';
import { getHotArticles } from '@/api/articles';
import { getDashboardStatsAPI } from '@/api/dashboard';
import { getVisitStats } from '@/api/visits';
import { getLogs } from '@/api/logs';
import { getCommentList } from '@/api/comments';
import { DataLine } from '@element-plus/icons-vue';

/** 统计数据 */
const stats = ref({ articles: 0, views: 0, categories: 0, tags: 0 });
const visitStats = ref({ today_pv: 0, today_uv: 0, total_pv: 0, total_uv: 0 });

/** 热门文章列表 */
const hotArticles = ref([]);

/** 最新文章列表 */
const latestArticles = ref([]);

/** 最近活动 */
const recentLogs = ref([]);

/** 待审核评论数 */
const pendingComments = ref(0);

/** 快捷操作项（markRaw 避免图标组件响应式包装） */
const quickActions = [
  { label: '写文章', path: '/admin/articles/add', icon: markRaw(EditPen) },
  { label: '管理分类', path: '/admin/categories', icon: markRaw(Folder) },
  { label: '管理标签', path: '/admin/tags', icon: markRaw(PriceTag) },
  { label: '评论管理', path: '/admin/comments', icon: markRaw(ChatDotSquare) },
  { label: '回收站', path: '/admin/trash', icon: markRaw(Delete) },
  { label: '系统设置', path: '/admin/settings', icon: markRaw(Bell) }
];

/** 统计卡片配置（根据 stats 计算得出） */
const statCards = computed(() => [
  { label: '总文章', value: stats.value.articles, icon: markRaw(Document), theme: 'teal' },
  { label: '总阅读', value: stats.value.views, icon: markRaw(View), theme: 'blue' },
  { label: '分类数', value: stats.value.categories, icon: markRaw(Folder), theme: 'amber' },
  { label: '标签数', value: stats.value.tags, icon: markRaw(PriceTag), theme: 'violet' },
  { label: '今日PV', value: visitStats.value.today_pv, icon: markRaw(DataLine), theme: 'green' },
  { label: '今日UV', value: visitStats.value.today_uv, icon: markRaw(View), theme: 'cyan' },
  {
    label: '总访问(PV)',
    value: visitStats.value.total_pv,
    icon: markRaw(TrendCharts),
    theme: 'indigo'
  }
]);

/**
 * 格式化日期为短日期
 * @param {string} dateStr - 后端返回的时间字符串
 * @returns {string} 格式化后的短日期
 */
function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

/**
 * 格式化时间为相对时间
 * @param {string} dateStr - 后端返回的时间字符串
 * @returns {string} 相对时间描述
 */
function formatTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`;
  return date.toLocaleDateString('zh-CN');
}

/**
 * 获取资源类型中文标签
 * @param {string} type - 资源类型
 * @returns {string} 中文标签
 */
function getResourceLabel(type) {
  const map = {
    article: '文章',
    category: '分类',
    tag: '标签',
    comment: '评论',
    link: '友链',
    music: '音乐',
    user: '用户'
  };
  return map[type] || type;
}

/**
 * 并行加载仪表盘所有数据
 * 使用 Promise.allSettled 保证单个接口失败不影响其他数据展示
 */
async function loadDashboard() {
  const [dashboardRes, hotRes, visitRes, logsRes, commentsRes] = await Promise.allSettled([
    getDashboardStatsAPI(),
    getHotArticles(5),
    getVisitStats(),
    getLogs({ page: 1, page_size: 8 }),
    getCommentList({ status: '待审核', page: 1, page_size: 1 })
  ]);

  // 仪表盘统计：文章数、总阅读、分类数、标签数、最新文章
  if (dashboardRes.status === 'fulfilled' && dashboardRes.value.code === 200) {
    const d = dashboardRes.value.data;
    stats.value.articles = d.articleStats.total;
    stats.value.views = d.articleStats.total_views;
    stats.value.categories = d.categoryCount;
    stats.value.tags = d.tagCount;
    latestArticles.value = d.latestArticles || [];
  }

  // 热门文章
  if (hotRes.status === 'fulfilled' && hotRes.value.code === 200) {
    hotArticles.value = hotRes.value.data || [];
  }

  // 访问统计
  if (visitRes.status === 'fulfilled' && visitRes.value.code === 200) {
    visitStats.value = visitRes.value.data;
  }

  // 最近活动
  if (logsRes.status === 'fulfilled' && logsRes.value.code === 200) {
    recentLogs.value = logsRes.value.data?.list || [];
  }

  // 待审核评论数
  if (commentsRes.status === 'fulfilled' && commentsRes.value.code === 200) {
    pendingComments.value = commentsRes.value.data?.pagination?.total || 0;
  }
}

onMounted(() => {
  loadDashboard();
  // 每 30 秒轮询刷新，仅在页面可见时执行
  const dashboardTimer = setInterval(() => {
    if (document.visibilityState === 'visible') {
      loadDashboard();
    }
  }, 30000);

  // 页面恢复可见时立即刷新
  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      loadDashboard();
    }
  };
  document.addEventListener('visibilitychange', handleVisibility);

  onBeforeUnmount(() => {
    clearInterval(dashboardTimer);
    document.removeEventListener('visibilitychange', handleVisibility);
  });
});
</script>

<style scoped>
/* ========== 统计卡片行 ========== */
.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 22px 24px;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.stat-icon {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

/* 渐变主题色 */
.stat-icon.teal {
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
}
.stat-icon.blue {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
}
.stat-icon.amber {
  background: linear-gradient(135deg, #f59e0b, #d97706);
}
.stat-icon.violet {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
}

.stat-info {
  flex: 1;
  min-width: 0;
}

.stat-value {
  display: block;
  font-size: 26px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
}

.stat-label {
  font-size: 13px;
  color: var(--text-secondary);
}

/* ========== 内容卡片 ========== */
.content-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 24px;
}

.content-card {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 24px;
  border-bottom: 1px solid var(--border-light);
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.view-all {
  font-size: 13px;
  color: var(--primary);
  text-decoration: none;
  transition: color 0.2s var(--ease-out);
}

.view-all:hover {
  color: var(--primary-dark);
}

.card-body {
  padding: 12px 24px;
}

.article-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-light);
}

.article-item:last-child {
  border-bottom: none;
}

.rank {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-hover);
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  flex-shrink: 0;
}

/* 前三名高亮 */
.rank.top {
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  color: #fff;
}

.article-info {
  flex: 1;
  min-width: 0;
}

.article-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin: 0 0 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.article-meta {
  font-size: 12px;
  color: var(--text-tertiary);
}

.empty-tip {
  padding: 32px 0;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 14px;
}

/* ========== 快捷操作 ========== */
.quick-actions {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 24px;
  box-shadow: var(--shadow-sm);
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
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
  background: var(--bg-body);
  border-radius: var(--radius-md);
  text-decoration: none;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  transition: all 0.25s var(--ease-out);
}

.action-card:hover {
  background: var(--primary-bg);
  transform: translateY(-3px);
  box-shadow: var(--shadow-md);
}

/* 快捷操作徽章 */
.action-card .badge {
  position: absolute;
  top: 8px;
  right: 8px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  background: #ef4444;
  color: #fff;
  border-radius: 9px;
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pulse 2s infinite;
}

.action-card {
  position: relative;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

/* ========== 待办提醒 ========== */
.todo-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 0;
  border-bottom: 1px solid var(--border-light);
}

.todo-item:last-child {
  border-bottom: none;
}

.todo-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.todo-icon.comment {
  background: linear-gradient(135deg, #f59e0b, #d97706);
}

.todo-info {
  flex: 1;
  min-width: 0;
}

.todo-title {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.todo-desc {
  font-size: 12px;
  color: var(--text-tertiary);
}

.todo-action {
  font-size: 13px;
  color: var(--primary);
  text-decoration: none;
  flex-shrink: 0;
}

.todo-action:hover {
  color: var(--primary-dark);
}

/* ========== 最近活动 ========== */
.log-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border-light);
}

.log-item:last-child {
  border-bottom: none;
}

.log-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.log-dot.article {
  background: var(--primary);
}
.log-dot.category {
  background: #f59e0b;
}
.log-dot.tag {
  background: #8b5cf6;
}
.log-dot.comment {
  background: #10b981;
}
.log-dot.user {
  background: #3b82f6;
}
.log-dot.link {
  background: #ec4899;
}
.log-dot.music {
  background: #06b6d4;
}

.log-info {
  flex: 1;
  min-width: 0;
  font-size: 13px;
}

.log-action {
  color: var(--text-primary);
  font-weight: 500;
}

.log-user {
  color: var(--text-tertiary);
  margin: 0 4px;
}

.log-resource {
  color: var(--text-tertiary);
  font-size: 12px;
}

.log-time {
  font-size: 12px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

/* ========== 响应式 ========== */
@media (max-width: 768px) {
  .content-row {
    grid-template-columns: 1fr;
  }

  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
