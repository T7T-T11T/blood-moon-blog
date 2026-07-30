<!--
  ArticleSkeleton.vue
  文章列表骨架屏，用于加载占位
  Props: count - 骨架行数（默认 5）
-->
<template>
  <div class="article-list">
    <div v-for="n in count" :key="n" class="skeleton-row">
      <div class="skeleton-line w-70"></div>
      <div class="skeleton-line w-90"></div>
      <div class="skeleton-line w-40"></div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  count: { type: Number, default: 5 }
});
</script>

<style scoped>
.article-list {
  display: flex;
  flex-direction: column;
}

.skeleton-row {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 24px 0;
  border-bottom: 1px solid var(--border);
}

.skeleton-line {
  height: 14px;
  border-radius: 6px;
  background: #1a2035;
}

.w-40 {
  width: 40%;
}
.w-70 {
  width: 70%;
}
.w-90 {
  width: 90%;
}
</style>
