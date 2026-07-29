/** * @file About.vue * @description 关于我页面组件（杂志风个人主页） * *
作用：展示博主个人信息与联系方式，杂志风个人主页布局 * - 顶部 Hero：个人卡片（头像、姓名、简介） * -
联系方式：邮箱、GitHub、QQ、微信（如有配置则显示） * - 技能标签区域（静态内容） * -
底部社交链接（点击跳转对应主页） * * 数据获取： * - getSettings() 获取网站设置（键值对对象） *
返回：{ site_name, site_description, author_name, author_bio, author_avatar, * author_email,
author_github, author_qq, author_wechat, ... } * * 设计要点： * - 主色调青绿色 #0d9488 * - Hero
渐变背景 + 头像阴影 * - 联系方式卡片网格，悬浮高亮 * - 技能标签彩色徽章 * - 响应式：移动端单列布局
*/
<template>
  <div class="about-page">
    <!-- Hero 区域：个人卡片（头像 + 姓名 + 简介） -->
    <section class="hero">
      <div class="hero-inner">
        <!-- 头像：存在 author_avatar 展示图片，否则使用默认图标 -->
        <div class="avatar">
          <img v-if="authorAvatar" :src="authorAvatar" :alt="authorName" class="avatar-img" />
          <el-icon v-else :size="56" color="#fff"><UserFilled /></el-icon>
        </div>
        <h1 class="hero-title">{{ authorName }}</h1>
        <p class="hero-subtitle">{{ siteDescription }}</p>
        <p class="hero-bio">{{ authorBio }}</p>
      </div>
      <!-- 装饰光斑（纯视觉，不可交互） -->
      <div class="hero-decoration" aria-hidden="true"></div>
    </section>

    <!-- 主体内容 -->
    <div class="content-wrapper">
      <!-- 联系方式：存在任一联系方式时展示 -->
      <section v-if="hasContact" class="contact-section">
        <div class="section-header">
          <h2 class="section-title">联系方式</h2>
        </div>
        <div class="contact-grid">
          <!-- 邮箱：配置了 author_email 时展示 -->
          <a v-if="authorEmail" :href="`mailto:${authorEmail}`" class="contact-card">
            <div class="contact-icon">
              <el-icon :size="24"><Message /></el-icon>
            </div>
            <div class="contact-info">
              <span class="contact-label">邮箱</span>
              <span class="contact-value">{{ authorEmail }}</span>
            </div>
          </a>

          <!-- GitHub：配置了 author_github 时展示 -->
          <a
            v-if="authorGithub"
            :href="githubUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="contact-card"
          >
            <div class="contact-icon">
              <el-icon :size="24"><Link /></el-icon>
            </div>
            <div class="contact-info">
              <span class="contact-label">GitHub</span>
              <span class="contact-value">{{ authorGithub }}</span>
            </div>
          </a>

          <!-- QQ：配置了 author_qq 时展示 -->
          <div v-if="authorQq" class="contact-card">
            <div class="contact-icon">
              <el-icon :size="24"><ChatDotRound /></el-icon>
            </div>
            <div class="contact-info">
              <span class="contact-label">QQ</span>
              <span class="contact-value">{{ authorQq }}</span>
            </div>
          </div>

          <!-- 微信：配置了 author_wechat 时展示 -->
          <div v-if="authorWechat" class="contact-card">
            <div class="contact-icon">
              <el-icon :size="24"><ChatLineRound /></el-icon>
            </div>
            <div class="contact-info">
              <span class="contact-label">微信</span>
              <span class="contact-value">{{ authorWechat }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 技能标签区域（静态内容） -->
      <section class="skills-section">
        <div class="section-header">
          <h2 class="section-title">技能标签</h2>
        </div>
        <div class="skills-tags">
          <span v-for="skill in skills" :key="skill" class="skill-tag">
            {{ skill }}
          </span>
        </div>
      </section>

      <!-- 底部社交链接：存在可跳转社交账号时展示 -->
      <section v-if="hasSocial" class="social-section">
        <div class="section-header">
          <h2 class="section-title">关注我</h2>
        </div>
        <div class="social-links">
          <!-- GitHub 主页跳转 -->
          <a
            v-if="authorGithub"
            :href="githubUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="social-link"
          >
            <el-icon :size="20"><Link /></el-icon>
            <span>GitHub</span>
          </a>
          <!-- 邮件联系 -->
          <a v-if="authorEmail" :href="`mailto:${authorEmail}`" class="social-link">
            <el-icon :size="20"><Message /></el-icon>
            <span>发送邮件</span>
          </a>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { UserFilled, Message, Link, ChatDotRound, ChatLineRound } from '@element-plus/icons-vue';
import { getSettings } from '../../api/settings';

/** 网站设置（键值对对象，初始为空对象） */
const settings = ref({});

/** 静态技能标签列表 */
const skills = [
  'Vue 3',
  'Composition API',
  'Element Plus',
  'JavaScript',
  'TypeScript',
  'Node.js',
  'Express',
  'MySQL',
  'Vite',
  'Pinia',
  'Vue Router',
  'ECharts'
];

/** 博主姓名（取自设置，兜底为默认值） */
const authorName = computed(() => settings.value.author_name || '匿名博主');

/** 博主简介（取自设置，兜底为默认值） */
const authorBio = computed(() => settings.value.author_bio || '热爱技术，喜欢分享。');

/** 博主头像 URL（取自设置，无则为空） */
const authorAvatar = computed(() => settings.value.author_avatar || '');

/** 站点描述（取自设置，兜底为默认值） */
const siteDescription = computed(() => settings.value.site_description || '分享技术，记录成长');

/** 博主邮箱（取自设置，无则为空） */
const authorEmail = computed(() => settings.value.author_email || '');

/** 博主 GitHub 账号（取自设置，无则为空，可为完整 URL 或用户名） */
const authorGithub = computed(() => settings.value.author_github || '');

/** 博主 QQ（取自设置，无则为空） */
const authorQq = computed(() => settings.value.author_qq || '');

/** 博主微信（取自设置，无则为空） */
const authorWechat = computed(() => settings.value.author_wechat || '');

/**
 * GitHub 完整访问 URL
 * - 已是完整 URL（以 http 开头）直接使用
 * - 否则拼接 https://github.com/ 前缀
 * @returns {string} GitHub 主页地址
 */
const githubUrl = computed(() => {
  const gh = authorGithub.value;
  // 为空时返回空字符串
  if (!gh) return '';
  // 已是完整 URL 直接使用，否则拼接前缀
  if (/^https?:\/\//i.test(gh)) return gh;
  return `https://github.com/${gh}`;
});

/**
 * 是否存在任一联系方式（控制联系方式区块展示）
 * @returns {boolean} 存在联系方式返回 true
 */
const hasContact = computed(() =>
  Boolean(authorEmail.value || authorGithub.value || authorQq.value || authorWechat.value)
);

/**
 * 是否存在可跳转的社交链接（控制底部社交区块展示）
 * @returns {boolean} 存在可跳转社交账号返回 true
 */
const hasSocial = computed(() => Boolean(authorEmail.value || authorGithub.value));

/**
 * 加载网站设置
 * 失败时使用默认值，不阻断页面渲染
 * @returns {Promise<void>}
 */
async function loadSettings() {
  try {
    const { data } = await getSettings();
    // 仅在返回非空对象时合并，避免覆盖默认值
    if (data && typeof data === 'object') {
      settings.value = data;
    }
  } catch (e) {
    console.error('加载网站设置失败:', e);
  }
}

onMounted(() => {
  loadSettings();
});
</script>

<style scoped>
.about-page {
  --color-primary: #0d9488; /* 主色：青绿 */
  --color-primary-dark: #0f766e; /* 主色深 */
  --color-primary-light: #14b8a6; /* 主色浅 */
  --color-text: #0f172a; /* 主文本 */
  --color-text-secondary: #475569; /* 次级文本 */
  --color-text-muted: #94a3b8; /* 弱化文本 */
  --color-bg: #ffffff; /* 卡片背景 */
  --color-bg-soft: #f8fafc; /* 页面背景 */
  --color-border: #e2e8f0; /* 分割线 */
  --max-width: 960px; /* 内容最大宽度 */
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

/* 头像 */
.avatar {
  width: 128px;
  height: 128px;
  margin: 0 auto 24px;
  border-radius: 50%;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.2);
  border: 4px solid rgba(255, 255, 255, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.25);
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero-title {
  margin: 0 0 12px;
  font-size: 44px;
  font-weight: 800;
  letter-spacing: -1.5px;
  text-shadow: 0 2px 20px rgba(0, 0, 0, 0.15);
}

.hero-subtitle {
  margin: 0 0 16px;
  font-size: 18px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  letter-spacing: 0.5px;
}

.hero-bio {
  margin: 0 auto;
  max-width: 560px;
  font-size: 15px;
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.85);
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

/* 区块间距 */
.contact-section,
.skills-section,
.social-section {
  margin-bottom: 48px;
}

.contact-section:last-child,
.skills-section:last-child,
.social-section:last-child {
  margin-bottom: 0;
}

/* 区块标题 */
.section-header {
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

/* ========== 联系方式 ========== */
.contact-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr); /* 桌面端 2 列 */
  gap: 16px;
}

.contact-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  text-decoration: none;
  color: inherit;
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease,
    border-color 0.3s ease;
}

/* 联系卡片悬浮：上移 + 主色边框 */
.contact-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.1);
  border-color: rgba(13, 148, 136, 0.4);
}

