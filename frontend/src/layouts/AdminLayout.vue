<template>
  <div class="admin-layout">
    <!-- 移动端遮罩层 -->
    <transition name="fade">
      <div v-if="sidebarOpen" class="sidebar-mask" @click="sidebarOpen = false"></div>
    </transition>

    <!-- 左侧导航栏 -->
    <aside class="admin-sidebar" :class="{ open: sidebarOpen }">
      <!-- Logo 区域 -->
      <div class="sidebar-header">
        <div class="logo-wrapper">
          <el-icon :size="22" color="#fff"><DataLine /></el-icon>
        </div>
        <span class="logo-text">博客管理</span>
        <!-- 刷新按钮：点击手动刷新评论统计等数据 -->
        <div
          class="sidebar-refresh"
          :title="statsLoading ? '正在刷新...' : '刷新数据'"
          @click="refreshStats"
        >
          <el-icon :size="16" :class="{ rotating: statsLoading }">
            <RefreshRight />
          </el-icon>
        </div>
      </div>

      <!-- 导航菜单 -->
      <nav class="sidebar-nav">
        <!-- 内容管理分组 -->
        <div class="nav-group">
          <div class="nav-group-title">内容管理</div>
          <router-link
            v-for="item in contentMenu"
            :key="item.path"
            :to="item.path"
            class="nav-item"
            active-class="active"
            @click="sidebarOpen = false"
          >
            <el-icon><component :is="item.icon" /></el-icon>
            <span>{{ item.label }}</span>
            <!-- 评论管理：显示待审核数量徽章（有待审核或加载中时显示） -->
            <span
              v-if="item.label === '评论管理' && (pendingComments > 0 || statsLoading)"
              class="nav-badge"
              :class="{ 'is-loading': statsLoading && pendingComments === 0 }"
            >
              <span v-if="pendingComments > 0">{{
                pendingComments > 99 ? '99+' : pendingComments
              }}</span>
              <span v-else>!</span>
            </span>
          </router-link>
        </div>

        <!-- 系统分组 -->
        <div class="nav-group">
          <div class="nav-group-title">系统</div>
          <router-link
            v-for="item in systemMenu"
            :key="item.path"
            :to="item.path"
            class="nav-item"
            active-class="active"
            @click="sidebarOpen = false"
          >
            <el-icon><component :is="item.icon" /></el-icon>
            <span>{{ item.label }}</span>
          </router-link>
        </div>
      </nav>

      <!-- 底部返回首页 -->
      <div class="sidebar-footer">
        <router-link to="/" class="back-to-site">
          <el-icon><House /></el-icon>
          <span>返回首页</span>
        </router-link>
      </div>
    </aside>

    <!-- 右侧主区域 -->
    <div class="admin-main">
      <!-- 顶部导航栏 -->
      <header class="admin-header">
        <div class="header-left">
          <!-- 移动端菜单按钮 -->
          <el-icon class="menu-toggle" @click="sidebarOpen = true"><Expand /></el-icon>
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/admin' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item>{{ route.meta.title }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <el-dropdown trigger="click" @command="handleCommand">
            <div class="user-dropdown">
              <img
                v-if="userStore.avatar_url"
                :src="userStore.avatar_url"
                class="avatar-img"
                alt="头像"
              />
              <div v-else class="avatar">{{ userStore.username?.[0]?.toUpperCase() }}</div>
              <span class="username">{{ userStore.username }}</span>
              <el-icon class="arrow"><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">
                  <el-icon><User /></el-icon>个人中心
                </el-dropdown-item>
                <el-dropdown-item command="logout" divided>
                  <el-icon><SwitchButton /></el-icon>退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <!-- 主内容区（带路由过渡动画） -->
      <main class="admin-content">
        <router-view v-slot="{ Component }">
          <transition name="route-fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<script setup>
/**
 * @file AdminLayout.vue
 * @description 后台管理布局组件
 * 作用：提供固定左侧导航栏 + 顶部面包屑 + 主内容区的整体布局，
 *       支持移动端侧边栏折叠展开，路由切换带淡入淡出过渡动画。
 * 依赖：useUserStore（用户信息）、vue-router（路由导航）
 */
