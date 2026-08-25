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
        <img src="@/assets/ggbond/tongue.gif" class="admin-brand-image" alt="猪猪侠开工" />
        <span class="logo-text"><small>GG BOND STUDIO</small>博客管理</span>
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

      <div class="sidebar-mascot">
        <GGBondSticker mood="sly" size="md" />
        <p>今日写作任务：<br /><strong>把想法存下来</strong></p>
      </div>

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
import { ref, markRaw } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '../stores/user';
import GGBondSticker from '../components/common/GGBondSticker.vue';
import {
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
  Delete,
  Tickets
} from '@element-plus/icons-vue';

const userStore = useUserStore();
const router = useRouter();
const route = useRoute();

/** 移动端侧边栏是否展开 */
const sidebarOpen = ref(false);

/** 内容管理菜单项（markRaw 避免图标组件被转为响应式） */
const contentMenu = [
  { path: '/admin/dashboard', label: '仪表盘', icon: markRaw(Monitor) },
  { path: '/admin/articles', label: '文章管理', icon: markRaw(Document) },
  { path: '/admin/categories', label: '分类管理', icon: markRaw(Folder) },
  { path: '/admin/tags', label: '标签管理', icon: markRaw(PriceTag) },
  { path: '/admin/comments', label: '评论管理', icon: markRaw(ChatDotRound) },
  { path: '/admin/links', label: '友链管理', icon: markRaw(Link) },
  { path: '/admin/music', label: '音乐管理', icon: markRaw(Headset) },
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
  --admin-bg: #eef5fb;
  --admin-card: #fffdf7;
  --admin-hover: #eaf6ff;
  --admin-border: #d9d2c2;
  --admin-text: #29334a;
  --admin-text-secondary: #626b7c;
  --admin-text-tertiary: #9298a3;
  --admin-primary: #4f8fdc;
  --admin-primary-light: #78b8ef;
  --admin-primary-dark: #3267a8;
  --admin-shadow: rgba(79, 113, 143, 0.14);
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
  background: linear-gradient(180deg, #dff2ff 0%, #fff4c8 100%);
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
  gap: 10px;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(79, 143, 220, 0.16);
}

.admin-brand-image {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border: 2px solid #ffffff;
  border-radius: 12px 8px 14px 9px;
  box-shadow: 3px 3px 0 #78c8a0;
}

.logo-text {
  color: #29334a;
  font-size: 16px;
  font-weight: 800;
  display: grid;
  line-height: 1.15;
}

.logo-text small {
  color: #3979ba;
  font-size: 8px;
  letter-spacing: .12em;
}

.sidebar-mascot {
  display: flex;
  align-items: center;
  gap: 11px;
  margin: 0 14px 14px;
  padding: 11px;
  color: #46536a;
  background: linear-gradient(135deg, rgba(120, 200, 160, .28), rgba(255, 225, 122, .34));
  border: 1px dashed rgba(79, 143, 220, .4);
  border-radius: 18px;
}

.sidebar-mascot p { font-size: 11px; line-height: 1.4; }
.sidebar-mascot strong { color: #3267a8; }
.sidebar-mascot :deep(.ggbond-sticker) { flex: 0 0 auto; }
.sidebar-mascot :deep(.ggbond-sticker img) { box-shadow: 2px 3px 0 #4f8fdc; border-width: 2px; }

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
  color: #3267a8;
  background: rgba(79, 143, 220, 0.1);
}

.nav-item.active {
  color: #29334a;
  background: linear-gradient(135deg, rgba(120, 200, 160, 0.26), rgba(255, 225, 122, 0.3));
  box-shadow: 0 4px 12px rgba(79, 143, 220, 0.1);
}

/* 激活态左侧指示条 */
.nav-item.active::before {
  content: '';
  width: 3px;
  height: 16px;
  background: linear-gradient(180deg, var(--admin-primary), #78c8a0);
  border-radius: 2px;
  margin-right: -6px;
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
  background: rgba(79, 143, 220, 0.1);
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
  background: rgba(79, 143, 220, 0.1);
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
