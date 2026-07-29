/** * @file Links.vue * @description 友情链接页面组件（卡片网格杂志风） * *
作用：按分类分组展示友情链接，提供卡片式网格浏览体验 * - 顶部 Hero：友链标题 + 站点总数统计 * -
分类分组：按 category 分组（友情链接 / 推荐站点 / 工具资源 等） * -
卡片网格：头像/Logo、名称、描述、访问链接（新窗口打开） * - 卡片悬浮动画：上移 + 阴影增强 * -
加载中骨架 / 空状态兜底 * * 数据获取： * - getLinks() 获取已通过友链列表 * 返回数组，每项：{ id,
name, url, description, avatar_url, category, sort_order, status } * * 设计要点： * - 主色调青绿色
#0d9488 * - 卡片网格 3-4 列，响应式自适应 * - 头像缺失时使用首字母占位 * - 响应式：平板 2-3
列，手机单列 */
<template>
  <div class="links-page">
    <!-- Hero 区域：友链标题 + 站点总数 -->
    <section class="hero">
      <div class="hero-inner">
        <p class="hero-eyebrow">FRIENDS</p>
        <h1 class="hero-title">友情链接</h1>
        <p class="hero-subtitle">共收录 {{ totalLinks }} 个站点</p>
      </div>
      <!-- 装饰光斑（纯视觉，不可交互） -->
      <div class="hero-decoration" aria-hidden="true"></div>
    </section>

    <!-- 主体：分类分组 + 卡片网格 -->
    <div class="content-wrapper">
      <!-- 加载中骨架：首次加载且无数据时展示 -->
      <div v-if="loading && links.length === 0" class="link-grid">
        <div v-for="n in 8" :key="n" class="link-card skeleton-card">
          <div class="skeleton-avatar"></div>
          <div class="skeleton-line w-60"></div>
          <div class="skeleton-line w-90"></div>
        </div>
      </div>

      <!-- 分类分组：有友链数据时按 category 分组展示 -->
      <div v-else-if="groupedLinks.length > 0">
        <section v-for="group in groupedLinks" :key="group.category" class="link-section">
          <!-- 分类标题 -->
          <div class="section-header">
            <h2 class="section-title">{{ group.category }}</h2>
            <span class="section-sub">{{ group.links.length }} 个站点</span>
          </div>

          <!-- 卡片网格 -->
          <div class="link-grid">
            <a
              v-for="(link, index) in group.links"
              :key="link.id"
              :href="link.url"
              target="_blank"
              rel="noopener noreferrer"
              class="link-card"
              :style="{ '--card-index': index }"
            >
              <!-- 头像/Logo：存在 avatar_url 展示图片，否则使用首字母占位 -->
              <div class="card-avatar">
                <img
                  v-if="link.avatar_url"
                  :src="link.avatar_url"
                  :alt="link.name"
                  loading="lazy"
                />
                <span v-else class="avatar-fallback">{{ getInitial(link.name) }}</span>
              </div>
              <!-- 名称与描述 -->
              <div class="card-info">
                <h3 class="card-name">{{ link.name }}</h3>
                <p class="card-desc">{{ link.description || '暂无描述' }}</p>
              </div>
              <!-- 访问箭头 -->
              <div class="card-visit">
                <el-icon><Right /></el-icon>
              </div>
            </a>
          </div>
        </section>
      </div>

      <!-- 空状态：非加载且无友链时展示 -->
      <div v-else class="empty-state">
        <el-icon :size="56" color="#cbd5e1"><Connection /></el-icon>
        <p class="empty-text">暂无友情链接</p>
        <p class="empty-desc">友链申请通过后将在此展示</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { Right, Connection } from '@element-plus/icons-vue';
import { getLinks } from '../../api/links';

/** 友链列表（扁平数组） */
const links = ref([]);

/** 加载状态（控制骨架屏展示） */
const loading = ref(false);

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
 * - 预设分类（友情链接/推荐站点/工具资源）按固定顺序优先展示
 * - 每组内按 sort_order 升序排序（sort_order 不存在时保持原序）
 * @returns {Array<{category: string, links: Array}>} 分组后的友链列表
 */
