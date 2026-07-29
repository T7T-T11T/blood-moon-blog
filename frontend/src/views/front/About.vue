/** * @file About.vue * @description 关于我页面（杂志风个人主页，卡片化舍弃） * * 作用： * - 大号
Hero：博主姓名为最大字号 + 简介 * - 内容分区：简介、技能标签、联系方式（GitHub / 邮箱） * -
大量留白，克制排版 * * 数据获取： * - getSettings() 返回键值对对象 * -
字段同时兼容驼峰与下划线命名（siteName / site_name 等） * * 动效（2-3 组）： * - 入场：Hero 文案
fade-in-up 错峰 * - 滚动：各分区进入视口时 fade-in-up 错峰（Intersection Observer） * -
悬浮：技能标签上移、联系方式箭头右移 */
<template>
  <div ref="rootRef" class="about-page">
    <!-- ============ Hero 区域：博主姓名为最大字号 ============ -->
    <section class="hero">
      <div class="hero-inner">
        <p class="hero-eyebrow animate-fade-in-down">ABOUT</p>
        <h1 class="hero-title animate-fade-in-up">{{ authorName }}</h1>
        <p class="hero-tagline animate-fade-in-up delay-100">{{ siteDescription }}</p>
      </div>
      <!-- 装饰光斑（纯视觉） -->
      <div class="hero-orb" aria-hidden="true"></div>
    </section>

    <!-- ============ 主体内容 ============ -->
    <div class="content-wrapper">
      <!-- 简介 -->
      <section class="block reveal">
        <h2 class="block-title">简介</h2>
        <p class="block-text">{{ authorBio }}</p>
      </section>

      <!-- 技能 / 兴趣 -->
      <section class="block reveal">
        <h2 class="block-title">技能 / 兴趣</h2>
        <div class="skill-list">
          <span v-for="skill in skills" :key="skill" class="skill-tag">{{ skill }}</span>
        </div>
      </section>

      <!-- 联系方式 -->
      <section v-if="hasContact" class="block reveal">
        <h2 class="block-title">联系方式</h2>
        <ul class="contact-list">
          <!-- GitHub -->
          <li v-if="githubUrl" class="contact-item">
            <a :href="githubUrl" target="_blank" rel="noopener noreferrer" class="contact-link">
              <span class="contact-label">GitHub</span>
              <span class="contact-value">{{ githubHandle }}</span>
              <span class="contact-arrow" aria-hidden="true">→</span>
            </a>
          </li>
          <!-- 邮箱 -->
          <li v-if="authorEmail" class="contact-item">
            <a :href="`mailto:${authorEmail}`" class="contact-link">
              <span class="contact-label">Email</span>
              <span class="contact-value">{{ authorEmail }}</span>
              <span class="contact-arrow" aria-hidden="true">→</span>
            </a>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { getSettings } from '../../api/settings';

/** 组件根节点引用（用于作用域内的滚动观察） */
const rootRef = ref(null);

/** 网站设置（键值对对象） */
const settings = ref({});

/** Intersection Observer 实例（滚动揭示动画） */
let observer = null;

/** 静态技能 / 兴趣标签 */
const skills = [
  'Vue 3',
  'JavaScript',
  'TypeScript',
  'Node.js',
  'Element Plus',
  'Vite',
  'Pinia',
  'Vue Router'
];

/**
 * 通用取值器：同时兼容驼峰与下划线命名
 * 用于应对后端设置键名风格不确定的情况
 * @param {string} camel - 驼峰键名，如 authorName
 * @param {string} snake - 下划线键名，如 author_name
 * @returns {string} 命中值，无则空字符串
 */
function pick(camel, snake) {
  const v = settings.value[camel] ?? settings.value[snake];
  return v == null ? '' : String(v);
}

/** 博主姓名 */
const authorName = computed(() => pick('authorName', 'author_name') || '匿名博主');

/** 博主简介 */
const authorBio = computed(() => pick('authorBio', 'author_bio') || '热爱技术，喜欢分享。');

/** 站点描述 */
const siteDescription = computed(
  () => pick('siteDescription', 'site_description') || '分享技术，记录成长'
);

/** 博主邮箱 */
const authorEmail = computed(() => pick('email', 'author_email'));

/** GitHub 账号（可为完整 URL 或用户名） */
const authorGithub = computed(() => pick('githubUrl', 'author_github'));

/**
 * GitHub 完整访问 URL
 * - 已是完整 URL 直接使用
 * - 否则拼接 https://github.com/ 前缀
 * @returns {string} GitHub 主页地址
 */