import { ref, markRaw, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '../stores/user';
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus';
import { getCommentStats } from '../api/comments';
import {
  DataLine,
  Monitor,
  Document,
  Folder,
  PriceTag,
  TrendCharts,
  Setting,
  House,
  User,
  SwitchButton,
  ArrowDown,
  ChatDotRound,
  Link,
  Expand,
  RefreshRight,
  Headset,
  Picture,
  Delete,
  Tickets
} from '@element-plus/icons-vue';

const userStore = useUserStore();
const router = useRouter();
const route = useRoute();

/** 移动端侧边栏是否展开 */
const sidebarOpen = ref(false);

/** 待审核评论数量 */
const pendingComments = ref(0);

/** 评论总数（含各状态） */
const totalComments = ref(0);

/** 统计加载中状态 */
const statsLoading = ref(false);

/** 定时刷新定时器ID */
let statsTimer = null;

/** 自动刷新是否已暂停（因限流等原因） */
let autoRefreshPaused = false;

/** 上次待审核数量（用于检测变化并弹窗通知） */
let lastPendingCount = -1;

/**
 * 获取评论统计数据
 * 立即获取一次，之后每15秒自动刷新
 * 遇到 429 限流时自动停止定时器，避免持续报错
 */
async function fetchCommentStats() {
  statsLoading.value = true;
  try {
    const res = await getCommentStats();
    autoRefreshPaused = false;

    if (res.code === 200 && res.data) {
      const newPending = res.data.pending || 0;
      const newTotal =
        (res.data.pending || 0) + (res.data.approved || 0) + (res.data.rejected || 0);

      pendingComments.value = newPending;
      totalComments.value = newTotal;

      // 首次加载：如果有待审核评论，显示欢迎通知
      if (lastPendingCount === -1 && newPending > 0) {
        ElNotification({
          title: '📬 评论待审核',
          message: `当前有 ${newPending} 条评论等待审核，请到评论管理处理`,
          type: 'warning',
          duration: 6000,
          onClick: () => {
            router.push('/admin/comments');
          }
        });
      } else if (newPending > lastPendingCount && lastPendingCount >= 0) {
        // 新增评论时弹窗通知
        const diff = newPending - lastPendingCount;
        ElNotification({
          title: '📬 新评论待审核',
          message: `有 ${diff} 条新评论等待审核，请及时处理`,
          type: 'warning',
          duration: 5000,
          onClick: () => {
            router.push('/admin/comments');
          }
        });
      }
      lastPendingCount = newPending;
    } else {
      console.warn('[评论统计] 接口返回异常:', res?.message || '未知错误');
    }
  } catch (e) {
    // 429 限流：停止自动刷新，提示用户
    if (e?.response?.status === 429) {
      if (!autoRefreshPaused) {
        autoRefreshPaused = true;
        stopStatsTimer();
        ElNotification({
          title: '⏱️ 自动刷新已暂停',
          message: '评论统计请求过于频繁，已自动暂停轮询。点击刷新按钮可手动刷新。',
          type: 'info',
          duration: 4000
        });
      }
    } else {
      console.error('[评论统计] 获取失败:', e?.message);
    }
  } finally {
    statsLoading.value = false;
  }
}

/**
 * 停止评论统计定时刷新
 */
function stopStatsTimer() {
  if (statsTimer) {
    clearInterval(statsTimer);
    statsTimer = null;
  }
}

/**
 * 启动评论统计定时刷新
 * 每 30 秒自动获取一次，仅在页面可见时轮询
 */
function startStatsTimer() {
  stopStatsTimer();
  statsTimer = setInterval(() => {
    if (!autoRefreshPaused && document.visibilityState === 'visible') {
      fetchCommentStats();
    }
  }, 30000);
}

/**
 * 页面可见性变化回调：恢复可见时立即刷新一次
 */
function handleVisibilityChange() {
  if (document.visibilityState === 'visible' && !autoRefreshPaused) {
    fetchCommentStats();
  }
}

/**
 * 手动刷新评论统计
 * 同时重启自动刷新定时器（如果因限流被暂停）
 */
function refreshStats() {
  if (autoRefreshPaused) {
    autoRefreshPaused = false;
    startStatsTimer();
  }
  fetchCommentStats();
  ElMessage.success('正在刷新评论统计...');
}

onMounted(() => {
  fetchCommentStats();
  startStatsTimer();
  document.addEventListener('visibilitychange', handleVisibilityChange);
});

onUnmounted(() => {
  stopStatsTimer();
  document.removeEventListener('visibilitychange', handleVisibilityChange);
});

/** 内容管理菜单项（markRaw 避免图标组件被转为响应式） */
const contentMenu = [
  { path: '/admin/dashboard', label: '仪表盘', icon: markRaw(Monitor) },
  { path: '/admin/articles', label: '文章管理', icon: markRaw(Document) },
  { path: '/admin/categories', label: '分类管理', icon: markRaw(Folder) },
  { path: '/admin/tags', label: '标签管理', icon: markRaw(PriceTag) },
  { path: '/admin/comments', label: '评论管理', icon: markRaw(ChatDotRound) },
  { path: '/admin/links', label: '友链管理', icon: markRaw(Link) },
  { path: '/admin/music', label: '音乐管理', icon: markRaw(Headset) },
  { path: '/admin/media', label: '媒体库', icon: markRaw(Picture) },
  { path: '/admin/trash', label: '回收站', icon: markRaw(Delete) }
];

/** 系统菜单项 */
const systemMenu = [
  { path: '/admin/statistics', label: '数据统计', icon: markRaw(TrendCharts) },
  { path: '/admin/logs', label: '操作日志', icon: markRaw(Tickets) },
  { path: '/admin/settings', label: '系统设置', icon: markRaw(Setting) },
  { path: '/admin/profile', label: '个人中心', icon: markRaw(User) }
];

/**
 * 处理用户下拉菜单命令
 * @param {string} command - 命令标识（profile / logout）
 */
async function handleCommand(command) {
  if (command === 'logout') {
    try {
      await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      });
      userStore.logout();
      ElMessage.success('已退出登录');
      router.push('/login');
    } catch {
      // 用户取消退出
    }
  } else if (command === 'profile') {
    router.push('/admin/profile');
  }
}
</script>

