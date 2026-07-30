/**
 * @file Favorites.vue
 * @description 我的收藏页面 - 展示用户收藏的文章列表
 *
 * 功能：
 * - 分页展示用户收藏的文章
 * - 显示收藏时间、文章标题、摘要
 * - 支持取消收藏操作
 * - 点击跳转文章详情
 *
 * 权限：需要登录才能访问
 */
<template>
  <div ref="rootRef" class="favorites-page">
    <!-- ============ Hero 区域 ============ -->
    <section class="hero">
      <div class="hero-inner">
        <p class="hero-eyebrow animate-fade-in-down">FAVORITES</p>
        <h1 class="hero-title animate-fade-in-up">我的收藏</h1>
        <p class="hero-tagline animate-fade-in-up delay-100">
          共 {{ total }} 篇收藏文章
        </p>
      </div>
      <div class="hero-orb" aria-hidden="true"></div>
    </section>

    <!-- ============ 收藏列表 ============ -->
    <div class="content-wrapper">
      <!-- 加载骨架 -->
      <div v-if="loading && favorites.length === 0" class="skeleton-list">
        <div v-for="n in 5" :key="n" class="skeleton-card">
          <div class="skeleton-cover"></div>
          <div class="skeleton-content">
            <div class="skeleton-title"></div>
            <div class="skeleton-text"></div>
            <div class="skeleton-text short"></div>
          </div>
        </div>
      </div>

      <!-- 收藏列表 -->
      <div v-else-if="favorites.length > 0" class="favorites-grid">
        <article
          v-for="(article, index) in favorites"
          :key="article.id"
          class="favorite-card reveal"
          :style="{ '--row-index': index }"
        >
          <!-- 封面图 -->
          <div class="card-cover" @click="goToArticle(article.id)">
            <img
              v-if="article.cover_image"
              :src="article.cover_image"
              :alt="article.title"
              loading="lazy"
            />
            <div v-else class="cover-placeholder">
              <el-icon :size="32"><Document /></el-icon>
            </div>
          </div>

          <!-- 内容区 -->
          <div class="card-content">
            <h3 class="card-title" @click="goToArticle(article.id)">
              {{ article.title }}
            </h3>
            <p class="card-excerpt">{{ article.summary || '暂无摘要' }}</p>
            <div class="card-meta">
              <span class="meta-item">
                <el-icon><Clock /></el-icon>
                {{ formatDate(article.favorited_at) }} 收藏
              </span>
              <span class="meta-item">
                <el-icon><View /></el-icon>
                {{ article.view_count || 0 }} 阅读
              </span>
            </div>
          </div>

          <!-- 取消收藏按钮 -->
          <button
            class="unfav-btn"
            title="取消收藏"
            @click.stop="handleUnfavorite(article.id)"
          >
            <el-icon><StarFilled /></el-icon>
          </button>
        </article>
      </div>

      <!-- 空状态 -->
      <div v-else class="empty-state">
        <el-icon :size="64" class="empty-icon"><Star /></el-icon>
        <p class="empty-title">暂无收藏</p>
        <p class="empty-desc">浏览文章时点击收藏按钮，即可在这里查看</p>
        <router-link to="/" class="empty-btn">去浏览文章</router-link>
      </div>

      <!-- 分页 -->
      <div v-if="total > pageSize" class="pagination">
        <el-pagination
          v-model:current-page="currentPage"
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
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Document, Clock, View, Star, StarFilled } from '@element-plus/icons-vue';
import { getFavorites, toggleFavorite } from '@/api/favorites';
import { useUserStore } from '@/stores/user';

const router = useRouter();
const userStore = useUserStore();

// 状态
const loading = ref(false);
const favorites = ref([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(10);
const rootRef = ref(null);

/**
 * 加载收藏列表
 */
async function loadFavorites() {
  // 检查登录状态
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录');
    router.push('/login?redirect=/favorites');
    return;
  }

  loading.value = true;
  try {
    const res = await getFavorites({
      page: currentPage.value,
      page_size: pageSize.value
    });
    favorites.value = res.data.data.list;
    total.value = res.data.data.total;
  } catch (e) {
    console.error('加载收藏列表失败：', e);
    if (e.response?.status === 401) {
      ElMessage.error('登录已过期，请重新登录');
      router.push('/login?redirect=/favorites');
    }
  } finally {
    loading.value = false;
  }
}

/**
 * 取消收藏
 * @param {number} articleId - 文章ID
 */
async function handleUnfavorite(articleId) {
  try {
    await ElMessageBox.confirm('确定要取消收藏这篇文章吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    });

    await toggleFavorite(articleId);
    ElMessage.success('已取消收藏');
    // 从列表中移除
    favorites.value = favorites.value.filter((a) => a.id !== articleId);
    total.value--;
  } catch (e) {
    if (e !== 'cancel') {
      console.error('取消收藏失败：', e);
      ElMessage.error('操作失败，请重试');
    }
  }
}

/**
 * 跳转文章详情
 * @param {number} id - 文章ID
 */
function goToArticle(id) {
  router.push(`/article/${id}`);
}

/**
 * 格式化日期
 * @param {string} dateStr - ISO 日期字符串
 * @returns {string} 格式化后的日期
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

/**
 * 分页切换
 * @param {number} page - 页码
 */
function handlePageChange(page) {
  currentPage.value = page;
  loadFavorites();
}

/**
 * 滚动揭示动画
 */
function setupScrollReveal() {
  if (!rootRef.value) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    },
    { threshold: 0.1 }
  );

  rootRef.value.querySelectorAll('.reveal').forEach((el) => {
    observer.observe(el);
  });

  return observer;
}

