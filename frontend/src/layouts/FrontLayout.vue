<template>
  <div class="front-layout">
    <!-- 左侧固定导航栏 -->
    <aside class="sidebar">
      <!-- 个人头像和简介 -->
      <div class="profile-section">
        <div class="avatar-wrapper">
          <div class="avatar">
            <el-icon :size="48"><UserFilled /></el-icon>
          </div>
          <div class="status-dot"></div>
        </div>
        <h1 class="profile-name">{{ siteConfig.author }}</h1>
        <p class="profile-title">{{ siteConfig.title }}</p>
        <p class="profile-desc">{{ siteConfig.description }}</p>
      </div>

      <!-- 分类导航 -->
      <nav class="nav-section">
        <h3 class="nav-title">分类</h3>
        <router-link
          v-for="category in categories"
          :key="category.id"
          :to="`/category/${category.slug}`"
          class="nav-item"
          active-class="active"
        >
          <el-icon><Folder /></el-icon>
          <span>{{ category.name }}</span>
          <span class="count">{{ category.article_count || 0 }}</span>
        </router-link>
      </nav>

      <!-- 标签云 -->
      <div class="tags-section">
        <h3 class="nav-title">标签</h3>
        <div class="tag-cloud">
          <router-link
            v-for="tag in tags"
            :key="tag.id"
            :to="`/tag/${tag.slug}`"
            class="tag-item"
            :style="{ fontSize: getTagSize(tag.article_count) + 'px' }"
          >
            {{ tag.name }}
          </router-link>
        </div>
      </div>

      <!-- 统计信息 -->
      <div class="stats-section">
        <div class="stat-item">
          <span class="stat-value">{{ stats.total_articles }}</span>
          <span class="stat-label">文章</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ stats.total_views }}</span>
          <span class="stat-label">阅读</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ stats.total_categories }}</span>
          <span class="stat-label">分类</span>
        </div>
      </div>

      <!-- 社交链接 -->
      <div class="social-section">
        <a
          v-for="social in siteConfig.socials"
          :key="social.name"
          :href="social.url"
          class="social-link"
          target="_blank"
        >
          <el-icon :size="20"><component :is="social.icon" /></el-icon>
        </a>
      </div>

      <!-- 登录/注册入口 -->
      <div class="auth-section">
        <router-link to="/login" class="auth-link">
          <el-icon><User /></el-icon>
          <span>登录后台</span>
        </router-link>
      </div>
    </aside>

    <!-- 右侧内容区 -->
    <main class="content-area">
      <!-- 顶部面包屑 -->
      <header class="content-header">
        <div class="breadcrumb">
          <router-link to="/" class="home-link">
            <el-icon><HomeFilled /></el-icon>
            <span>首页</span>
          </router-link>
          <template v-if="route.meta.title">
            <el-icon class="separator"><ArrowRight /></el-icon>
            <span class="current">{{ route.meta.title }}</span>
          </template>
        </div>
        <div class="search-box">
          <el-icon class="search-icon"><Search /></el-icon>
          <input
            v-model="searchKeyword"
            type="text"
            placeholder="搜索文章..."
            class="search-input"
            @keyup.enter="handleSearch"
          />
        </div>
      </header>

      <!-- 主内容 -->
      <div class="content-body">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>

      <!-- 页脚 -->
      <footer class="content-footer">
        <p>© {{ currentYear }} {{ siteConfig.author }}. Powered by Vue 3 + Node.js</p>
      </footer>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, markRaw } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import {
  UserFilled,
  Folder,
  HomeFilled,
  ArrowRight,
  Search,
  User,
  Link,
  ChatDotRound
} from '@element-plus/icons-vue';

const route = useRoute();
const router = useRouter();

/** 站点配置 */
const siteConfig = {
  author: '全栈开发者',
  title: '个人技术博客',
  description: '分享前端、后端开发经验与项目实践',
  socials: [
    { name: 'GitHub', url: 'https://github.com', icon: markRaw(Link) },
    { name: 'Email', url: 'mailto:example@email.com', icon: markRaw(ChatDotRound) }
  ]
};

/** 当前年份 */
const currentYear = new Date().getFullYear();

/** 分类列表 */
const categories = ref([]);

/** 标签列表 */
const tags = ref([]);

/** 统计数据 */
const stats = ref({
  total_articles: 0,
  total_views: 0,
  total_categories: 0
});

/** 搜索关键词 */
const searchKeyword = ref('');

/** 根据文章数量计算标签字体大小 */
function getTagSize(count) {
  if (!count) return 12;
  if (count >= 5) return 18;
  if (count >= 3) return 16;
  if (count >= 1) return 14;
  return 12;
}

/** 加载分类列表 */
async function loadCategories() {
  try {
    const res = await fetch('/api/categories?with_count=true');
    const json = await res.json();
    if (json.code === 200) {
      categories.value = json.data;
      stats.value.total_categories = json.data.length;
    }
  } catch (e) {
    console.error('加载分类失败:', e);
  }
}

/** 加载标签列表 */
async function loadTags() {
  try {
    const res = await fetch('/api/tags?with_count=true');
    const json = await res.json();
    if (json.code === 200) {
      tags.value = json.data.filter((t) => t.article_count > 0);
    }
  } catch (e) {
    console.error('加载标签失败:', e);
  }
}