<style scoped>
/* ========== 管理后台黑红暗色主题 ========== */
.admin-layout {
  --admin-bg: #0a0e1a;
  --admin-card: #121828;
  --admin-hover: #1a2035;
  --admin-border: #1e293b;
  --admin-text: #f1f5f9;
  --admin-text-secondary: #94a3b8;
  --admin-text-tertiary: #64748b;
  --admin-primary: #dc2626;
  --admin-primary-light: #f87171;
  --admin-primary-dark: #991b1b;
  --admin-shadow: rgba(0, 0, 0, 0.3);
}

/* ========== 布局主容器 ========== */
.admin-layout {
  display: flex;
  min-height: 100vh;
  background: var(--admin-bg);
}

/* ========== 移动端遮罩 ========== */
.sidebar-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 99;
}

/* ========== 左侧导航栏 ========== */
.admin-sidebar {
  width: 220px;
  background: linear-gradient(180deg, #0c1220 0%, #060912 100%);
  display: flex;
  flex-direction: column;
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: 100;
  transition: transform 0.3s var(--ease-out);
  border-right: 1px solid var(--admin-border);
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.logo-wrapper {
  width: 38px;
  height: 38px;
  background: linear-gradient(135deg, var(--admin-primary) 0%, #991b1b 100%);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 14px rgba(220, 38, 38, 0.35);
}

.logo-text {
  color: #fff;
  font-size: 17px;
  font-weight: 600;
}

.sidebar-nav {
  flex: 1;
  padding: 16px 12px;
  overflow-y: auto;
}

.nav-group {
  margin-bottom: 24px;
}

.nav-group-title {
  font-size: 11px;
  font-weight: 600;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 1px;
  padding: 0 12px 8px;
}

/* 导航项 */
.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  color: #94a3b8;
  text-decoration: none;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s var(--ease-out);
  margin-bottom: 2px;
}

.nav-item:hover {
  color: #f1f5f9;
  background: rgba(220, 38, 38, 0.08);
}

.nav-item.active {
  color: #fff;
  background: linear-gradient(135deg, rgba(220, 38, 38, 0.25), rgba(153, 27, 27, 0.15));
  box-shadow: 0 4px 14px rgba(220, 38, 38, 0.2);
}

/* 激活态左侧指示条 */
.nav-item.active::before {
  content: '';
  width: 3px;
  height: 16px;
  background: linear-gradient(180deg, var(--admin-primary), #f87171);
  border-radius: 2px;
  margin-right: -6px;
}

/* 待审核评论徽章 */
.nav-badge {
  margin-left: auto;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  background: linear-gradient(135deg, #dc2626, #f87171);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  line-height: 18px;
  text-align: center;
  border-radius: 9px;
  box-shadow: 0 0 8px rgba(220, 38, 38, 0.4);
  transition: all 0.3s var(--ease-out);
}

/* 加载中状态：脉冲动画 */
.nav-badge.is-loading {
  background: linear-gradient(135deg, #64748b, #94a3b8);
  animation: badge-pulse 1.5s ease-in-out infinite;
}

@keyframes badge-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* 侧边栏刷新按钮 */
.sidebar-refresh {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin-left: auto;
  color: #64748b;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s var(--ease-out);
}

.sidebar-refresh:hover {
  color: var(--primary-light);
  background: rgba(220, 38, 38, 0.1);
}

.sidebar-refresh .rotating {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.sidebar-footer {
  padding: 16px 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.back-to-site {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  color: #94a3b8;
  text-decoration: none;
  border-radius: var(--radius-sm);
  font-size: 13px;
  transition: all 0.2s var(--ease-out);
}

.back-to-site:hover {
  color: var(--admin-primary-light);
  background: rgba(220, 38, 38, 0.1);
}

/* ========== 右侧主区域 ========== */
.admin-main {
  flex: 1;
  margin-left: 220px;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.admin-header {
  background: var(--admin-card);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  height: 60px;
  border-bottom: 1px solid var(--admin-border);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  position: sticky;
  top: 0;
  z-index: 50;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 面包屑文字颜色 */
:deep(.el-breadcrumb__item) {
  color: var(--admin-text-secondary);
}

:deep(.el-breadcrumb__inner) {
  color: var(--admin-text-secondary) !important;
}

:deep(.el-breadcrumb__inner.is-link:hover) {
  color: var(--admin-primary-light) !important;
}

:deep(.el-breadcrumb__separator) {
  color: var(--admin-text-tertiary) !important;
}

/* 移动端菜单按钮（默认隐藏） */
.menu-toggle {
  font-size: 20px;
  color: var(--admin-text-secondary);
  cursor: pointer;
  display: none;
}

.menu-toggle:hover {
  color: var(--admin-primary);
}

.header-right {
  display: flex;
  align-items: center;
}

.user-dropdown {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 24px;
  transition: background 0.2s var(--ease-out);
}

.user-dropdown:hover {
  background: var(--admin-hover);
}

.avatar,
.avatar-img {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  flex-shrink: 0;
}

.avatar {
  background: linear-gradient(135deg, var(--admin-primary) 0%, #991b1b 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 600;
  font-size: 14px;
}

.avatar-img {
  object-fit: cover;
}

.username {
  font-size: 14px;
  font-weight: 500;
  color: var(--admin-text);
}

.arrow {
  color: var(--admin-text-tertiary);
  font-size: 12px;
}

.admin-content {
  flex: 1;
  padding: 24px 32px;
}

/* ========== 路由切换过渡动画 ========== */
.route-fade-enter-active {
  transition:
    opacity 0.25s var(--ease-out),
    transform 0.25s var(--ease-out);
}

.route-fade-leave-active {
  transition: opacity 0.15s var(--ease-out);
}

.route-fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.route-fade-leave-to {
  opacity: 0;
}

/* ========== 遮罩淡入淡出 ========== */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s var(--ease-out);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ========== 响应式 ========== */
@media (max-width: 1024px) {
  .admin-sidebar {
    width: 200px;
  }

  .admin-main {
    margin-left: 200px;
  }

  .admin-content {
    padding: 20px;
  }
}

@media (max-width: 768px) {
  /* 移动端侧边栏默认收起 */
  .admin-sidebar {
    transform: translateX(-100%);
  }

  .admin-sidebar.open {
    transform: translateX(0);
  }

  .admin-main {
    margin-left: 0;
  }

  .menu-toggle {
    display: block;
  }

  .admin-header {
    padding: 0 16px;
  }

  .admin-content {
    padding: 16px;
  }

  .username {
    display: none;
  }
}
</style>
