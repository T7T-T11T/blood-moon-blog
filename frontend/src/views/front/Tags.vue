/** * @file Tags.vue * @description 标签云页面 - 以词云形式展示所有标签 * * 功能： * -
从后端获取所有标签及其文章数量 * - 根据文章数量调整标签字体大小 * - 点击标签跳转到该标签的文章列表 *
- 支持字母/颜色随机排列 */
<template>
  <div ref="rootRef" class="tags-page">
    <!-- ============ Hero 区域 ============ -->
    <section class="hero">
      <div class="hero-inner">
        <p class="hero-eyebrow animate-fade-in-down">TAGS</p>
        <h1 class="hero-title animate-fade-in-up">标签云</h1>
        <p class="hero-subtitle animate-fade-in-up delay-100">
          共 {{ tags.length }} 个标签 · {{ totalArticles }} 篇文章
        </p>
      </div>
      <div class="hero-orb" aria-hidden="true"></div>
    </section>

    <!-- ============ 标签云 ============ -->
    <div class="content-wrapper">
      <!-- 加载骨架 -->
      <div v-if="loading" class="skeleton-cloud">
        <div v-for="n in 12" :key="n" class="skeleton-tag"></div>
      </div>

      <!-- 标签云 -->
      <div v-else-if="tags.length > 0" class="tag-cloud reveal">
        <router-link
          v-for="(tag, index) in tags"
          :key="tag.id"
          :to="`/tag/${tag.slug}`"
          class="tag-item"
          :style="{
            '--font-size': getTagSize(tag.article_count),
            '--delay': `${index * 50}ms`,
            '--hue': getTagHue(index)
          }"
        >
          <span class="tag-name">#{{ tag.name }}</span>
          <span class="tag-count">{{ tag.article_count || 0 }}</span>
        </router-link>
      </div>

      <!-- 空状态 -->
      <div v-else class="empty-state">
        <el-icon :size="64" class="empty-icon"><CollectionTag /></el-icon>
        <p class="empty-title">暂无标签</p>
        <p class="empty-desc">发布文章时可添加标签</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { CollectionTag } from '@element-plus/icons-vue';
import { getTags } from '@/api/tags';

/** 根节点引用 */
const rootRef = ref(null);

/** 标签列表 */
const tags = ref([]);

/** 加载状态 */
const loading = ref(false);

/** 文章总数 */
const totalArticles = computed(() => {
  return tags.value.reduce((sum, tag) => sum + (tag.article_count || 0), 0);
});

/**
 * 根据文章数量计算标签字体大小
 * @param {number} count - 文章数量
 * @returns {string} 字体大小
 */
function getTagSize(count) {
  const minSize = 14;
  const maxSize = 32;
  const maxCount = Math.max(...tags.value.map((t) => t.article_count || 0), 1);
  const size = minSize + ((count || 0) / maxCount) * (maxSize - minSize);
  return `${size}px`;
}

/**
 * 获取标签颜色色相值
 * @param {number} index - 标签索引
 * @returns {number} 色相值（0-360）
 */
function getTagHue(index) {
  // 使用黄金角度分布颜色，使相邻颜色差异大
  return (index * 137.508) % 360;
}

/**
 * 加载标签列表
 */
async function loadTags() {
  loading.value = true;
  try {
    const res = await getTags();
    // 按文章数量降序排列
    tags.value = (res.data.data || []).sort(
      (a, b) => (b.article_count || 0) - (a.article_count || 0)
    );
  } catch (e) {
    console.error('加载标签失败：', e);
    tags.value = [];
  } finally {
    loading.value = false;
  }
}

/**
 * 初始化滚动揭示动画
 */
function initRevealObserver() {
  if (!rootRef.value) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    },
    { threshold: 0.1 }
  );

  rootRef.value.querySelectorAll('.reveal').forEach((el) => {
    observer.observe(el);
  });

  return observer;
}

let observer = null;

onMounted(() => {
  loadTags();
  setTimeout(() => {
    observer = initRevealObserver();
  }, 100);
});

onUnmounted(() => {
  if (observer) observer.disconnect();
});
</script>

<style scoped>
/* ========== Hero 区域 ========== */
.tags-page {
  min-height: 100vh;
  background: #0a0a0f;
}

.hero {
  position: relative;
  padding: 80px 24px 60px;
  text-align: center;
  overflow: hidden;
}

.hero-inner {
  position: relative;
  z-index: 1;
}

.hero-eyebrow {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 4px;
  color: #c62828;
  margin-bottom: 16px;
}

.hero-title {
  font-size: 48px;
  font-weight: 700;
  color: #fff;
  margin: 0 0 16px;
  letter-spacing: -1px;
}

.hero-subtitle {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
}

.hero-orb {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(198, 40, 40, 0.15) 0%, transparent 70%);
  pointer-events: none;
}

/* ========== 内容区 ========== */
.content-wrapper {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px 80px;
}

/* ========== 骨架屏 ========== */
.skeleton-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: center;
  padding: 40px 0;
}

.skeleton-tag {
  width: 100px;
  height: 40px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

@keyframes skeleton-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* ========== 标签云 ========== */
.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: center;
  padding: 40px 0;
  opacity: 0;
  transform: translateY(20px);
  transition:
    opacity 0.6s ease,
    transform 0.6s ease;
}

.tag-cloud.visible {
  opacity: 1;
  transform: translateY(0);
}

.tag-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px;
  text-decoration: none;
  color: rgba(255, 255, 255, 0.85);
  font-size: var(--font-size);
  font-weight: 500;
  transition:
    transform 0.3s ease,
    background 0.3s ease,
    border-color 0.3s ease,
    box-shadow 0.3s ease;
  animation: tagFadeIn 0.5s ease forwards;
  animation-delay: var(--delay);
  opacity: 0;
}

.tag-item:hover {
  transform: translateY(-4px) scale(1.05);
  background: hsla(var(--hue), 70%, 40%, 0.2);
  border-color: hsla(var(--hue), 70%, 50%, 0.5);
  box-shadow: 0 8px 32px hsla(var(--hue), 70%, 50%, 0.2);
}

@keyframes tagFadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.tag-name {
  letter-spacing: 0.5px;
}

.tag-count {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  padding: 2px 8px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 10px;
}

.tag-item:hover .tag-count {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}

/* ========== 空状态 ========== */
.empty-state {
  text-align: center;
  padding: 80px 24px;
}

.empty-icon {
  color: rgba(255, 255, 255, 0.1);
  margin-bottom: 24px;
}

.empty-title {
  font-size: 20px;
  font-weight: 600;
  color: #fff;
  margin: 0 0 8px;
}

.empty-desc {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
}

/* ========== 响应式 ========== */
@media (max-width: 768px) {
  .hero-title {
    font-size: 32px;
  }

  .tag-cloud {
    gap: 12px;
    padding: 24px 0;
  }

  .tag-item {
    padding: 8px 16px;
    font-size: 14px !important;
  }
}

/* ========== 动画 ========== */
.animate-fade-in-up {
  animation: fadeInUp 0.6s ease forwards;
}

.animate-fade-in-down {
  animation: fadeInDown 0.6s ease forwards;
}

.delay-100 {
  animation-delay: 0.1s;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
