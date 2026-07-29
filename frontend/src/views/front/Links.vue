/** * @file Links.vue * @description 友情链接页（杂志风，卡片网格改为分类列表） * * 作用： * - 按
category 分组展示友链，列表式排版（非卡片） * - 每行：头像 + 名称 + 描述 + 访问箭头 * -
头像缺失时使用名称首字母占位 * * 数据获取： * - getLinks() 返回数组 [{ id, name, url, description,
avatar_url, category, sort_order }] * - 兼容返回 { list } 或数组两种结构 * * 动效（2-3 组）： * -
入场：Hero 文案 fade-in-up 错峰 * - 滚动：每个分类分组进入视口时 fade-in-up（Intersection Observer）
* - 悬浮：整行上移 + 名称变主色 + 头像放大 + 箭头右移 */
<template>
  <div ref="rootRef" class="links-page">
    <!-- ============ Hero 区域 ============ -->
    <section class="hero">
      <div class="hero-inner">
        <p class="hero-eyebrow animate-fade-in-down">FRIENDS</p>
        <h1 class="hero-title animate-fade-in-up">友情链接</h1>
        <p class="hero-subtitle animate-fade-in-up delay-100">共收录 {{ totalLinks }} 个站点</p>
      </div>
      <!-- 装饰光斑（纯视觉） -->
      <div class="hero-orb" aria-hidden="true"></div>
    </section>

    <!-- ============ 主体：分类分组列表 ============ -->
    <div class="content-wrapper">
      <!-- 加载骨架 -->
      <div v-if="loading && links.length === 0" class="skeleton-list">
        <div v-for="n in 6" :key="n" class="skeleton-row">
          <div class="skeleton-avatar"></div>
          <div class="skeleton-lines">
            <div class="skeleton-line w-40"></div>
            <div class="skeleton-line w-80"></div>
          </div>
        </div>
      </div>

      <!-- 分类分组 -->
      <div v-else-if="groupedLinks.length > 0">
        <section
          v-for="(group, gi) in groupedLinks"
          :key="group.category"
          class="link-section reveal"
          :style="{ '--row-index': gi }"
        >
          <!-- 分类标题 -->
          <div class="section-header">
            <h2 class="section-title">{{ group.category }}</h2>
            <span class="section-sub">{{ group.links.length }} 个站点</span>
          </div>

          <!-- 站点列表（非卡片，使用分隔线列表） -->
          <ul class="link-list">
            <li
              v-for="(link, li) in group.links"
              :key="link.id"
              class="link-row"
              :style="{ '--item-index': li }"
            >
              <a :href="link.url" target="_blank" rel="noopener noreferrer" class="link-inner">
                <!-- 头像：存在 avatar_url 展示图片，否则首字母占位 -->
                <div class="link-avatar">
                  <img
                    v-if="link.avatar_url"
                    :src="link.avatar_url"
                    :alt="link.name"
                    loading="lazy"
                  />
                  <span v-else class="avatar-fallback">{{ getInitial(link.name) }}</span>
                </div>
                <!-- 名称与描述 -->
                <div class="link-info">
                  <h3 class="link-name">{{ link.name }}</h3>
                  <p class="link-desc">{{ link.description || '暂无描述' }}</p>
                </div>
                <!-- 访问箭头 -->
                <span class="link-arrow" aria-hidden="true">→</span>
              </a>
            </li>
          </ul>
        </section>
      </div>

      <!-- 空状态 -->
      <div v-else class="empty-state">
        <p class="empty-title">暂无友情链接</p>
        <p class="empty-desc">友链申请通过后将在此展示</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { getLinks } from '../../api/links';

/** 组件根节点引用（用于作用域内的滚动观察） */
const rootRef = ref(null);

/** 友链列表（扁平数组） */
const links = ref([]);

/** 加载状态（控制骨架屏展示） */
const loading = ref(false);

/** Intersection Observer 实例（滚动揭示动画） */
let observer = null;

/** 预设分类展示顺序（未在此列表的分类按出现顺序追加） */
const CATEGORY_ORDER = ['友情链接', '推荐站点', '工具资源'];