/** 加载统计数据 */
async function loadStats() {
  try {
    const res = await fetch('/api/articles/public?page_size=1');
    const json = await res.json();
    if (json.code === 200) {
      stats.value.total_articles = json.data.pagination.total;
      // 计算总阅读量（简化处理）
      let totalViews = 0;
      for (const article of json.data.list) {
        totalViews += article.view_count || 0;
      }
      stats.value.total_views = totalViews;
    }
  } catch (e) {
    console.error('加载统计失败:', e);
  }
}

/** 处理搜索 */
function handleSearch() {
  if (searchKeyword.value.trim()) {
    router.push({ path: '/', query: { keyword: searchKeyword.value.trim() } });
  }
}

onMounted(() => {
  loadCategories();
  loadTags();
  loadStats();
});
</script>

<style scoped>
/* ========== 布局主容器 ========== */
.front-layout {
  display: flex;
  min-height: 100vh;
  background: #f8fafc;
}

/* ========== 左侧固定导航栏 ========== */
.sidebar {
  width: 260px;
  background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
  color: #e2e8f0;
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  padding: 40px 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

/* 个人信息区 */
.profile-section {
  text-align: center;
}

.avatar-wrapper {
  position: relative;
  display: inline-block;
}

.avatar {
  width: 96px;
  height: 96px;
  background: linear-gradient(135deg, #0d9488 0%, #0891b2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  box-shadow: 0 8px 32px rgba(13, 148, 136, 0.4);
  border: 4px solid rgba(255, 255, 255, 0.1);
}

.status-dot {
  position: absolute;
  bottom: 20px;
  right: 8px;
  width: 16px;
  height: 16px;
  background: #22c55e;
  border: 3px solid #1e293b;
  border-radius: 50%;
}

.profile-name {
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  margin: 0 0 6px;
}

.profile-title {
  font-size: 14px;
  color: #94a3b8;
  margin: 0 0 12px;
}

.profile-desc {
  font-size: 13px;
  color: #64748b;
  line-height: 1.6;
  margin: 0;
}

/* 导航区 */
.nav-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nav-title {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 0 0 12px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  color: #94a3b8;
  text-decoration: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.nav-item:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
}

.nav-item.active {
  color: #0d9488;
  background: rgba(13, 148, 136, 0.15);
}

.nav-item .count {
  margin-left: auto;
  font-size: 12px;
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 8px;
  border-radius: 10px;
}

/* 标签云 */
.tags-section {
  display: flex;
  flex-direction: column;
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-item {
  color: #94a3b8;
  text-decoration: none;
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  transition: all 0.2s ease;
}

.tag-item:hover {
  color: #0d9488;
  background: rgba(13, 148, 136, 0.15);
}

/* 统计区 */
.stats-section {
  display: flex;
  justify-content: space-around;
  padding: 20px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.stat-item {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 20px;
  font-weight: 700;
  color: #0d9488;
}

.stat-label {
  font-size: 12px;
  color: #64748b;
}

/* 社交链接 */
.social-section {
  display: flex;
  justify-content: center;
  gap: 16px;
}

.social-link {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  text-decoration: none;
  transition: all 0.2s ease;
}

.social-link:hover {
  color: #0d9488;
  background: rgba(13, 148, 136, 0.15);
}

/* 登录入口 */
.auth-section {
  margin-top: auto;
}

.auth-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px;
  color: #0d9488;
  background: rgba(13, 148, 136, 0.1);
  border: 1px solid rgba(13, 148, 136, 0.3);
  border-radius: 10px;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.auth-link:hover {
  background: rgba(13, 148, 136, 0.2);
}

/* ========== 右侧内容区 ========== */
.content-area {
  flex: 1;
  margin-left: 260px;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* 顶部面包屑 */
.content-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: rgba(248, 250, 252, 0.9);
  backdrop-filter: blur(10px);
  padding: 16px 40px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.home-link {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #64748b;
  text-decoration: none;
}

.home-link:hover {
  color: #0d9488;
}

.separator {
  color: #cbd5e1;
  font-size: 12px;
}

.current {
  color: #1e293b;
  font-weight: 500;
}

.search-box {
  display: flex;
  align-items: center;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  padding: 8px 16px;
  width: 280px;
  transition: all 0.2s ease;
}

.search-box:focus-within {
  border-color: #0d9488;
  box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.1);
}

.search-icon {
  color: #94a3b8;
  margin-right: 8px;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
  background: transparent;
}

/* 主内容 */
.content-body {
  flex: 1;
  padding: 40px;
  max-width: 900px;
  width: 100%;
  margin: 0 auto;
}

/* 页脚 */
.content-footer {
  text-align: center;
  padding: 32px;
  color: #94a3b8;
  font-size: 13px;
  border-top: 1px solid #e2e8f0;
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 响应式 */
@media (max-width: 1024px) {
  .sidebar {
    width: 220px;
  }

  .content-area {
    margin-left: 220px;
  }

  .content-body {
    padding: 24px;
  }
}

@media (max-width: 768px) {
  .front-layout {
    flex-direction: column;
  }

  .sidebar {
    position: relative;
    width: 100%;
    height: auto;
    padding: 24px;
  }

  .content-area {
    margin-left: 0;
  }

  .content-header {
    flex-direction: column;
    gap: 12px;
    padding: 16px 20px;
  }

  .search-box {
    width: 100%;
  }

  .content-body {
    padding: 20px;
  }
}
</style>
