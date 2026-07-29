<template>
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
 */
</script>

<style>
/* 全局样式已在 style.css 中定义 */
</style>
