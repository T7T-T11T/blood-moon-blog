/** * @file FrontLayout.vue * @description 前台布局组件 - 极简毛玻璃风格 * * 作用： * -
顶部固定毛玻璃导航栏（品牌 + 导航 + 搜索 + 后台入口） * - 路由切换淡入过渡 * -
移动端汉堡菜单（下滑展开） * - 极简页脚（站点名 + 版权） * * 设计： * - 全局采用青绿色 #0d9488 主色
* - 导航栏 backdrop-filter blur 实现毛玻璃 * - 卡片化布局被舍弃，使用列与分隔线组织信息 * - 入场动画
+ 悬浮微动效 + 路由过渡 共三组动效 */
<template>
  <div class="front-layout">
    <a class="skip-link" href="#main-content">{{ t('跳到正文') }}</a>
    <!-- ============ 固定背景层（纯黑红，不使用暗月插画） ============ -->
    <div class="fixed-bg" aria-hidden="true"></div>
    <div class="fixed-bg-overlay" aria-hidden="true"></div>
    <div class="fixed-bg-glow" aria-hidden="true"></div>

    <!-- 顶部固定毛玻璃导航栏 -->
    <header class="navbar" :class="{ scrolled: isScrolled }">
      <div class="navbar-inner">
        <!-- 品牌 -->
        <router-link to="/" class="brand" @click="closeMobileMenu">
          <img src="@/assets/ggbond/cool-jacket.jpg" alt="猪猪侠" class="brand-mark" />
          <span class="brand-copy"
            ><small>GG BOND'S NOTEBOOK</small><strong>{{ siteName }}</strong></span
          >
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
            <span class="nav-text">{{ t(item.label) }}</span>
          </router-link>
        </nav>

        <!-- 右侧操作：搜索 + 后台 + 汉堡 -->
        <div class="nav-actions">
          <select class="language-select" :value="locale" aria-label="Language / 语言" @change="setLocale($event.target.value)">
            <option value="zh-CN">中文</option><option value="en">English</option>
          </select>
          <div class="search-box">
            <el-icon class="search-icon"><Search /></el-icon>
            <input
              v-model="searchKeyword"
              type="text"
              class="search-input"
              :placeholder="t('搜索文章…')"
              :aria-label="t('搜索文章')"
              @keyup.enter="handleSearch"
            />
          </div>
          <router-link to="/admin" class="admin-entry" :title="t('管理后台')">
            <el-icon><Setting /></el-icon>
          </router-link>
          <button
            ref="menuToggle"
            class="menu-toggle"
            :class="{ open: mobileMenuOpen }"
            :aria-label="t('菜单')"
            :aria-expanded="mobileMenuOpen"
            aria-controls="mobile-navigation"
            @keydown.esc="closeMobileMenu"
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
        <nav v-if="mobileMenuOpen" id="mobile-navigation" class="mobile-menu" @keydown.esc="closeMobileMenu">
          <router-link
            v-for="item in visibleNavItems"
            :key="item.path"
            :to="item.path"
            class="mobile-nav-link"
            :class="{ active: isNavActive(item) }"
            @click="closeMobileMenu"
          >
            {{ t(item.label) }}
          </router-link>
          <div class="mobile-search">
            <el-icon class="search-icon"><Search /></el-icon>
            <input
              v-model="searchKeyword"
              type="text"
              class="search-input"
              :placeholder="t('搜索文章…')"
              :aria-label="t('搜索文章')"
              @keyup.enter="handleSearch"
            />
          </div>
          <router-link to="/admin" class="mobile-nav-link" @click="closeMobileMenu">
            {{ t('管理后台') }}
          </router-link>
        </nav>
      </transition>
    </header>

    <!-- 主内容区：路由过渡 -->
    <main id="main-content" class="main-content" tabindex="-1">
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
        <GGBondSticker mood="sleeping" size="sm" />
        <router-link to="/privacy">{{ t('隐私与访问统计') }}</router-link>
        <a class="footer-rss" href="/api/rss" target="_blank" rel="noopener">RSS</a>
        <span class="footer-brand">{{ siteName }}</span>
        <span class="footer-divider">·</span>
        <span class="footer-copy">© {{ currentYear }}</span>
        <span v-if="siteDescription" class="footer-divider">·</span>
        <span v-if="siteDescription" class="footer-desc">{{ siteDescription }}</span>
        <span v-if="footerText" class="footer-divider">·</span>
        <span v-if="footerText" class="footer-text">{{ footerText }}</span>
        <span v-if="siteIcp" class="footer-divider">·</span>
        <span v-if="siteIcp" class="footer-icp">{{ siteIcp }}</span>
      </div>
    </footer>

    <!-- 全局底部音乐播放器 -->
    <MusicPlayer />
  </div>
