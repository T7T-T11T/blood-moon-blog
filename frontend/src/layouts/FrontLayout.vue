/** * @file FrontLayout.vue * @description 杂志风前台布局组件 * *
作用：作为前台所有页面的整体框架，包含： * - 顶部固定毛玻璃导航栏（Logo + 站点名称 + 导航菜单 +
搜索框 + 管理后台入口） * - 主内容区（router-view 渲染子路由页面） * - 底部页脚（版权信息） * *
设计要点： * - 导航栏使用 backdrop-filter 实现毛玻璃效果 * - 主色调青绿色 #0d9488 * -
响应式：桌面端横向菜单，移动端切换为汉堡菜单 * - 页面加载时调用 getSettings() 获取站点名称等配置 */
<template>
  <div class="front-layout">
    <!-- 顶部固定导航栏（毛玻璃效果） -->
    <header class="navbar">
      <div class="navbar-inner">
        <!-- 左侧：Logo + 站点名称 -->
        <div class="brand">
          <router-link to="/" class="brand-link" @click="closeMobileMenu">
            <span class="brand-logo">T</span>
            <span class="brand-name">{{ siteName }}</span>
          </router-link>
        </div>

        <!-- 中间：导航菜单（桌面端显示） -->
        <nav class="nav-menu">
          <router-link
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            class="nav-link"
            :class="{ active: isNavActive(item) }"
          >
            {{ item.label }}
          </router-link>
        </nav>

        <!-- 右侧：搜索框 + 管理后台入口 + 移动端汉堡按钮 -->
        <div class="nav-actions">
          <!-- 搜索框：回车跳转搜索结果页 -->
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
          <!-- 管理后台入口 -->
          <router-link to="/admin" class="admin-entry" title="管理后台">
            <el-icon><Setting /></el-icon>
            <span class="admin-text">管理</span>
          </router-link>
          <!-- 移动端汉堡菜单按钮 -->
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

      <!-- 移动端下拉菜单（汉堡按钮展开后显示） -->
      <transition name="slide-down">
        <nav v-if="mobileMenuOpen" class="mobile-menu">
          <router-link
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            class="mobile-nav-link"
            :class="{ active: isNavActive(item) }"
            @click="closeMobileMenu"
          >
            {{ item.label }}
          </router-link>
          <!-- 移动端搜索框 -->
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
          <!-- 移动端管理后台入口 -->
          <router-link to="/admin" class="mobile-nav-link" @click="closeMobileMenu">
            管理后台
          </router-link>
        </nav>
      </transition>
    </header>

    <!-- 主内容区：渲染子路由页面 -->
    <main class="main-content">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <!-- 底部页脚：版权信息 -->
    <footer class="footer">
      <div class="footer-inner">
        <p class="copyright">
          © {{ currentYear }} {{ siteName }}
          <template v-if="siteDescription"> · {{ siteDescription }}</template>
        </p>
        <p class="powered-by">Powered by Vue 3 + Node.js</p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Search, Setting } from '@element-plus/icons-vue';
import { getSettings } from '../api/settings';

const route = useRoute();
const router = useRouter();

/**
 * 站点配置（由后端 getSettings 返回，失败时使用默认值兜底）
 * @type {import('vue').Ref<Object>}
 * @property {string} siteName - 站点名称
 * @property {string} siteDescription - 站点描述
 * @property {string} authorName - 作者名称
 * @property {string} authorBio - 作者简介
 * @property {string} githubUrl - GitHub 链接
 * @property {string} email - 联系邮箱
 */
const settings = ref({
  siteName: '个人博客',
  siteDescription: '分享技术，记录成长',
  authorName: '',
  authorBio: '',
  githubUrl: '',
  email: ''
});

/** 站点名称（取自配置，兜底为默认值） */
const siteName = computed(() => settings.value.siteName || '个人博客');

/** 站点描述（取自配置，兜底为默认值） */
const siteDescription = computed(() => settings.value.siteDescription || '分享技术，记录成长');

/** 当前年份（用于页脚版权展示） */
const currentYear = new Date().getFullYear();

/** 搜索关键词（双向绑定到搜索输入框） */
const searchKeyword = ref('');

