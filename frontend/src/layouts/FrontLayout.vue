/** * @file FrontLayout.vue * @description 前台布局组件 - 极简毛玻璃风格 * * 作用： * -
顶部固定毛玻璃导航栏（品牌 + 导航 + 搜索 + 后台入口） * - 路由切换淡入过渡 * -
移动端汉堡菜单（下滑展开） * - 极简页脚（站点名 + 版权） * * 设计： * - 全局采用青绿色 #0d9488 主色
* - 导航栏 backdrop-filter blur 实现毛玻璃 * - 卡片化布局被舍弃，使用列与分隔线组织信息 * - 入场动画
+ 悬浮微动效 + 路由过渡 共三组动效 */
<template>
  <div class="front-layout">
    <!-- ============ 固定背景层（所有前台页面共享，不随滚动） ============ -->
    <div class="fixed-bg" :style="{ backgroundImage: `url(${heroBg})` }" aria-hidden="true"></div>
    <div class="fixed-bg-overlay" aria-hidden="true"></div>
    <div class="fixed-bg-glow" aria-hidden="true"></div>

    <!-- 顶部固定毛玻璃导航栏 -->
    <header class="navbar" :class="{ scrolled: isScrolled }">
      <div class="navbar-inner">
        <!-- 品牌：仅 Logo 字母图标 -->
        <router-link to="/" class="brand" @click="closeMobileMenu">
          <img src="@/assets/blood-moon-logo.webp" alt="logo" class="brand-mark" />
        </router-link>

        <!-- 桌面端导航 -->
        <nav class="nav-menu">
          <router-link
            v-for="item in visibleNavItems"
            :key="item.path"
            :to="item.path"
            class="nav-link"
            :class="{ active: isNavActive(item) }"
          >
            <span class="nav-text">{{ item.label }}</span>
          </router-link>
        </nav>

        <!-- 右侧操作：搜索 + 后台 + 汉堡 -->
        <div class="nav-actions">
          <div class="search-box">
            <el-icon class="search-icon"><Search /></el-icon>
            <input
              v-model="searchKeyword"
              type="text"
              class="search-input"
              placeholder="搜索文章…"
              @keyup.enter="handleSearch"
            />
          </div>
          <router-link to="/admin" class="admin-entry" title="管理后台">
            <el-icon><Setting /></el-icon>
          </router-link>
          <button
            class="theme-toggle"
            :title="themeStore.theme === 'dark' ? '切换亮色主题' : '切换暗色主题'"
            @click="themeStore.toggleTheme()"
          >
            <el-icon>
              <Sunny v-if="themeStore.theme === 'dark'" />
              <Moon v-else />
            </el-icon>
          </button>
          <button
            class="menu-toggle"
            :class="{ open: mobileMenuOpen }"
            aria-label="菜单"
            @click="toggleMobileMenu"
          >
            <span class="menu-bar"></span>
            <span class="menu-bar"></span>
            <span class="menu-bar"></span>
          </button>
        </div>
      </div>

      <!-- 移动端下拉菜单 -->
      <transition name="slide-down">
        <nav v-if="mobileMenuOpen" class="mobile-menu">
          <router-link
            v-for="item in visibleNavItems"
            :key="item.path"
            :to="item.path"
            class="mobile-nav-link"
            :class="{ active: isNavActive(item) }"
            @click="closeMobileMenu"
          >
            {{ item.label }}
          </router-link>
          <div class="mobile-search">
            <el-icon class="search-icon"><Search /></el-icon>
            <input
              v-model="searchKeyword"
              type="text"
              class="search-input"
              placeholder="搜索文章…"
              @keyup.enter="handleSearch"
            />
          </div>
          <router-link to="/admin" class="mobile-nav-link" @click="closeMobileMenu">
            管理后台
          </router-link>
        </nav>
      </transition>
    </header>

    <!-- 主内容区：路由过渡 -->
    <main class="main-content">
      <router-view v-slot="{ Component }">
        <transition name="page" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <!-- 返回顶部浮动按钮 -->
    <BackToTop />

    <!-- 极简页脚 -->
    <footer class="footer">
      <div class="footer-inner">
        <span class="footer-brand">{{ siteName }}</span>
        <span class="footer-divider">·</span>
        <span class="footer-copy">© {{ currentYear }}</span>
        <span v-if="siteDescription" class="footer-divider">·</span>
        <span v-if="siteDescription" class="footer-desc">{{ siteDescription }}</span>
        <span class="footer-divider">·</span>
        <a :href="`${apiBase}/rss`" target="_blank" class="footer-rss" title="RSS 订阅">
          <el-icon><Connection /></el-icon> RSS
        </a>
      </div>
    </footer>

    <!-- 全局底部音乐播放器 -->
    <MusicPlayer />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Search, Setting, Sunny, Moon, Connection } from '@element-plus/icons-vue';
