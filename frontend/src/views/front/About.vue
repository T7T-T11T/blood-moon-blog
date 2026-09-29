<template>
  <div ref="rootRef" class="about-page">
    <!-- ============ Hero 区域：博主姓名为最大字号 ============ -->
    <section class="hero">
      <div class="hero-inner">
        <p class="hero-eyebrow animate-fade-in-down">ABOUT</p>
        <h1 class="hero-title animate-fade-in-up">{{ authorName }}</h1>
        <p class="hero-tagline animate-fade-in-up delay-100">{{ siteDescription }}</p>
      </div>
      <GGBondSticker mood="intro" size="lg" floating :caption="t('我是 Bond，GG Bond')" :style="{ top: '14px', right: 'clamp(22px, 12vw, 190px)' }" />
      <div class="hero-orb" aria-hidden="true"></div>
    </section>

    <!-- ============ 主体内容（AsyncData 统一状态管理） ============ -->
    <AsyncData
      :loading="loading"
      :error="error"
      :empty="false"
      :error-message="t('加载个人信息失败，请稍后重试')"
      :retry-text="t('重试')"
      @retry="loadSettings"
    >
      <div class="content-wrapper">
        <!-- 简介 -->
        <section class="block reveal">
          <h2 class="block-title">简介</h2>
          <p class="block-text">{{ authorBio }}</p>
        </section>

        <!-- 生活兴趣 -->
        <section class="block reveal">
          <h2 class="block-title">{{ t('喜欢的事') }}</h2>
          <div class="skill-list">
            <span v-for="skill in skills" :key="skill" class="skill-tag">{{ skill }}</span>
          </div>
        </section>

        <!-- 联系方式 -->
        <section v-if="hasContact" class="block reveal">
          <h2 class="block-title">{{ t('联系方式') }}</h2>
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
            <li v-if="authorQQ" class="contact-item">
              <div class="contact-link">
                <span class="contact-label">QQ</span>
                <span class="contact-value">{{ authorQQ }}</span>
              </div>
            </li>
            <li v-if="authorWechat" class="contact-item">
              <div class="contact-link">
                <span class="contact-label">{{ t('微信') }}</span>
                <span class="contact-value">{{ authorWechat }}</span>
              </div>
            </li>
          </ul>
        </section>
      </div>
    </AsyncData>
  </div>
</template>

<script setup>
import { t } from '@/utils/locale';
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { getSettings } from '../../api/settings';
import AsyncData from '../../components/common/AsyncData.vue';
import GGBondSticker from '../../components/common/GGBondSticker.vue';

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

const fallbackSkills = ['生活碎片', '旅行散步', '读书观影', '日常灵感', '认真感受', '慢慢成长'];

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
const authorBio = computed(() => pick('authorBio', 'author_bio') || '在日常里收集故事，也在时间里慢慢长大。');
const siteDescription = computed(
  () => pick('siteDescription', 'site_description') || '记录生活、成长与每一个值得珍藏的瞬间'
);
const authorEmail = computed(() => pick('email', 'author_email'));
const authorGithub = computed(() => pick('githubUrl', 'author_github'));
const authorQQ = computed(() => pick('authorQq', 'author_qq'));
const authorWechat = computed(() => pick('authorWechat', 'author_wechat'));
const skills = computed(() => {
  const raw = pick('authorSkills', 'author_skills');
  const list = raw.split(/[,，\n]/).map((item) => item.trim()).filter(Boolean);
  return list.length ? list : fallbackSkills;
});

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

const hasContact = computed(() => Boolean(githubUrl.value || authorEmail.value || authorQQ.value || authorWechat.value));

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
  if (!('IntersectionObserver' in window)) {
    rootRef.value.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
    return;
  }
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
/* ========== Hero 区域（奶油浅色） ========== */
.hero {
  position: relative;
  padding: 110px 32px 76px;
  background: linear-gradient(135deg, rgba(203, 234, 255, .9), rgba(255, 244, 190, .9));
  overflow: hidden;
  color: #29334a;
  border-bottom: 1px solid #d9d2c2;
  isolation: isolate;
}

