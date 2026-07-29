<template>
  <div class="app-container" :class="{ 'fullscreen-mode': isFullscreen }">
    <!-- 侧边栏（全屏模式下隐藏） -->
    <aside v-if="userStore.isLoggedIn && !isFullscreen" class="sidebar">
      <div class="sidebar-logo animate-fade-in-down">
        <div class="logo-icon">
          <el-icon :size="24"><DataLine /></el-icon>
        </div>
        <span class="logo-text">效率中心</span>
      </div>
      <nav class="sidebar-nav">
        <router-link
          v-for="(item, index) in menuItems"
          :key="item.path"
          :to="item.path"
          class="nav-item animate-fade-in-left"
          :class="{ active: $route.path === item.path }"
          :style="{ animationDelay: index * 60 + 150 + 'ms' }"
        >
          <el-icon :size="18"><component :is="item.icon" /></el-icon>
          <span class="nav-label">{{ item.label }}</span>
        </router-link>
      </nav>
      <div class="sidebar-footer animate-fade-in-up delay-500">
        <div class="user-info">
          <div class="avatar">{{ userStore.username?.[0]?.toUpperCase() }}</div>
          <div class="user-detail">
            <span class="username">{{ userStore.username }}</span>
            <span class="user-role">个人用户</span>
          </div>
        </div>
        <el-button class="logout-btn" text @click="handleLogout">
          <el-icon><SwitchButton /></el-icon>
        </el-button>
      </div>
    </aside>

    <!-- 主内容区 -->
    <div class="main-wrapper" :class="{ 'full-width': !userStore.isLoggedIn || isFullscreen }">
      <!-- 顶部导航栏 -->
      <header v-if="userStore.isLoggedIn && !isFullscreen" class="top-header">
        <div class="breadcrumb">
          <span class="page-indicator">{{ $route.meta.title }}</span>
        </div>
        <div class="header-actions">
          <el-tooltip content="回到首页">
            <el-button circle @click="$router.push('/')"
              ><el-icon><HomeFilled /></el-icon
            ></el-button>
          </el-tooltip>
        </div>
      </header>
      <main v-if="!isFullscreen" class="main-content">
        <router-view v-slot="{ Component }">
          <transition name="router-fade-up" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
      <router-view v-else />
    </div>
  </div>
</template>

<script setup>
import { computed, markRaw } from 'vue';
import { useRoute } from 'vue-router';
import { useUserStore } from './stores/user';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import {
  DataLine,
  List,
  Document,
  Timer,
  TrendCharts,
  SwitchButton,
  HomeFilled
} from '@element-plus/icons-vue';

const userStore = useUserStore();
const router = useRouter();
const route = useRoute();

/** 是否全屏模式（博客编辑页沉浸式体验） */
const isFullscreen = computed(() => route.meta.fullscreen === true);

/** 侧边栏菜单项 */
const menuItems = [
  { path: '/', label: '仪表盘', icon: markRaw(DataLine) },
  { path: '/tasks', label: '任务管理', icon: markRaw(List) },
  { path: '/blog', label: '我的博客', icon: markRaw(Document) },
  { path: '/pomodoro', label: '番茄钟', icon: markRaw(Timer) },
  { path: '/statistics', label: '数据统计', icon: markRaw(TrendCharts) }
];

/** 退出登录 */
function handleLogout() {
  userStore.logout();
  ElMessage.success('已退出');
  router.push('/login');
}
</script>

<style scoped>
.app-container {
  display: flex;
  min-height: 100vh;
  background: var(--bg-body);
}

/* ========== 侧边栏 ========== */
.sidebar {
  width: 220px;
  background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
  display: flex;
  flex-direction: column;
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: 100;
  padding: 20px 12px;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px 28px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  margin-bottom: 16px;
}

.logo-icon {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #0d9488, #0891b2);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 4px 12px rgba(13, 148, 136, 0.4);
}

.logo-text {
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 1px;
}

.sidebar-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 8px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  color: #94a3b8;
  text-decoration: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  position: relative;
}

.nav-item:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.06);
}

.nav-item.active {
  color: #fff;
  background: linear-gradient(135deg, rgba(13, 148, 136, 0.25), rgba(8, 145, 178, 0.15));
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: -8px;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 24px;
  background: linear-gradient(180deg, #0d9488, #0891b2);
  border-radius: 2px;
}

.nav-item .el-icon {
  flex-shrink: 0;
}

.nav-label {
  white-space: nowrap;
}

/* 侧边栏底部 */
.sidebar-footer {
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  padding: 16px 8px 8px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.avatar {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #0d9488, #06b6d4);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
}

.user-detail {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.username {
  color: #f1f5f9;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-role {
  color: #64748b;
  font-size: 11px;
}

.logout-btn {
  color: #64748b;
}

.logout-btn:hover {
  color: #f87171 !important;
}

/* ========== 主内容区 ========== */
.main-wrapper {
  flex: 1;
  margin-left: 220px;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  transition: margin-left 0.3s ease;
}

.main-wrapper.full-width {
  margin-left: 0;
}

.top-header {
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  height: 64px;
  border-bottom: 1px solid var(--border-light);
  box-shadow: var(--shadow-sm);
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-indicator {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.header-actions {
  display: flex;
  gap: 8px;
}

.header-actions .el-button {
  background: var(--bg-hover);
  border: none;
  color: var(--text-secondary);
}

.header-actions .el-button:hover {
  background: var(--primary-bg);
  color: var(--primary);
}

.main-content {
  padding: 28px 32px;
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
}

.fullscreen-mode .main-content {
  padding: 0;
  max-width: 100%;
}
</style>