import { getSettings, settingsState } from '../api/settings';
import heroBg from '../assets/hero-bg.webp';
import MusicPlayer from '../components/MusicPlayer.vue';
import BackToTop from '../components/common/BackToTop.vue';
import { useThemeStore } from '../stores/theme';
import { useUserStore } from '../stores/user';

/** API 基础路径（开发环境 /api，生产环境为 Workers 完整 URL） */
const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';

const route = useRoute();
const router = useRouter();
const themeStore = useThemeStore();
const userStore = useUserStore();

/** 站点名（使用模块级共享状态） */
const siteName = computed(() => settingsState.siteName || '寿冬与秋');

/** 站点描述（使用模块级共享状态） */
const siteDescription = computed(() => settingsState.siteDescription || '');

/** 当前年份 */
const currentYear = new Date().getFullYear();

/** 搜索关键词 */
const searchKeyword = ref('');

/**
 * 可见导航项（auth 标记的项仅在登录时显示）
 */
const visibleNavItems = computed(() => {
  return navItems.filter((item) => !item.auth || userStore.isLoggedIn);
});

/** 移动菜单展开状态 */
const mobileMenuOpen = ref(false);

/** 页面是否已滚动（用于导航栏背景加深） */
const isScrolled = ref(false);

/**
 * 导航菜单项
 * - exact: true 表示仅精确匹配高亮（首页特殊处理）
* @type {Array<{path: string, label: string, exact: boolean, auth?: boolean}>}
 */
const navItems = [
  { path: '/', label: '首页', exact: true },
  { path: '/archive', label: '归档', exact: false },
  { path: '/links', label: '友链', exact: false },
  { path: '/about', label: '关于', exact: false }
];

/**
 * 判断导航项是否激活
 * - 首页精确匹配
 * - 其他路由前缀匹配，支持子路由高亮
 * @param {Object} item - 导航项
 * @returns {boolean}
 */
function isNavActive(item) {
  if (item.exact) return route.path === item.path;
  return route.path.startsWith(item.path);
}

/**
 * 处理搜索：回车跳转到 /search?keyword=xxx
 * 关键词为空时不跳转
 */
function handleSearch() {
  const keyword = searchKeyword.value.trim();
  if (keyword) {
    router.push({ path: '/search', query: { keyword } });
    closeMobileMenu();
  }
}

/** 切换移动端菜单 */
function toggleMobileMenu() {
  mobileMenuOpen.value = !mobileMenuOpen.value;
}

/** 关闭移动端菜单 */
function closeMobileMenu() {
  mobileMenuOpen.value = false;
}

/**
 * 滚动监听：超过 20px 时为导航栏添加 scrolled 状态
 * 用于加深毛玻璃背景，增强可读性
 */
function handleScroll() {
  isScrolled.value = window.scrollY > 20;
}

/**
 * 加载站点配置
 * getSettings 内部已处理缓存和共享状态同步，无需手动赋值
 * @returns {Promise<void>}
 */
async function loadSettings() {
  try {
    await getSettings();
  } catch (e) {
    console.error('加载站点配置失败:', e);
  }
}

onMounted(() => {
  loadSettings();
  window.addEventListener('scroll', handleScroll, { passive: true });
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
});
</script>

<style scoped>
/* ========== 固定背景层（全局共享，不随滚动） ========== */
.fixed-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 0;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
}

.fixed-bg-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1;
  background: linear-gradient(
    180deg,
    rgba(6, 9, 18, 0.55) 0%,
    rgba(10, 14, 26, 0.45) 30%,
    rgba(10, 14, 26, 0.65) 70%,
    rgba(6, 9, 18, 0.92) 100%
  );
  pointer-events: none;
}