/**
 * 友链总数
 * @returns {number} 友链总数量
 */
const totalLinks = computed(() => links.value.length);

/**
 * 按分类分组的友链列表
 * - 按 category 字段分组，无 category 的归入"其他"
 * - 预设分类按固定顺序优先展示
 * - 每组内按 sort_order 升序排序
 * @returns {Array<{category: string, links: Array}>} 分组后的友链列表
 */
const groupedLinks = computed(() => {
  const map = new Map();
  // 遍历所有友链，按 category 分组
  for (const link of links.value) {
    const category = link.category || '其他';
    if (!map.has(category)) map.set(category, []);
    map.get(category).push(link);
  }
  // 每组内按 sort_order 升序排序（缺失视为 0）
  for (const [, groupLinks] of map) {
    groupLinks.sort((a, b) => {
      const oa = Number(a.sort_order) || 0;
      const ob = Number(b.sort_order) || 0;
      return oa - ob;
    });
  }
  const result = [];
  // 先添加预设分类（保证固定顺序）
  for (const cat of CATEGORY_ORDER) {
    if (map.has(cat)) {
      result.push({ category: cat, links: map.get(cat) });
      map.delete(cat);
    }
  }
  // 再添加剩余分类（按 Map 原始插入顺序追加）
  for (const [category, groupLinks] of map) {
    result.push({ category, links: groupLinks });
  }
  return result;
});

/**
 * 获取名称首字符作为头像占位
 * @param {string} name - 友链名称
 * @returns {string} 首字符大写，空名称返回空字符串
 */
function getInitial(name) {
  if (!name) return '';
  return name.charAt(0).toUpperCase();
}

/**
 * 加载友链列表
 * 兼容返回值为数组或对象包裹的数组两种结构
 * @returns {Promise<void>}
 */
async function loadLinks() {
  loading.value = true;
  try {
    const { data } = await getLinks();
    links.value = Array.isArray(data) ? data : (data?.list ?? []);
    await nextTick();
    initObserver();
  } catch (e) {
    console.error('加载友链失败:', e);
  } finally {
    loading.value = false;
  }
}

/**
 * 初始化 Intersection Observer
 * 监听组件内所有 .reveal 元素，进入视口时添加 visible 类触发动画
 */
function initObserver() {
  if (observer) observer.disconnect();
  if (!rootRef.value) return;
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -60px 0px' }
  );
  rootRef.value.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
}

onMounted(() => {
  loadLinks();
});

onUnmounted(() => {
  if (observer) observer.disconnect();
});
</script>

