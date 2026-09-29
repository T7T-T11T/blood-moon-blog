<template>
  <div ref="rootRef" class="links-page">
    <!-- ============ Hero 区域 ============ -->
    <section class="hero">
      <div class="hero-inner">
        <p class="hero-eyebrow animate-fade-in-down">FRIENDS</p>
        <h1 class="hero-title animate-fade-in-up">{{ t('友情链接') }}</h1>
        <p class="hero-tagline animate-fade-in-up delay-100">{{ t('交换链接，共同成长') }}</p>
      </div>
      <GGBondSticker mood="happyWave" size="lg" floating caption="交个朋友吧" :style="{ top: '14px', right: 'clamp(22px, 12vw, 190px)' }" />
    </section>

    <!-- ============ 友链列表 ============ -->
    <AsyncData
      :loading="loading"
      :error="error"
      :empty="links.length === 0 && !loading && !error"
      :error-message="t('加载友链失败，请稍后重试')"
      :empty-message="t('暂无友链')"
      :retry-text="t('重试')"
      @retry="loadLinks"
    >
      <div class="link-grid">
        <article v-for="link in links" :key="link.id" class="link-card reveal">
          <a :href="link.url" target="_blank" rel="noopener noreferrer" class="link-card-inner">
            <img
              v-if="link.avatar_url"
              :src="link.avatar_url"
              :alt="link.name"
              class="link-avatar"
              loading="lazy"
            />
            <div class="link-info">
              <h3 class="link-name">{{ link.name }}<span v-if="link.category && link.category !== '友情链接'" class="link-cat">{{ link.category }}</span></h3>
              <p class="link-desc">{{ link.description }}</p>
            </div>
            <span class="link-arrow" aria-hidden="true">→</span>
          </a>
        </article>
      </div>
    </AsyncData>

    <!-- ============ 申请友链 ============ -->
    <section class="link-apply reveal">
      <h2 class="apply-title">{{ t('申请友链') }}</h2>
      <p class="apply-tip">{{ t('交换链接，共同成长。提交后经管理员审核通过即可展示。') }}</p>
      <form class="apply-form" @submit.prevent="submitApply">
        <div class="apply-row">
          <input
            v-model="applyForm.name"
          :aria-label="t('网站名称（必填）')" required
            type="text"
            class="apply-input"
            :placeholder="t('网站名称 *')"
            maxlength="100"
          />
          <input
            v-model="applyForm.url"
          :aria-label="t('网站地址（必填）')" required
            type="url"
            class="apply-input"
            :placeholder="t('网站地址 https://... *')"
            maxlength="500"
          />
        </div>
        <textarea
          v-model="applyForm.description"
          :aria-label="t('网站简介（可选）')"
          class="apply-textarea"
          :placeholder="t('一句话简介（可选）')"
          rows="3"
          maxlength="200"
        ></textarea>
        <!-- 蜜罐字段（反垃圾） -->
        <input
          v-model="applyForm.website"
          type="text"
          class="honeypot-field"
          tabindex="-1"
          autocomplete="off"
          aria-hidden="true"
        />
        <div class="apply-actions">
          <span class="apply-status" role="status">{{ applyStatus }}</span>
          <button type="submit" class="apply-btn" :disabled="applying">
            {{ applying ? t('提交中…') : t('提交申请') }}
          </button>
        </div>
      </form>
    </section>
  </div>
</template>

<script setup>
import { t } from '@/utils/locale';
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { getLinks, applyLink } from '../../api/links';
import AsyncData from '../../components/common/AsyncData.vue';
import GGBondSticker from '../../components/common/GGBondSticker.vue';

/** 根元素引用，用于 IntersectionObserver 初始化 */
const rootRef = ref(null);
/** 友情链接列表 */
const links = ref([]);
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

/**
 * 加载友情链接列表
 * 从后端获取已审核通过的友链，初始化滚动动画
 * 数据加载完成后设置 loaded 标记，并启动安全超时
 */
