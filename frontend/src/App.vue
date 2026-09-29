<template>
  <!-- JSON-LD 结构化数据（SEO） -->
  <component :is="'script'" type="application/ld+json">
    {{ jsonLd }}
  </component>
  <el-config-provider :locale="locale === 'en' ? en : zhCn"><router-view /></el-config-provider>

  <!-- 版本更新提示：检测到新版本时显示 -->
  <Teleport to="body">
    <div v-if="showUpdateTip" class="version-update-tip">
      <span>{{ t('🔔 检测到新版本，点击刷新') }}</span>
      <button @click="refreshPage">{{ t('刷新') }}</button>
      <button class="close-btn" @click="dismissUpdate">×</button>
    </div>
  </Teleport>
</template>

<script setup>
import { t, locale } from '@/utils/locale';
/**
 * 应用根组件
 * 作用：仅作为路由出口，不包含布局逻辑
 *
 * 布局说明：
 * - 前台页面由 FrontLayout.vue 提供布局（首页、文章、归档等）
 * - 后台页面由 AdminLayout.vue 提供布局（仪表盘、文章管理等）
 * - 登录/注册/404 等独立页面自行管理布局
 *
 * SEO 说明：
 * - 在根组件注入 WebSite 类型的 JSON-LD 结构化数据
 * - Article 类型的 JSON-LD 应在文章详情页（ArticleDetail.vue）中动态注入
 *
 * 版本更新：
 * - 自动检测新版本并提示用户刷新
 */
import en from 'element-plus/es/locale/lang/en';
import { useRoute } from 'vue-router';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import { computed, ref, onMounted, onBeforeUnmount, watchEffect } from 'vue';
import { settingsState, getSettings } from '@/api/settings';
import { startVersionCheck } from '@/utils/version';

const route = useRoute();
watchEffect(() => {
  document.documentElement.lang = locale.value;
  // 标题使用站点设置里的名称（设置加载后会自动重算）
  const siteName = settingsState.siteName || '寿冬与秋';
  if (route.name !== 'ArticleDetail') document.title = `${t(route.meta.title || siteName)} - ${siteName}`;
});

/** @type {import('vue').Ref<boolean>} 是否显示版本更新提示 */
const showUpdateTip = ref(false);

/** @type {string|null} 新版本号 */
const newVersion = ref(null);

/** @type {Function|null} 停止版本检查的函数 */
let stopVersionCheck = null;

/**
 * WebSite 类型的 JSON-LD 结构化数据
 * 用途：帮助搜索引擎理解网站的基本信息
 * 包含：网站名称、描述、URL、作者信息等
 */
const jsonLd = computed(() => {
  const siteName = settingsState.siteName || '寿冬与秋';
  const siteDescription =
    settingsState.siteDescription || '一个记录生活、成长与日常灵感的个人博客';
  const siteUrl = settingsState.siteUrl || window.location.origin;
  const authorName = settingsState.authorName || '寿冬与秋';

  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteName,
    description: siteDescription,
    url: siteUrl,
    author: {
      '@type': 'Person',
      name: authorName
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl}/search?keyword={search_term_string}`
      },
      'query-input': 'required name=search_term_string'
    }
  });
});

/**
 * 刷新页面到新版本
 * 使用 location.reload(true) 强制从服务器重新加载
 */
function refreshPage() {
  window.location.reload(true);
}

/**
 * 关闭版本更新提示
 * 用户选择暂不更新时调用
 */
function dismissUpdate() {
  showUpdateTip.value = false;
}

/**
 * 应用挂载时启动版本检查
 */
onMounted(() => {
  // 加载网站设置到共享状态（供 JSON-LD 使用；FrontLayout 也会触发，此处保证尽早加载）
  getSettings().catch(() => {});
  stopVersionCheck = startVersionCheck({
    interval: 10 * 60 * 1000, // 10 分钟检查一次
    onUpdate: (version) => {
      newVersion.value = version;
      showUpdateTip.value = true;
    }
  });
});

/**
 * 应用卸载时停止版本检查
 */
onBeforeUnmount(() => {
  if (stopVersionCheck) {
    stopVersionCheck();
    stopVersionCheck = null;
  }
});
</script>

<style>
/* 版本更新提示样式 */
.version-update-tip {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #4f8fdc, #78c8a0);
  color: white;
  padding: 12px 20px;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(79, 143, 220, 0.32);
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 99999;
  animation: slideUp 0.3s ease;
}

.version-update-tip button {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: none;
  padding: 6px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
}

.version-update-tip button:hover {
  background: rgba(255, 255, 255, 0.3);
}

.version-update-tip .close-btn {
  padding: 4px 8px;
  font-size: 18px;
  line-height: 1;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}
</style>