/** 移动端菜单展开状态 */
const mobileMenuOpen = ref(false);

/**
 * 导航菜单项配置
 * - exact: true 表示仅精确匹配时高亮（首页 / 在所有子路由下都会命中前缀，故需精确匹配）
 * @type {Array<{path: string, label: string, exact: boolean}>}
 */
const navItems = [
  { path: '/', label: '首页', exact: true },
  { path: '/archive', label: '归档', exact: false },
  { path: '/links', label: '友链', exact: false },
  { path: '/about', label: '关于', exact: false }
];

/**
 * 判断导航项是否处于激活状态
 * - 首页使用精确匹配，避免所有路由都高亮
 * - 其他路由使用前缀匹配，支持子路由高亮
 * @param {Object} item - 导航项 { path, label, exact }
 * @returns {boolean} 是否激活
 */
function isNavActive(item) {
  // 首页精确匹配，避免 /article/1 也命中首页
  if (item.exact) {
    return route.path === item.path;
  }
  // 其余路由前缀匹配，支持子路由高亮
  return route.path.startsWith(item.path);
}

/**
 * 处理搜索：回车后跳转到搜索结果页
 * 关键词为空时不跳转，避免空查询
 */
function handleSearch() {
  const keyword = searchKeyword.value.trim();
  // 仅在有关键词时跳转搜索结果页
  if (keyword) {
    router.push({ path: '/search', query: { keyword } });
    closeMobileMenu();
  }
}

/** 切换移动端菜单展开状态 */
function toggleMobileMenu() {
  mobileMenuOpen.value = !mobileMenuOpen.value;
}

/** 关闭移动端菜单 */
function closeMobileMenu() {
  mobileMenuOpen.value = false;
}

/**
 * 加载站点配置
 * 调用 getSettings 获取后端配置项，失败时保留默认值不影响页面渲染
 * @returns {Promise<void>}
 */
async function loadSettings() {
  try {
    const { data } = await getSettings();
    // 仅在返回非空对象时合并，避免覆盖默认值
    if (data && typeof data === 'object') {
      settings.value = { ...settings.value, ...data };
    }
  } catch (e) {
    // 配置加载失败不阻断页面渲染，使用默认值即可
    console.error('加载站点配置失败:', e);
  }
}

onMounted(() => {
  loadSettings();
});
</script>

<style scoped>
/* ========== 布局变量 ========== */
.front-layout {
  --color-primary: #0d9488; /* 主色：青绿 */
  --color-primary-dark: #0f766e; /* 主色深 */
  --color-primary-light: #14b8a6; /* 主色浅 */
  --color-text: #0f172a; /* 主文本 */
  --color-text-secondary: #475569; /* 次级文本 */
  --color-text-muted: #94a3b8; /* 弱化文本 */
  --color-bg: #ffffff; /* 卡片背景 */
  --color-bg-soft: #f8fafc; /* 页面背景 */
  --color-border: #e2e8f0; /* 分割线 */
  --navbar-height: 64px; /* 导航栏高度 */
  --max-width: 1200px; /* 内容最大宽度 */

  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--color-bg-soft);
  color: var(--color-text);
}

/* ========== 顶部导航栏（毛玻璃） ========== */
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: rgba(255, 255, 255, 0.72); /* 半透明背景配合 backdrop-filter 实现毛玻璃 */
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
}

.navbar-inner {
  max-width: var(--max-width);
  margin: 0 auto;
  height: var(--navbar-height);
  padding: 0 32px;
  display: flex;
  align-items: center;
  gap: 32px;
}

/* 左侧品牌区 */
.brand {
  flex-shrink: 0;
}

.brand-link {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: var(--color-text);
}

.brand-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%);
  color: #fff;
  font-weight: 800;
  font-size: 20px;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(13, 148, 136, 0.35);
}

.brand-name {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.5px;
  color: var(--color-text);
}

/* 中间导航菜单 */
.nav-menu {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 0 auto;
}

.nav-link {
  position: relative;
  padding: 8px 16px;
  font-size: 15px;
  font-weight: 500;
  color: var(--color-text-secondary);
  text-decoration: none;
  border-radius: 8px;
  transition:
    color 0.2s ease,
    background 0.2s ease;
}

