<template>
  <div ref="rootRef" class="about-page">
    <!-- ============ Hero 区域：博主姓名为最大字号 ============ -->
    <section class="hero">
      <div class="hero-inner">
        <p class="hero-eyebrow animate-fade-in-down">ABOUT</p>
        <h1 class="hero-title animate-fade-in-up">{{ authorName }}</h1>
        <p class="hero-tagline animate-fade-in-up delay-100">{{ siteDescription }}</p>
      </div>
      <div class="hero-orb" aria-hidden="true"></div>
    </section>

    <!-- ============ 主体内容（AsyncData 统一状态管理） ============ -->
    <AsyncData
      :loading="loading"
      :error="error"
      :empty="false"
      error-message="加载个人信息失败，请稍后重试"
      retry-text="重试"
      @retry="loadSettings"
    >
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
            <li v-if="githubUrl" class="contact-item">
              <a :href="githubUrl" target="_blank" rel="noopener noreferrer" class="contact-link">
                <span class="contact-label">GitHub</span>
                <span class="contact-value">{{ githubHandle }}</span>
                <span class="contact-arrow" aria-hidden="true">→</span>
              </a>
            </li>
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
    </AsyncData>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { getSettings } from '../../api/settings';
import AsyncData from '../../components/common/AsyncData.vue';

/** 根元素引用，用于 IntersectionObserver 初始化 */
const rootRef = ref(null);
/** 网站设置键值对 */
const settings = ref({});
/** 加载状态 */
const loading = ref(true);
/** 错误状态 */
const error = ref(false);
/** 数据是否已加载完成（用于控制内容显示） */
const loaded = ref(false);

/** IntersectionObserver 实例 */
let observer = null;
/** 安全超时定时器，确保内容在数据加载后立即可见 */
let revealTimeout = null;

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
 * 从设置对象中按优先级获取值
 * 先尝试驼峰命名键，再尝试蛇形命名键
 * @param {string} camel - 驼峰命名键名
 * @param {string} snake - 蛇形命名键名
 * @returns {string} 设置值，不存在返回空字符串
 */
function pick(camel, snake) {
  const v = settings.value[camel] ?? settings.value[snake];
  return v == null ? '' : String(v);
}

const authorName = computed(() => pick('authorName', 'author_name') || '匿名博主');
const authorBio = computed(() => pick('authorBio', 'author_bio') || '热爱技术，喜欢分享。');
const siteDescription = computed(
  () => pick('siteDescription', 'site_description') || '分享技术，记录成长'
);
const authorEmail = computed(() => pick('email', 'author_email'));
const authorGithub = computed(() => pick('githubUrl', 'author_github'));

const githubUrl = computed(() => {
  const gh = authorGithub.value;
  if (!gh) return '';
  if (/^https?:\/\//i.test(gh)) return gh;
  return `https://github.com/${gh}`;
});

const githubHandle = computed(() => {
  const gh = authorGithub.value;
  if (!gh) return '';
  if (/^https?:\/\//i.test(gh)) {
    const parts = gh.replace(/\/+$/, '').split('/');
    return parts[parts.length - 1] || gh;
  }
  return gh;
});

const hasContact = computed(() => Boolean(githubUrl.value || authorEmail.value));

/**
 * 加载网站设置
 * 从后端获取设置项，初始化 IntersectionObserver 实现滚动动画
 * 数据加载完成后设置 loaded 标记，并启动安全超时
 */
async function loadSettings() {
  loading.value = true;
  error.value = false;
  loaded.value = false;
  try {
    const { data } = await getSettings();
    if (data && typeof data === 'object') {
      settings.value = data;
    }
    await nextTick();
    initObserver();
  } catch (e) {
    console.error('加载网站设置失败:', e);
    error.value = true;
  } finally {
    loading.value = false;
    loaded.value = true;
    // 安全超时：2秒后强制显示所有内容，防止 Observer 未触发导致内容不可见
    if (revealTimeout) clearTimeout(revealTimeout);
    revealTimeout = setTimeout(() => {
      document.querySelectorAll('.about-page .reveal').forEach((el) => el.classList.add('visible'));
    }, 2000);
  }
}

/**
 * 初始化滚动显示动画
 * 使用 IntersectionObserver 监听带 .reveal 类的元素，可见时添加 .visible 类
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

/**
 * 组件挂载时加载数据
 */
onMounted(() => {
  loadSettings();
});

/**
 * 组件卸载时清理资源
 */
onUnmounted(() => {
  if (observer) observer.disconnect();
  if (revealTimeout) clearTimeout(revealTimeout);
});
</script>

<style scoped>
/* ========== Hero 区域 ========== */
.hero {
  position: relative;
  padding: 140px 32px 100px;
  background: linear-gradient(
    180deg,
    rgba(6, 9, 18, 0.55) 0%,
    rgba(10, 14, 26, 0.45) 50%,
    rgba(18, 24, 40, 0.65) 100%
  );
  backdrop-filter: blur(2px);
  overflow: hidden;
  color: #fff;
  isolation: isolate;
  border-bottom: 1px solid var(--border);
}

.hero::before {
  content: '';
  position: absolute;
  top: 5%;
  left: 50%;
  transform: translateX(-50%);
  width: 500px;
  height: 500px;
  background: radial-gradient(
    circle,
    rgba(220, 38, 38, 0.1) 0%,
    rgba(153, 27, 27, 0.04) 40%,
    transparent 70%
  );
  border-radius: 50%;
  z-index: 0;
  pointer-events: none;
}

.hero-inner {
  position: relative;
  z-index: 2;
  max-width: 960px;
  margin: 0 auto;
  text-align: center;
}

.hero-eyebrow {
  margin: 0 0 20px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 6px;
  color: rgba(248, 113, 113, 0.8);
}

.hero-title {
  margin: 0 0 28px;
  font-size: clamp(56px, 10vw, 104px);
  font-weight: 800;
  letter-spacing: -3px;
  line-height: 1.02;
  background: linear-gradient(180deg, #ffffff 0%, #fca5a5 60%, #dc2626 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 0 30px rgba(220, 38, 38, 0.3));
}

.hero-tagline {
  margin: 0 auto;
  max-width: 560px;
  font-size: clamp(16px, 2vw, 20px);
  font-weight: 400;
  color: rgba(241, 245, 249, 0.7);
  letter-spacing: 1px;
}

.hero-orb {
  position: absolute;
  top: -120px;
  right: -80px;
  width: 380px;
  height: 380px;
  background: radial-gradient(circle, rgba(220, 38, 38, 0.08) 0%, transparent 70%);
  border-radius: 50%;
  z-index: 1;
  pointer-events: none;
}

/* ========== 内容区 ========== */
.content-wrapper {
  max-width: 760px;
  margin: 0 auto;
  padding: 88px 32px 96px;
  background: rgba(10, 14, 26, 0.3);
}

.block {
  padding-bottom: 64px;
  margin-bottom: 64px;
  border-bottom: 1px solid var(--border);
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

/* ========== 联系方式 ========== */
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