<style scoped>
/* ========== Hero 区域：黑红血月主题 ========== */
.hero {
  position: relative;
  padding: 120px 32px 80px;
  background: linear-gradient(180deg, #060912 0%, #0a0e1a 40%, #121828 100%);
  overflow: hidden;
  color: #fff;
  isolation: isolate;
  border-bottom: 1px solid var(--border);
}

/* 血月背景光晕 */
.hero::before {
  content: '';
  position: absolute;
  top: 10%;
  left: 50%;
  transform: translateX(-50%);
  width: 400px;
  height: 400px;
  background: radial-gradient(
    circle,
    rgba(220, 38, 38, 0.12) 0%,
    rgba(153, 27, 27, 0.05) 40%,
    transparent 70%
  );
  border-radius: 50%;
  z-index: 0;
  pointer-events: none;
  animation: moonPulse 8s ease-in-out infinite;
}

.hero-inner {
  position: relative;
  z-index: 2;
  max-width: 960px;
  margin: 0 auto;
  text-align: center;
}

.hero-eyebrow {
  margin: 0 0 16px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 6px;
  color: rgba(248, 113, 113, 0.8);
}

.hero-title {
  margin: 0 0 20px;
  font-size: clamp(40px, 6vw, 64px);
  font-weight: 800;
  letter-spacing: -2px;
  background: linear-gradient(180deg, #ffffff 0%, #fca5a5 60%, #dc2626 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 0 20px rgba(220, 38, 38, 0.3));
}

.hero-subtitle {
  margin: 0;
  font-size: 16px;
  color: rgba(241, 245, 249, 0.7);
  letter-spacing: 1px;
}

/* Hero 装饰光斑（暗红调） */
.hero-orb {
  position: absolute;
  top: -100px;
  right: -60px;
  width: 320px;
  height: 320px;
  background: radial-gradient(circle, rgba(220, 38, 38, 0.08) 0%, transparent 70%);
  border-radius: 50%;
  z-index: 1;
  pointer-events: none;
}

/* 骨架屏适配暗色 */
.skeleton-avatar,
.skeleton-line {
  background: linear-gradient(90deg, #1a2035 25%, #252d44 50%, #1a2035 75%);
  background-size: 200% 100%;
}

/* ========== 内容区 ========== */
.content-wrapper {
  max-width: 960px;
  margin: 0 auto;
  padding: 64px 32px 80px;
}

/* 分类区块：入场前隐藏 */
.link-section {
  margin-bottom: 64px;
  opacity: 0;
  transform: translateY(24px);
  transition:
    opacity 0.6s var(--ease-out),
    transform 0.6s var(--ease-out);
  transition-delay: calc(var(--row-index) * 80ms);
}

.link-section.visible {
  opacity: 1;
  transform: translateY(0);
}

.link-section:last-child {
  margin-bottom: 0;
}

/* 分类标题 */
.section-header {
  display: flex;
  align-items: baseline;
  gap: 14px;
  margin-bottom: 20px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border);
}

.section-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.5px;
}

.section-sub {
  font-size: 13px;
  color: var(--text-tertiary);
}

/* ========== 站点列表（分隔线列表，非卡片） ========== */
.link-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.link-row {
  border-bottom: 1px solid var(--border);
}

.link-row:last-child {
  border-bottom: none;
}

.link-inner {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 18px 8px;
  text-decoration: none;
  color: inherit;
  transition: transform 0.3s var(--ease-out);
}

/* 悬浮：整行上移 + 主色强调 */
.link-inner:hover {
  transform: translateY(-3px);
}

/* 头像 */
.link-avatar {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s var(--ease-spring);
}

.link-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 悬浮时头像放大 */
.link-inner:hover .link-avatar {
  transform: scale(1.12);
}

/* 首字母占位 */
.avatar-fallback {
  font-size: 20px;
  font-weight: 800;
  color: #fff;
}

/* 名称与描述 */
.link-info {
  flex: 1;
  min-width: 0;
}

.link-name {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.25s var(--ease-out);
}

/* 悬浮时名称变主色 */
.link-inner:hover .link-name {
  color: var(--primary);
}

.link-desc {
  margin: 0;
  font-size: 13px;
  color: var(--text-tertiary);
  line-height: 1.5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 访问箭头 */
.link-arrow {
  flex-shrink: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-tertiary);
  transition:
    transform 0.3s var(--ease-spring),
    color 0.25s var(--ease-out);
}

/* 悬浮时箭头变主色并右移 */
.link-inner:hover .link-arrow {
  color: var(--primary);
  transform: translateX(6px);
}

/* ========== 骨架屏 ========== */
.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.skeleton-row {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 18px 8px;
}

.skeleton-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  flex-shrink: 0;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

.skeleton-lines {
  flex: 1;
}

.skeleton-line {
  height: 12px;
  margin-bottom: 8px;
  border-radius: 6px;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

.skeleton-line:last-child {
  margin-bottom: 0;
}

.w-40 {
  width: 40%;
}
.w-80 {
  width: 80%;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* ========== 空状态 ========== */
.empty-state {
  text-align: center;
  padding: 80px 20px;
}

.empty-title {
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 700;
  color: var(--text-secondary);
}

.empty-desc {
  margin: 0;
  font-size: 14px;
  color: var(--text-tertiary);
}

/* ========== 响应式 ========== */
@media (max-width: 768px) {
  .hero {
    padding: 56px 20px 48px;
  }
  .content-wrapper {
    padding: 40px 16px 56px;
  }
  .section-title {
    font-size: 18px;
  }
  .link-inner {
    gap: 14px;
    padding: 16px 4px;
  }
  .link-avatar {
    width: 42px;
    height: 42px;
  }
}
</style>