/* 下划线高亮指示器 */
.nav-link::after {
  content: '';
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: 4px;
  height: 2px;
  background: var(--color-primary);
  border-radius: 2px;
  transform: scaleX(0);
  transform-origin: center;
  transition: transform 0.25s ease;
}

.nav-link:hover {
  color: var(--color-primary);
}

.nav-link.active {
  color: var(--color-primary);
  font-weight: 600;
}

.nav-link.active::after {
  transform: scaleX(1);
}

/* 右侧操作区 */
.nav-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}

/* 搜索框 */
.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 14px;
  background: rgba(248, 250, 252, 0.8);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  width: 220px;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease;
}

.search-box:focus-within {
  border-color: var(--color-primary);
  background: #fff;
  box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
}

.search-icon {
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  color: var(--color-text);
}

.search-input::placeholder {
  color: var(--color-text-muted);
}

/* 管理后台入口 */
.admin-entry {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-primary);
  text-decoration: none;
  background: rgba(13, 148, 136, 0.08);
  border: 1px solid rgba(13, 148, 136, 0.2);
  border-radius: 8px;
  transition:
    background 0.2s ease,
    border-color 0.2s ease;
}

.admin-entry:hover {
  background: rgba(13, 148, 136, 0.15);
  border-color: rgba(13, 148, 136, 0.4);
}

/* 汉堡菜单按钮（默认隐藏，移动端显示） */
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
  background: var(--color-text);
  border-radius: 2px;
  transition:
    transform 0.25s ease,
    opacity 0.25s ease;
}

/* 展开状态：三条线变成 X */
.menu-toggle.open .menu-bar:nth-child(1) {
  transform: translateY(7px) rotate(45deg);
}

.menu-toggle.open .menu-bar:nth-child(2) {
  opacity: 0;
}

.menu-toggle.open .menu-bar:nth-child(3) {
  transform: translateY(-7px) rotate(-45deg);
}

/* 移动端下拉菜单（默认隐藏，移动端显示） */
.mobile-menu {
  display: none;
  flex-direction: column;
  padding: 12px 20px 20px;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--color-border);
  gap: 4px;
}

.mobile-nav-link {
  padding: 12px;
  font-size: 15px;
  font-weight: 500;
  color: var(--color-text-secondary);
  text-decoration: none;
  border-radius: 8px;
  transition:
    color 0.2s ease,
    background 0.2s ease;
}

.mobile-nav-link:hover,
.mobile-nav-link.active {
  color: var(--color-primary);
  background: rgba(13, 148, 136, 0.08);
}

.mobile-search {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0;
  padding: 10px 14px;
  background: var(--color-bg-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

/* ========== 主内容区 ========== */
.main-content {
  flex: 1;
  margin-top: var(--navbar-height);
  width: 100%;
}

/* ========== 页脚 ========== */
.footer {
  border-top: 1px solid var(--color-border);
  background: #fff;
}

.footer-inner {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 32px;
  text-align: center;
}

.copyright {
  margin: 0 0 4px;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.powered-by {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-muted);
}

/* ========== 过渡动画 ========== */
/* 路由切换淡入淡出 */
.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* 移动菜单展开动画 */
.slide-down-enter-active,
.slide-down-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* ========== 响应式 ========== */
/* 平板及以下：隐藏横向菜单，显示汉堡按钮 */
@media (max-width: 960px) {
  .nav-menu {
    display: none;
  }
  .menu-toggle {
    display: flex;
  }
  .mobile-menu {
    display: flex;
  }
  /* 内联搜索框隐藏，改用移动菜单内搜索 */
  .search-box {
    display: none;
  }
}

/* 手机端尺寸调整 */
@media (max-width: 768px) {
  .navbar-inner {
    padding: 0 16px;
    gap: 16px;
  }
  .brand-name {
    font-size: 18px;
  }
  /* 手机端管理入口仅保留图标 */
  .admin-entry .admin-text {
    display: none;
  }
  .footer-inner {
    padding: 24px 16px;
  }
}
</style>
