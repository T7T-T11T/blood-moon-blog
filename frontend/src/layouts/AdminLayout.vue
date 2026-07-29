<template>
  <div class="admin-layout">
    <!-- 左侧菜单 -->
    <aside class="admin-sidebar">
      <div class="sidebar-header">
        <div class="logo-wrapper">
          <el-icon :size="28" color="#fff"><DataLine /></el-icon>
        </div>
        <span class="logo-text">博客管理</span>
      </div>

      <nav class="sidebar-nav">
        <!-- 内容管理 -->
        <div class="nav-group">
          <div class="nav-group-title">内容管理</div>
          <router-link
            v-for="item in contentMenu"
            :key="item.path"
            :to="item.path"
            class="nav-item"
            active-class="active"
          >
            <el-icon><component :is="item.icon" /></el-icon>
            <span>{{ item.label }}</span>
          </router-link>
        </div>

        <!-- 个人工具 -->
        <div class="nav-group">
          <div class="nav-group-title">个人工具</div>
          <router-link
            v-for="item in toolMenu"
            :key="item.path"
            :to="item.path"
            class="nav-item"
            active-class="active"
          >
            <el-icon><component :is="item.icon" /></el-icon>
            <span>{{ item.label }}</span>
          </router-link>
        </div>

        <!-- 系统设置 -->
        <div class="nav-group">
          <div class="nav-group-title">系统</div>
          <router-link
            v-for="item in systemMenu"
            :key="item.path"
            :to="item.path"
            class="nav-item"
            active-class="active"
          >
            <el-icon><component :is="item.icon" /></el-icon>
            <span>{{ item.label }}</span>
          </router-link>
        </div>
      </nav>

      <div class="sidebar-footer">
        <router-link to="/" class="back-to-site">
          <el-icon><House /></el-icon>
          <span>返回首页</span>
        </router-link>
      </div>
    </aside>

    <!-- 右侧内容区 -->
    <div class="admin-main">
      <!-- 顶部导航 -->
      <header class="admin-header">
        <div class="header-left">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/admin' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item>{{ $route.meta.title }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <el-dropdown trigger="click" @command="handleCommand">
            <div class="user-dropdown">
              <div class="avatar">{{ userStore.username?.[0]?.toUpperCase() }}</div>
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

      <!-- 主内容 -->
      <main class="admin-content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<script setup>
import { markRaw } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../stores/user';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  DataLine,
  Monitor,
  Document,
  Folder,
  PriceTag,
  List,
  Timer,
  TrendCharts,
  Setting,
  House,
  User,
  SwitchButton,
  ArrowDown,
  ChatDotRound,
  Link
} from '@element-plus/icons-vue';

const userStore = useUserStore();
const router = useRouter();

/** 内容管理菜单 */
const contentMenu = [
  { path: '/admin/dashboard', label: '仪表盘', icon: markRaw(Monitor) },
  { path: '/admin/articles', label: '文章管理', icon: markRaw(Document) },
  { path: '/admin/categories', label: '分类管理', icon: markRaw(Folder) },
  { path: '/admin/tags', label: '标签管理', icon: markRaw(PriceTag) },
  { path: '/admin/comments', label: '评论管理', icon: markRaw(ChatDotRound) },
  { path: '/admin/links', label: '友链管理', icon: markRaw(Link) }
];

/** 个人工具菜单 */
const toolMenu = [
  { path: '/admin/tasks', label: '任务管理', icon: markRaw(List) },
  { path: '/admin/pomodoro', label: '番茄钟', icon: markRaw(Timer) }
];

/** 系统菜单 */
const systemMenu = [
  { path: '/admin/statistics', label: '数据统计', icon: markRaw(TrendCharts) },
  { path: '/admin/settings', label: '系统设置', icon: markRaw(Setting) }
];

/** 处理下拉菜单命令 */
async function handleCommand(command) {
  switch (command) {
    case 'logout':
      try {
        await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        });
        userStore.logout();
        ElMessage.success('已退出登录');
        router.push('/login');
      } catch (e) {
        // 取消退出
      }
      break;
    case 'profile':
      ElMessage.info('个人中心开发中');
      break;
  }
}
</script>

<style scoped>
/* ========== 布局主容器 ========== */
.admin-layout {
  display: flex;
  min-height: 100vh;
  background: #f1f5f9;
}

/* ========== 左侧菜单 ========== */
.admin-sidebar {
  width: 220px;
  background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
  display: flex;
  flex-direction: column;
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: 100;
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.logo-wrapper {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #0d9488 0%, #0891b2 100%);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(13, 148, 136, 0.4);
}

.logo-text {
  color: #fff;
  font-size: 18px;
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
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 1px;
  padding: 0 12px 8px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  color: #94a3b8;
  text-decoration: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  margin-bottom: 4px;
}

.nav-item:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.06);
}

.nav-item.active {
  color: #fff;
  background: linear-gradient(135deg, rgba(13, 148, 136, 0.3), rgba(8, 145, 178, 0.2));
  box-shadow: 0 4px 12px rgba(13, 148, 136, 0.3);
}

.nav-item.active::before {
  content: '';
  width: 3px;
  height: 16px;
  background: linear-gradient(180deg, #0d9488, #0891b2);
  border-radius: 2px;
  margin-right: -6px;
}

.sidebar-footer {
  padding: 16px 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.back-to-site {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  color: #94a3b8;
  text-decoration: none;
  border-radius: 8px;
  font-size: 13px;
  transition: all 0.2s ease;
}

.back-to-site:hover {
  color: #0d9488;
  background: rgba(13, 148, 136, 0.1);
}

/* ========== 右侧内容区 ========== */
.admin-main {
  flex: 1;
  margin-left: 220px;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.admin-header {
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  height: 60px;
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.header-left {
  display: flex;
  align-items: center;
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
  transition: background 0.2s ease;
}

.user-dropdown:hover {
  background: #f1f5f9;
}

.avatar {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #0d9488 0%, #0891b2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 600;
}

.username {
  font-size: 14px;
  font-weight: 500;
  color: #1e293b;
}

.arrow {
  color: #94a3b8;
  font-size: 12px;
}

.admin-content {
  flex: 1;
  padding: 24px 32px;
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 响应式 */
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
  .admin-layout {
    flex-direction: column;
  }

  .admin-sidebar {
    position: relative;
    width: 100%;
    height: auto;
  }

  .admin-main {
    margin-left: 0;
  }

  .admin-header {
    padding: 0 16px;
  }

  .admin-content {
    padding: 16px;
  }
}
</style>