.contact-icon {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: rgba(13, 148, 136, 0.1);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.contact-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.contact-label {
  font-size: 12px;
  color: var(--color-text-muted);
}

.contact-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  /* 值最多 1 行，超出截断 */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ========== 技能标签 ========== */
.skills-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.skill-tag {
  padding: 8px 18px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-primary);
  background: rgba(13, 148, 136, 0.08);
  border: 1px solid rgba(13, 148, 136, 0.2);
  border-radius: 20px;
  transition:
    background 0.2s ease,
    transform 0.2s ease;
  cursor: default;
}

/* 技能标签悬浮：背景加深 + 轻微上移 */
.skill-tag:hover {
  background: rgba(13, 148, 136, 0.15);
  transform: translateY(-2px);
}

/* ========== 底部社交链接 ========== */
.social-links {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.social-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%);
  text-decoration: none;
  border-radius: 24px;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

/* 社交链接悬浮：上移 + 阴影增强 */
.social-link:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(13, 148, 136, 0.35);
}

/* ========== 响应式 ========== */
/* 手机：单列布局 */
@media (max-width: 768px) {
  .hero {
    padding: 56px 20px 48px;
  }

  .avatar {
    width: 96px;
    height: 96px;
  }

  .hero-title {
    font-size: 32px;
  }

  .hero-subtitle {
    font-size: 16px;
  }

  .content-wrapper {
    padding: 32px 16px 48px;
  }

  .contact-grid {
    grid-template-columns: 1fr;
  }

  .section-title {
    font-size: 20px;
  }
}
</style>
