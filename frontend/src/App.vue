<template>
  <!-- JSON-LD 结构化数据（SEO） -->
  <component :is="'script'" type="application/ld+json">
    {{ jsonLd }}
  </component>
  <router-view />
</template>

<script setup>
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
 */
import { computed } from 'vue';
import { useSettingsStore } from '@/stores/settings';

const settingsStore = useSettingsStore();

/**
 * WebSite 类型的 JSON-LD 结构化数据
 * 用途：帮助搜索引擎理解网站的基本信息
 * 包含：网站名称、描述、URL、作者信息等
 */
const jsonLd = computed(() => {
  const settings = settingsStore.settings || {};
  const siteName = settings.siteName || '寿冬与秋';
  const siteDescription = settings.siteDescription || '一个专注于技术分享与个人成长的暗夜哥特风博客';
  const siteUrl = settings.siteUrl || window.location.origin;
  const authorName = settings.siteAuthor || '寿冬与秋';

  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    'name': siteName,
    'description': siteDescription,
    'url': siteUrl,
    'author': {
      '@type': 'Person',
      'name': authorName
    },
    'potentialAction': {
      '@type': 'SearchAction',
      'target': {
        '@type': 'EntryPoint',
        'urlTemplate': `${siteUrl}/search?keyword={search_term_string}`
      },
      'query-input': 'required name=search_term_string'
    }
  });
});
</script>

<style>
/* 全局样式已在 style.css 中定义 */
</style>