const githubUrl = computed(() => {
  const gh = authorGithub.value;
  if (!gh) return '';
  if (/^https?:\/\//i.test(gh)) return gh;
  return `https://github.com/${gh}`;
});

/**
 * GitHub 展示文本（URL 时取最后一段路径作为显示名）
 * @returns {string} 用户名或原值
 */
const githubHandle = computed(() => {
  const gh = authorGithub.value;
  if (!gh) return '';
  if (/^https?:\/\//i.test(gh)) {
    // 取 URL 末尾路径段
    const parts = gh.replace(/\/+$/, '').split('/');
    return parts[parts.length - 1] || gh;
  }
  return gh;
});

/** 是否存在任一联系方式（控制联系方式区块展示） */
const hasContact = computed(() => Boolean(githubUrl.value || authorEmail.value));

/**
 * 加载网站设置
 * 失败时使用默认值，不阻断页面渲染
 * @returns {Promise<void>}
 */
async function loadSettings() {
  try {
    const { data } = await getSettings();
    if (data && typeof data === 'object') {
      settings.value = data;
    }
    await nextTick();
    initObserver();
  } catch (e) {
    console.error('加载网站设置失败:', e);
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
    { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
  );
  rootRef.value.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
}

onMounted(() => {
  loadSettings();
});

onUnmounted(() => {
  if (observer) observer.disconnect();
});
</script>

<style scoped>
/* ========== Hero 区域 ========== */
.hero {
  position: relative;
  padding: 120px 32px 96px;
  background: linear-gradient(135deg, #0f766e 0%, #0d9488 45%, #14b8a6 100%);
  overflow: hidden;
  color: #fff;
  isolation: isolate;
}

.hero-inner {
  position: relative;
  z-index: 2;
  max-width: 960px;
  margin: 0 auto;
  text-align: center;
}

.hero-eyebrow {
  margin: 0 0 18px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 6px;
  color: rgba(255, 255, 255, 0.78);
}

/* 博主姓名为最大字号 */
.hero-title {
  margin: 0 0 24px;
  font-size: clamp(56px, 10vw, 104px);
  font-weight: 800;
  letter-spacing: -3px;
  line-height: 1.02;
  text-shadow: 0 4px 30px rgba(0, 0, 0, 0.2);
}

.hero-tagline {
  margin: 0 auto;
  max-width: 560px;
  font-size: clamp(16px, 2vw, 20px);
  font-weight: 400;
  color: rgba(255, 255, 255, 0.9);
  letter-spacing: 0.5px;
}

/* Hero 装饰光斑 */
.hero-orb {
  position: absolute;
  top: -140px;
  right: -100px;
  width: 420px;
  height: 420px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.18) 0%, transparent 70%);
  border-radius: 50%;
  z-index: 1;
  pointer-events: none;
}

/* ========== 内容区 ========== */
.content-wrapper {
  max-width: 760px;
  margin: 0 auto;
  padding: 88px 32px 96px;
}

/* 内容分区：使用分隔线 + 大留白，舍弃卡片 */
.block {
  padding-bottom: 64px;
  margin-bottom: 64px;
  border-bottom: 1px solid var(--border);
  /* 入场前隐藏 */
  opacity: 0;
  transform: translateY(28px);
  transition:
    opacity 0.6s var(--ease-out),
    transform 0.6s var(--ease-out);
}

.block:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.block.visible {
  opacity: 1;
  transform: translateY(0);
}

.block-title {
  margin: 0 0 24px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: var(--primary);
}

.block-text {
  margin: 0;
  font-size: 18px;
  line-height: 1.85;
  color: var(--text-primary);
  letter-spacing: 0.2px;
}

/* ========== 技能标签 ========== */
.skill-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.skill-tag {
  padding: 8px 18px;
  font-size: 14px;
  font-weight: 500;
  color: var(--primary);
  background: var(--primary-bg);
  border-radius: 20px;
  transition:
    transform 0.25s var(--ease-spring),
    background 0.25s var(--ease-out);
}

.skill-tag:hover {
  transform: translateY(-3px);
  background: var(--primary);
  color: #fff;
}

/* ========== 联系方式列表 ========== */
.contact-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.contact-item {
  border-bottom: 1px solid var(--border);
}

.contact-item:last-child {
  border-bottom: none;
}

.contact-link {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 22px 0;
  text-decoration: none;
  color: inherit;
  transition: transform 0.25s var(--ease-out);
}

.contact-link:hover {
  transform: translateX(8px);
}

.contact-label {
  flex-shrink: 0;
  width: 80px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.contact-value {
  flex: 1;
  min-width: 0;
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.25s var(--ease-out);
}

.contact-link:hover .contact-value {
  color: var(--primary);
}

.contact-arrow {
  flex-shrink: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-tertiary);
  transition:
    transform 0.3s var(--ease-spring),
    color 0.25s var(--ease-out);
}

.contact-link:hover .contact-arrow {
  color: var(--primary);
  transform: translateX(6px);
}

/* ========== 响应式 ========== */
@media (max-width: 768px) {
  .hero {
    padding: 80px 20px 64px;
  }
  .content-wrapper {
    padding: 56px 20px 64px;
  }
  .block {
    padding-bottom: 48px;
    margin-bottom: 48px;
  }
  .block-text {
    font-size: 16px;
  }
  .contact-link {
    gap: 12px;
  }
  .contact-label {
    width: 64px;
    font-size: 11px;
  }
  .contact-value {
    font-size: 15px;
  }
}
</style>