async function loadLinks() {
  loading.value = true;
  error.value = false;
  loaded.value = false;
  try {
    const { data } = await getLinks();
    links.value = Array.isArray(data) ? data : (data?.list ?? []);
    await nextTick();
    initObserver();
  } catch (e) {
    console.error('加载友链失败:', e);
    error.value = true;
  } finally {
    loading.value = false;
    loaded.value = true;
    // 安全超时：2秒后强制显示所有内容，防止 Observer 未触发导致内容不可见
    if (revealTimeout) clearTimeout(revealTimeout);
    revealTimeout = setTimeout(() => {
      document.querySelectorAll('.links-page .reveal').forEach((el) => el.classList.add('visible'));
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
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
  );
  rootRef.value.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
}

/**
 * 组件挂载时加载数据
 */
onMounted(() => {
  loadLinks();
});

/**
 * 组件卸载时清理资源
 */
onUnmounted(() => {
  if (observer) observer.disconnect();
  if (revealTimeout) clearTimeout(revealTimeout);
});

/** 友链申请表单状态 */
const applyForm = ref({ name: '', url: '', description: '', website: '' });
const applying = ref(false);
const applyStatus = ref('');

/**
 * 提交友链申请
 * 蜜罐字段被填写时静默丢弃；成功后清空表单
 */
async function submitApply() {
  if (applyForm.value.website) {
    applyForm.value.name = '';
    return;
  }
  const name = applyForm.value.name.trim();
  const url = applyForm.value.url.trim();
  if (!name || !url) {
    applyStatus.value = '请填写网站名称和网址';
    return;
  }
  applying.value = true;
  applyStatus.value = '';
  try {
    await applyLink({ name, url, description: applyForm.value.description.trim() });
    applyStatus.value = '申请已提交，审核通过后展示 ✅';
    applyForm.value.name = '';
    applyForm.value.url = '';
    applyForm.value.description = '';
  } catch (e) {
    applyStatus.value = e?.response?.data?.message || '提交失败，请稍后重试';
  } finally {
    applying.value = false;
  }
}</script>

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
  right: -12%;
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
  font-size: clamp(46px, 7vw, 76px);
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

/* ========== 友链网格 ========== */
.link-grid {
  max-width: 960px;
  margin: 0 auto;
  padding: 56px 32px 40px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.link-card {
  background: rgba(255, 253, 247, .94);
  border: 1px solid #d9d2c2;
  border-radius: 20px;
  box-shadow: 0 12px 30px rgba(79, 113, 143, .08);
  opacity: 0;
  transform: translateY(24px);
  transition:
    opacity .5s var(--ease-out),
    transform .5s var(--ease-out),
    border-color .25s var(--ease-out),
    box-shadow .25s var(--ease-out);
}

.link-card.visible {
  opacity: 1;
  transform: translateY(0);
}

.link-card:hover {
  border-color: #4f8fdc;
  box-shadow: 0 16px 40px rgba(79, 143, 220, .16);
  transform: translateY(-4px);
}

.link-card-inner {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 22px;
  text-decoration: none;
  color: inherit;
}

.link-avatar {
  flex-shrink: 0;
  width: 54px;
  height: 54px;
  border-radius: 16px;
  object-fit: cover;
  border: 2px solid #ffffff;
  box-shadow: 0 3px 10px rgba(79, 113, 143, .18);
}

.link-info {
  flex: 1;
  min-width: 0;
}

.link-name {
  margin: 0 0 6px;
  font-size: 16px;
  font-weight: 800;
  color: #29334a;
  transition: color .2s var(--ease-out);
}

.link-card:hover .link-name {
  color: #3267a8;
}

.link-cat {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 9px;
  vertical-align: 2px;
  font-size: 11px;
  font-weight: 700;
  color: #3979ba;
  background: rgba(79, 143, 220, .12);
  border-radius: 999px;
}

.link-desc {
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
  color: #687184;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.link-arrow {
  flex-shrink: 0;
  font-size: 18px;
  font-weight: 600;
  color: #9298a3;
  transition:
    transform .25s var(--ease-spring),
    color .2s var(--ease-out);
}

.link-card:hover .link-arrow {
  color: #4f8fdc;
  transform: translateX(4px);
}

/* ========== 申请友链 ========== */
.link-apply {
  max-width: 760px;
  margin: 48px auto 0;
  padding: 30px;
  background: rgba(255, 253, 247, .94);
  border: 1px solid #d9d2c2;
  border-radius: 24px;
  box-shadow: 0 14px 36px rgba(67, 93, 118, .08);
}

.apply-title {
  font-size: 20px;
  color: #29334a;
  margin-bottom: 8px;
}

.apply-tip {
  font-size: 13px;
  color: #626b7c;
  margin-bottom: 20px;
}

.apply-row {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.apply-input,
.apply-textarea {
  width: 100%;
  padding: 11px 15px;
  font-size: 14px;
  color: #29334a;
  background: #f4efe2;
  border: 1px solid #d9d2c2;
  border-radius: 12px;
  outline: none;
  transition: border-color .2s, box-shadow .2s;
}

.apply-input:focus,
.apply-textarea:focus {
  border-color: #4f8fdc;
  box-shadow: 0 0 0 3px rgba(79, 143, 220, .16);
}

.apply-textarea {
  resize: vertical;
  margin-bottom: 12px;
}

.honeypot-field {
  position: absolute;
  left: -9999px;
  width: 0;
  height: 0;
  opacity: 0;
  overflow: hidden;
}

.apply-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.apply-status {
  font-size: 13px;
  color: var(--success);
}

.apply-btn {
  padding: 10px 28px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: #4f8fdc;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  transition:
    background .2s,
    transform .2s;
}

.apply-btn:hover:not(:disabled) {
  background: #78b8ef;
  transform: translateY(-2px);
}

.apply-btn:disabled {
  opacity: .6;
  cursor: not-allowed;
}

/* ========== 响应式 ========== */
@media (max-width: 768px) {
  .hero {
    padding: 80px 20px 56px;
  }

  .link-grid {
    padding: 36px 20px 32px;
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .apply-row {
    flex-direction: column;
  }
}
</style>