</template>

<script setup>
import { t, locale, setLocale } from '@/utils/locale';
import { ref, computed, onMounted, onUnmounted, defineAsyncComponent } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Search, Setting } from '@element-plus/icons-vue';
import { getSettings, settingsState } from '../api/settings';
// 非首屏组件异步加载：减小主包体积、加快首屏
const MusicPlayer = defineAsyncComponent(() => import('../components/MusicPlayer.vue'));
const BackToTop = defineAsyncComponent(() => import('../components/common/BackToTop.vue'));
import GGBondSticker from '../components/common/GGBondSticker.vue';
import { useUserStore } from '../stores/user';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

/** 站点名（使用模块级共享状态） */
const siteName = computed(() => settingsState.siteName || '寿冬与秋');

/** 站点描述（使用模块级共享状态） */
const siteDescription = computed(() => settingsState.siteDescription || '');
const footerText = computed(() => settingsState.footerText || '');
const siteIcp = computed(() => settingsState.siteIcp || '');

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
const menuToggle = ref(null);

/** 页面是否已滚动（用于导航栏背景加深） */
const isScrolled = ref(false);

/**
 * 导航菜单项
 * - exact: true 表示仅精确匹配高亮（首页特殊处理）
 * @type {Array<{path: string, label: string, exact: boolean, auth?: boolean}>}
 */
const navItems = [
  { path: '/', label: '首页', exact: true },
  { path: '/tags', label: '标签', exact: false },
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
function closeMobileMenu(event) {
  mobileMenuOpen.value = false;
  if (event?.key === 'Escape') menuToggle.value?.focus();
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
.language-select { max-width: 92px; padding: 7px 4px; color: var(--text-primary); background: var(--bg-body); border: 1px solid var(--border); border-radius: 8px; }
/* ========== 固定背景层（全局共享，不随滚动） ========== */
.fixed-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 0;
  background:
    radial-gradient(circle at 10% 14%, rgba(242, 200, 75, 0.22), transparent 30%),
    radial-gradient(circle at 87% 22%, rgba(120, 200, 160, 0.18), transparent 29%),
    #f8f7f1;
}

.fixed-bg-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1;
  background:
    radial-gradient(circle at 35% 74%, rgba(79, 143, 220, 0.07), transparent 28%),
    radial-gradient(circle at 74% 83%, rgba(241, 167, 189, 0.07), transparent 24%);
  pointer-events: none;
}

.fixed-bg-glow {
  display: none;
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
  background: rgba(255, 253, 247, 0.82);
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
  background: rgba(255, 253, 247, 0.96);
  border-bottom-color: var(--border);
  box-shadow: 0 4px 20px rgba(67, 93, 118, 0.12);
}

.navbar-inner {
  max-width: 1240px;
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
    0 0 0 2px #ffffff,
    3px 4px 0 #f2c84b;
  transition:
    transform 0.3s var(--ease-spring),
    box-shadow 0.3s var(--ease-out);
}

.brand-copy {
  display: flex;
  flex-direction: column;
  gap: 1px;
  line-height: 1.1;
}

.brand-copy small {
  color: var(--text-tertiary);
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.14em;
}

.brand-copy strong {
  color: var(--text-primary);
  font-family: Georgia, 'Songti SC', serif;
  font-size: 16px;
  font-weight: 500;
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
  box-shadow: 0 0 6px rgba(79, 143, 220, 0.4);
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
  background: rgba(255, 255, 255, 0.82);
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
  background: #ffffff;
  box-shadow: 0 0 0 4px rgba(79, 143, 220, 0.14);
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
  background: rgba(255, 255, 255, 0.82);
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
  background: rgba(255, 253, 247, 0.98);
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

.footer-text {
  color: var(--text-tertiary);
}

.footer-icp {
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
  color: var(--primary);
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
@media (max-width: 1100px) {
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
  .brand-copy {
    display: none;
  }
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
