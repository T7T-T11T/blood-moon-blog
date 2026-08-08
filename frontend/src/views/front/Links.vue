<template>
  <div ref="rootRef" class="links-page">
    <!-- ============ Hero 区域 ============ -->
    <section class="hero">
      <div class="hero-inner">
        <p class="hero-eyebrow animate-fade-in-down">FRIENDS</p>
        <h1 class="hero-title animate-fade-in-up">友情链接</h1>
        <p class="hero-tagline animate-fade-in-up delay-100">交换链接，共同成长</p>
      </div>
    </section>

    <!-- ============ 友链列表 ============ -->
    <AsyncData
      :loading="loading"
      :error="error"
      :empty="links.length === 0 && !loading && !error"
      error-message="加载友链失败，请稍后重试"
      empty-message="暂无友链"
      retry-text="重试"
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
              <h3 class="link-name">{{ link.name }}</h3>
              <p class="link-desc">{{ link.description }}</p>
            </div>
            <span class="link-arrow" aria-hidden="true">→</span>
          </a>
        </article>
      </div>
    </AsyncData>

    <!-- ============ 申请友链 ============ -->
    <section class="link-apply reveal">
      <h2 class="apply-title">申请友链</h2>
      <p class="apply-tip">交换链接，共同成长。提交后经管理员审核通过即可展示。</p>
      <form class="apply-form" @submit.prevent="submitApply">
        <div class="apply-row">
          <input
            v-model="applyForm.name"
            type="text"
            class="apply-input"
            placeholder="网站名称 *"
            maxlength="100"
          />
          <input
            v-model="applyForm.url"
            type="url"
            class="apply-input"
            placeholder="网站地址 https://... *"
            maxlength="500"
          />
        </div>
        <textarea
          v-model="applyForm.description"
          class="apply-textarea"
          placeholder="一句话简介（可选）"
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
          <span class="apply-status">{{ applyStatus }}</span>
          <button type="submit" class="apply-btn" :disabled="applying">
            {{ applying ? '提交中…' : '提交申请' }}
          </button>
        </div>
      </form>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { getLinks, applyLink } from '../../api/links';
import AsyncData from '../../components/common/AsyncData.vue';

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
/* ========== Hero 区域 ========== */
.hero {
  position: relative;
  padding: 120px 32px 80px;
  background: linear-gradient(
    180deg,
    rgba(6, 9, 18, 0.55) 0%,
    rgba(10, 14, 26, 0.45) 50%,
    rgba(18, 24, 40, 0.65) 100%
  );
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
  width: 480px;
  height: 480px;
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
  margin: 0 0 24px;
  font-size: clamp(48px, 8vw, 80px);
  font-weight: 800;
  letter-spacing: -2px;
  background: linear-gradient(180deg, #ffffff 0%, #fca5a5 60%, #dc2626 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-tagline {
  margin: 0 auto;
  max-width: 560px;
  font-size: clamp(16px, 2vw, 18px);
  font-weight: 400;
  color: rgba(241, 245, 249, 0.6);
  letter-spacing: 1px;
}

/* ========== 友链网格 ========== */
.link-grid {
  max-width: 960px;
  margin: 0 auto;
  padding: 64px 32px 96px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
}

.link-card {
  background: rgba(10, 14, 26, 0.4);
  border: 1px solid var(--border);
  border-radius: 16px;
  backdrop-filter: blur(4px);
  transition:
    border-color 0.3s var(--ease-out),
    transform 0.3s var(--ease-spring),
    box-shadow 0.3s var(--ease-out);
  opacity: 0;
  transform: translateY(24px);
  transition:
    opacity 0.6s var(--ease-out),
    transform 0.6s var(--ease-out),
    border-color 0.3s var(--ease-out),
    box-shadow 0.3s var(--ease-out);
}

.link-card.visible {
  opacity: 1;
  transform: translateY(0);
}
.link-card:hover {
  border-color: var(--primary);
  box-shadow: 0 12px 48px rgba(220, 38, 38, 0.15);
  transform: translateY(-4px);
}
.link-card.visible:hover {
  transform: translateY(-4px);
}

.link-card-inner {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 24px;
  text-decoration: none;
  color: inherit;
}

.link-avatar {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--border);
  transition: border-color 0.3s var(--ease-out);
}

.link-card:hover .link-avatar {
  border-color: var(--primary);
}

.link-info {
  flex: 1;
  min-width: 0;
}

.link-name {
  margin: 0 0 6px;
  font-size: 17px;
  font-weight: 700;
  color: var(--text-primary);
  transition: color 0.25s var(--ease-out);
}

.link-card:hover .link-name {
  color: var(--primary);
}

.link-desc {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-tertiary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.link-arrow {
  flex-shrink: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-tertiary);
  transition:
    transform 0.3s var(--ease-spring),
    color 0.25s var(--ease-out);
}

.link-card:hover .link-arrow {
  color: var(--primary);
  transform: translateX(4px);
}

/* ========== 响应式 ========== */
@media (max-width: 768px) {
  .hero {
    padding: 80px 20px 56px;
  }
  .link-grid {
    padding: 40px 20px 64px;
    grid-template-columns: 1fr;
  }
}

/* ========== 申请友链 ========== */
.link-apply {
  max-width: 760px;
  margin: 56px auto 0;
  padding: 28px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
}

.apply-title {
  font-size: 20px;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.apply-tip {
  font-size: 13px;
  color: var(--text-secondary);
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
  padding: 10px 14px;
  font-size: 14px;
  color: var(--text-primary);
  background: var(--bg-body);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.apply-input:focus,
.apply-textarea:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.12);
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
  background: var(--primary);
  border: none;
  border-radius: 20px;
  cursor: pointer;
  transition:
    background 0.2s,
    transform 0.2s;
}

.apply-btn:hover:not(:disabled) {
  background: var(--primary-light);
  transform: translateY(-2px);
}

.apply-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 640px) {
  .apply-row {
    flex-direction: column;
  }
}</style>