let observer = null;

onMounted(() => {
  loadFavorites();
  setTimeout(() => {
    observer = setupScrollReveal();
  }, 100);
});

onUnmounted(() => {
  if (observer) observer.disconnect();
});
</script>

<style scoped>
/* ========== Hero 区域 ========== */
.favorites-page {
  min-height: 100vh;
  background: #0a0a0f;
}

.hero {
  position: relative;
  padding: 80px 24px 60px;
  text-align: center;
  overflow: hidden;
}

.hero-inner {
  position: relative;
  z-index: 1;
}

.hero-eyebrow {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 4px;
  color: #c62828;
  margin-bottom: 16px;
}

.hero-title {
  font-size: 48px;
  font-weight: 700;
  color: #fff;
  margin: 0 0 16px;
  letter-spacing: -1px;
}

.hero-tagline {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
}

.hero-orb {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(198, 40, 40, 0.15) 0%, transparent 70%);
  pointer-events: none;
}

/* ========== 内容区 ========== */
.content-wrapper {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px 80px;
}

/* ========== 骨架屏 ========== */
.skeleton-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}

.skeleton-card {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  overflow: hidden;
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

.skeleton-cover {
  width: 100%;
  height: 160px;
  background: rgba(255, 255, 255, 0.05);
}

.skeleton-content {
  padding: 16px;
}

.skeleton-title {
  width: 70%;
  height: 20px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  margin-bottom: 12px;
}

.skeleton-text {
  width: 100%;
  height: 14px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  margin-bottom: 8px;
}

.skeleton-text.short {
  width: 60%;
}

@keyframes skeleton-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* ========== 收藏列表 ========== */
.favorites-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}

.favorite-card {
  position: relative;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  overflow: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  opacity: 0;
  transform: translateY(20px);
}

.favorite-card.visible {
  opacity: 1;
  transform: translateY(0);
}

.favorite-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(198, 40, 40, 0.1);
  border-color: rgba(198, 40, 40, 0.2);
}

.card-cover {
  position: relative;
  width: 100%;
  height: 160px;
  overflow: hidden;
  cursor: pointer;
}

.card-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.favorite-card:hover .card-cover img {
  transform: scale(1.05);
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  color: rgba(255, 255, 255, 0.2);
}

.card-content {
  padding: 16px;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  margin: 0 0 8px;
  cursor: pointer;
  transition: color 0.2s ease;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-title:hover {
  color: #c62828;
}

.card-excerpt {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.6;
  margin: 0 0 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.unfav-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: rgba(198, 40, 40, 0.9);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease, background 0.2s ease;
  opacity: 0;
}

.favorite-card:hover .unfav-btn {
  opacity: 1;
}

.unfav-btn:hover {
  transform: scale(1.1);
  background: #c62828;
}

/* ========== 空状态 ========== */
.empty-state {
  text-align: center;
  padding: 80px 24px;
}

.empty-icon {
  color: rgba(255, 255, 255, 0.1);
  margin-bottom: 24px;
}

.empty-title {
  font-size: 20px;
  font-weight: 600;
  color: #fff;
  margin: 0 0 8px;
}

.empty-desc {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
  margin: 0 0 24px;
}

.empty-btn {
  display: inline-block;
  padding: 12px 24px;
  background: linear-gradient(135deg, #c62828 0%, #8e0000 100%);
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  border-radius: 8px;
  text-decoration: none;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.empty-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(198, 40, 40, 0.3);
}

/* ========== 分页 ========== */
.pagination {
  display: flex;
  justify-content: center;
  margin-top: 48px;
}

/* ========== 响应式 ========== */
@media (max-width: 768px) {
  .hero-title {
    font-size: 32px;
  }

  .favorites-grid {
    grid-template-columns: 1fr;
  }
}

/* ========== 动画 ========== */
.animate-fade-in-up {
  animation: fadeInUp 0.6s ease forwards;
}

.animate-fade-in-down {
  animation: fadeInDown 0.6s ease forwards;
}

.delay-100 {
  animation-delay: 0.1s;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>