.hero::before {
  content: '';
  position: absolute;
  top: -30%;
  right: -10%;
  width: 420px;
  height: 420px;
  background: radial-gradient(circle, rgba(120, 200, 160, .22), transparent 70%);
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
  margin: 0 0 18px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: .18em;
  color: #3979ba;
}

.hero-title {
  margin: 0 0 20px;
  font-family: Impact, Haettenschweiler, 'Arial Narrow Bold', 'Microsoft YaHei', sans-serif;
  font-size: clamp(48px, 8vw, 84px);
  font-weight: 400;
  letter-spacing: -.02em;
  line-height: 1;
  color: #29334a;
}

.hero-tagline {
  margin: 0 auto;
  max-width: 560px;
  font-size: clamp(15px, 2vw, 17px);
  font-weight: 500;
  color: #5c6d82;
}

.hero-orb {
  position: absolute;
  bottom: -90px;
  left: -70px;
  width: 320px;
  height: 320px;
  background: radial-gradient(circle, rgba(241, 167, 189, .2), transparent 70%);
  border-radius: 50%;
  z-index: 1;
  pointer-events: none;
}

/* ========== 内容区 ========== */
.content-wrapper {
  max-width: 760px;
  margin: 0 auto;
  padding: 80px 32px 96px;
}

.block {
  padding: 34px;
  margin-bottom: 30px;
  background: rgba(255, 253, 247, .92);
  border-radius: 24px;
  box-shadow: 0 14px 36px rgba(67, 93, 118, .08);
  opacity: 0;
  transform: translateY(28px);
  transition:
    opacity .6s var(--ease-out),
    transform .6s var(--ease-out);
}

.block.visible {
  opacity: 1;
  transform: translateY(0);
}

.block-title {
  margin: 0 0 24px;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: #3979ba;
}

.block-text {
  margin: 0;
  font-size: 17px;
  line-height: 1.9;
  color: #29334a;
  letter-spacing: .2px;
}

/* ========== 喜欢的事 ========== */
.skill-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.skill-tag {
  padding: 8px 18px;
  font-size: 14px;
  font-weight: 500;
  color: #3267a8;
  background: rgba(79, 143, 220, .12);
  border-radius: 20px;
  transition:
    transform .25s var(--ease-spring),
    background .25s var(--ease-out),
    color .25s var(--ease-out);
}

.skill-tag:hover {
  transform: translateY(-3px);
  background: #4f8fdc;
  color: #fff;
}

/* ========== 联系方式 ========== */
.contact-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.contact-item {
  border-bottom: 1px solid #e9e3d6;
}

.contact-item:last-child {
  border-bottom: none;
}

.contact-link {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px 4px;
  text-decoration: none;
  color: inherit;
  transition: transform .25s var(--ease-out);
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
  color: #9298a3;
}

.contact-value {
  flex: 1;
  min-width: 0;
  font-size: 17px;
  font-weight: 600;
  color: #29334a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color .25s var(--ease-out);
}

.contact-link:hover .contact-value {
  color: #3267a8;
}

.contact-arrow {
  flex-shrink: 0;
  font-size: 18px;
  font-weight: 600;
  color: #9298a3;
  transition:
    transform .25s var(--ease-spring),
    color .25s var(--ease-out);
}

.contact-link:hover .contact-arrow {
  color: #4f8fdc;
  transform: translateX(6px);
}

/* ========== 响应式 ========== */
@media (max-width: 768px) {
  .hero {
    padding: 80px 20px 56px;
  }

  .content-wrapper {
    padding: 48px 20px 64px;
  }

  .block {
    padding: 26px;
    margin-bottom: 22px;
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