.fixed-bg-glow {
  position: fixed;
  top: 12%;
  left: 50%;
  transform: translateX(-50%);
  width: 380px;
  height: 380px;
  z-index: 2;
  background: radial-gradient(
    circle,
    rgba(220, 38, 38, 0.14) 0%,
    rgba(220, 38, 38, 0.05) 40%,
    transparent 70%
  );
  border-radius: 50%;
  pointer-events: none;
}

/* ========== 布局骨架 ========== */
.front-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--bg-body);
  color: var(--text-primary);
  scroll-behavior: smooth;
  isolation: isolate;
}

/* 确保导航栏在背景之上 */
.navbar {
  z-index: 100;
}

/* 确保主内容和页脚在背景之上 */
.main-content {
  position: relative;
  z-index: 10;
}

.footer {
  position: relative;
  z-index: 10;
}

/* ========== 顶部毛玻璃导航 ========== */
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: rgba(6, 9, 18, 0.6);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 1px solid transparent;
  transition:
    background 0.3s var(--ease-out),
    border-color 0.3s var(--ease-out),
    box-shadow 0.3s var(--ease-out);
}

/* 滚动后加深背景与边框 */
.navbar.scrolled {
  background: rgba(6, 9, 18, 0.85);
  border-bottom-color: var(--border);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.navbar-inner {
  max-width: 1200px;
  margin: 0 auto;
  height: 72px;
  padding: 0 32px;
  display: flex;
  align-items: center;
  gap: 40px;
}

/* ========== 品牌 ========== */
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  color: var(--text-primary);
  flex-shrink: 0;
}

.brand-mark {
  display: block;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
  box-shadow:
    0 0 0 1px rgba(220, 38, 38, 0.3),
    0 0 16px rgba(220, 38, 38, 0.35);
  transition:
    transform 0.3s var(--ease-spring),
    box-shadow 0.3s var(--ease-out);
}

/* 品牌悬浮：Logo 轻微旋转放大 */
.brand:hover .brand-mark {
  transform: rotate(-8deg) scale(1.08);
}

.brand-name {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.5px;
}

/* ========== 桌面导航 ========== */
.nav-menu {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 0 auto;
}

.nav-link {
  position: relative;
  padding: 10px 18px;
  font-size: 15px;
  font-weight: 500;
  color: var(--text-secondary);
  text-decoration: none;
  border-radius: 8px;
  transition: color 0.25s var(--ease-out);
}

/* 下划线指示器：从中心展开 */
.nav-link::after {
  content: '';
  position: absolute;
  left: 18px;
  right: 18px;
  bottom: 4px;
  height: 2px;
  background: var(--primary);
  border-radius: 2px;
  transform: scaleX(0);
  transform-origin: center;
  transition: transform 0.3s var(--ease-spring);
  box-shadow: 0 0 6px rgba(220, 38, 38, 0.5);
}

.nav-link:hover {
  color: var(--primary-light);
}

.nav-link.active {
  color: var(--primary-light);
  font-weight: 600;
}

.nav-link.active::after {
  transform: scaleX(1);
}

/* ========== 右侧操作区 ========== */
.nav-actions {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-shrink: 0;
}

/* 搜索框 */
.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 16px;
  background: rgba(26, 32, 53, 0.6);
  border: 1px solid var(--border);
  border-radius: 20px;
  width: 220px;
  transition:
    border-color 0.25s var(--ease-out),
    box-shadow 0.25s var(--ease-out),
    background 0.25s var(--ease-out),
    width 0.3s var(--ease-out);
}

/* 聚焦时：宽度扩展 + 主色描边 */
.search-box:focus-within {
  border-color: var(--primary);
  background: rgba(26, 32, 53, 0.9);
  box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.12);
  width: 260px;
}

.search-icon {
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  color: var(--text-primary);
}

.search-input::placeholder {
  color: var(--text-tertiary);
}

/* 后台入口 */
.admin-entry {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  color: var(--text-secondary);
  text-decoration: none;
  background: rgba(26, 32, 53, 0.6);
  border: 1px solid var(--border);
  border-radius: 12px;
  font-size: 18px;
  transition:
    color 0.25s var(--ease-out),
    border-color 0.25s var(--ease-out),
    background 0.25s var(--ease-out),
    transform 0.25s var(--ease-spring);
}