const groupedLinks = computed(() => {
  const map = new Map();
  // 遍历所有友链，按 category 分组
  for (const link of links.value) {
    // 无分类的友链归入"其他"
    const category = link.category || '其他';
    if (!map.has(category)) {
      map.set(category, []);
    }
    map.get(category).push(link);
  }

  // 每组内按 sort_order 升序排序（缺失 sort_order 视为 0）
  for (const [, groupLinks] of map) {
    groupLinks.sort((a, b) => {
      const orderA = Number(a.sort_order) || 0;
      const orderB = Number(b.sort_order) || 0;
      return orderA - orderB;
    });
  }

  const result = [];
  // 先添加预设分类（仅添加存在的分类，保证固定顺序）
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
 * @returns {string} 首字符，空名称返回空字符串
 */
function getInitial(name) {
  // 名称不存在或为空时返回空字符串
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
    // 兼容数组或 { list } 两种返回结构
    links.value = Array.isArray(data) ? data : (data?.list ?? []);
  } catch (e) {
    console.error('加载友链失败:', e);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadLinks();
});
</script>

<style scoped>
.links-page {
  --color-primary: #0d9488; /* 主色：青绿 */
  --color-primary-dark: #0f766e; /* 主色深 */
  --color-primary-light: #14b8a6; /* 主色浅 */
  --color-text: #0f172a; /* 主文本 */
  --color-text-secondary: #475569; /* 次级文本 */
  --color-text-muted: #94a3b8; /* 弱化文本 */
  --color-bg: #ffffff; /* 卡片背景 */
  --color-bg-soft: #f8fafc; /* 页面背景 */
  --color-border: #e2e8f0; /* 分割线 */
  --max-width: 1200px; /* 内容最大宽度 */
}

/* ========== Hero 区域 ========== */
.hero {
  position: relative;
  padding: 80px 32px 72px;
  background: linear-gradient(135deg, #0f766e 0%, #0d9488 45%, #14b8a6 100%);
  overflow: hidden;
  color: #fff;
}

.hero-inner {
  position: relative;
  z-index: 2;
  max-width: var(--max-width);
  margin: 0 auto;
  text-align: center;
}

.hero-eyebrow {
  margin: 0 0 12px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 4px;
  color: rgba(255, 255, 255, 0.8);
}

.hero-title {
  margin: 0 0 16px;
  font-size: 48px;
  font-weight: 800;
  letter-spacing: -1.5px;
  text-shadow: 0 2px 20px rgba(0, 0, 0, 0.15);
}

.hero-subtitle {
  margin: 0;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.9);
  letter-spacing: 0.5px;
}

/* Hero 装饰光斑 */
.hero-decoration {
  position: absolute;
  top: -100px;
  right: -60px;
  width: 320px;
  height: 320px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.18) 0%, transparent 70%);
  border-radius: 50%;
  z-index: 1;
}

/* ========== 内容区 ========== */
.content-wrapper {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 56px 32px 64px;
}

/* 分类区块 */
.link-section {
  margin-bottom: 56px;
}

.link-section:last-child {
  margin-bottom: 0;
}

/* 分类标题 */
.section-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 24px;
  padding-bottom: 14px;
  border-bottom: 2px solid var(--color-border);
}

.section-title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text);
  letter-spacing: -0.5px;
}

.section-sub {
  font-size: 13px;
  color: var(--color-text-muted);
}

/* ========== 卡片网格 ========== */
.link-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr); /* 桌面端 4 列 */
  gap: 20px;
}

.link-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  text-decoration: none;
  color: inherit;
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease,
    border-color 0.3s ease;
  /* 卡片入场动画：按索引错峰淡入 */
  animation: card-in 0.5s ease backwards;
  animation-delay: calc(var(--card-index) * 50ms);
}

@keyframes card-in {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 卡片悬浮：上移 + 阴影增强 + 主色边框 */
.link-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.12);
  border-color: rgba(13, 148, 136, 0.4);
}

/* 头像/Logo */
.card-avatar {
  flex-shrink: 0;
  width: 52px;
  height: 52px;
  border-radius: 12px;
  overflow: hidden;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 首字母占位（无头像时） */
.avatar-fallback {
  font-size: 22px;
  font-weight: 800;
  color: #fff;
}

/* 名称与描述 */
.card-info {
  flex: 1;
  min-width: 0;
}

.card-name {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text);
  /* 名称最多 1 行，超出截断 */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.2s ease;
}

/* 悬浮时名称变为主色 */
.link-card:hover .card-name {
  color: var(--color-primary);
}

.card-desc {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-muted);
  line-height: 1.4;
  /* 描述最多 1 行，超出截断 */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 访问箭头 */
.card-visit {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  color: var(--color-text-muted);
  transition:
    color 0.2s ease,
    transform 0.2s ease;
}

/* 悬浮时箭头变主色并右移 */
.link-card:hover .card-visit {
  color: var(--color-primary);
  transform: translateX(4px);
}

/* ========== 骨架屏 ========== */
.skeleton-card {
  pointer-events: none;
}

.skeleton-avatar {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  flex-shrink: 0;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

.skeleton-line {
  height: 12px;
  margin-bottom: 8px;
  border-radius: 6px;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

.w-60 {
  width: 60%;
}
.w-90 {
  width: 90%;
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

.empty-text {
  margin: 16px 0 8px;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.empty-desc {
  margin: 0;
  font-size: 14px;
  color: var(--color-text-muted);
}

/* ========== 响应式 ========== */
/* 平板：3 列 */
@media (max-width: 1024px) {
  .link-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* 大手机/小平板：2 列 */
@media (max-width: 768px) {
  .hero {
    padding: 56px 20px 48px;
  }

  .hero-title {
    font-size: 36px;
  }

  .content-wrapper {
    padding: 32px 16px 48px;
  }

  .link-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }

  .section-title {
    font-size: 20px;
  }
}

/* 小屏手机：单列 */
@media (max-width: 480px) {
  .link-grid {
    grid-template-columns: 1fr;
  }
}
</style>