.admin-entry:hover {
  color: var(--primary-light);
  border-color: var(--primary);
  background: var(--primary-bg);
  transform: rotate(45deg);
}

/* 主题切换按钮 */
.theme-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  color: var(--text-secondary);
  background: rgba(26, 32, 53, 0.6);
  border: 1px solid var(--border);
  border-radius: 12px;
  font-size: 18px;
  cursor: pointer;
  transition:
    color 0.25s var(--ease-out),
    border-color 0.25s var(--ease-out),
    background 0.25s var(--ease-out);
}

.theme-toggle:hover {
  color: #f59e0b;
  border-color: #f59e0b;
  background: rgba(245, 158, 11, 0.1);
}

/* 汉堡按钮（移动端） */
.menu-toggle {
  display: none;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  width: 40px;
  height: 40px;
  padding: 0;
  background: transparent;
  border: none;
  cursor: pointer;
}

.menu-bar {
  display: block;
  width: 22px;
  height: 2px;
  margin: 0 auto;
  background: var(--text-primary);
  border-radius: 2px;
  transition:
    transform 0.3s var(--ease-spring),
    opacity 0.25s var(--ease-out);
}

/* 展开状态：三线变 X */
.menu-toggle.open .menu-bar:nth-child(1) {
  transform: translateY(7px) rotate(45deg);
}

.menu-toggle.open .menu-bar:nth-child(2) {
  opacity: 0;
}

.menu-toggle.open .menu-bar:nth-child(3) {
  transform: translateY(-7px) rotate(-45deg);
}

/* ========== 移动端菜单 ========== */
.mobile-menu {
  display: flex;
  flex-direction: column;
  padding: 12px 20px 20px;
  background: rgba(6, 9, 18, 0.98);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border);
  gap: 4px;
}

.mobile-nav-link {
  padding: 14px 12px;
  font-size: 15px;
  font-weight: 500;
  color: var(--text-secondary);
  text-decoration: none;
  border-radius: 8px;
  transition:
    color 0.2s var(--ease-out),
    background 0.2s var(--ease-out);
}

.mobile-nav-link:hover,
.mobile-nav-link.active {
  color: var(--primary-light);
  background: var(--primary-bg);
}

.mobile-search {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0;
  padding: 12px 14px;
  background: var(--bg-hover);
  border: 1px solid var(--border);
  border-radius: 10px;
}

/* ========== 主内容区 ========== */
.main-content {
  flex: 1;
  margin-top: 72px;
  width: 100%;
}

/* ========== 页脚 ========== */
.footer {
  border-top: 1px solid var(--border);
  background: var(--bg-sidebar);
  padding-bottom: 80px; /* 为底部居中播放器留出空间 */
}

.footer-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 28px 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 13px;
  color: var(--text-tertiary);
}

.footer-brand {
  font-weight: 600;
  color: var(--text-secondary);
}

.footer-divider {
  color: var(--text-tertiary);
}

.footer-rss {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--text-tertiary);
  text-decoration: none;
  font-size: 13px;
  transition: color 0.2s;
}

.footer-rss:hover {
  color: #f59e0b;
}

/* ========== 路由过渡动画 ========== */
.page-enter-active,
.page-leave-active {
  transition:
    opacity 0.35s var(--ease-out),
    transform 0.35s var(--ease-out);
}

.page-enter-from {
  opacity: 0;
  transform: translateY(12px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* 移动菜单下滑动画 */
.slide-down-enter-active,
.slide-down-leave-active {
  transition:
    opacity 0.3s var(--ease-out),
    transform 0.3s var(--ease-out);
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}

/* ========== 响应式 ========== */
@media (max-width: 960px) {
  .nav-menu {
    display: none;
  }
  .menu-toggle {
    display: flex;
  }
  /* 桌面搜索框隐藏，改用移动菜单内搜索 */
  .search-box {
    display: none;
  }
  .navbar-inner {
    gap: 16px;
  }
}

@media (max-width: 768px) {
  .navbar-inner {
    padding: 0 16px;
    height: 64px;
  }
  .main-content {
    margin-top: 64px;
  }
  .brand-name {
    font-size: 18px;
  }
  .footer-inner {
    padding: 24px 16px;
  }
}
</style>
