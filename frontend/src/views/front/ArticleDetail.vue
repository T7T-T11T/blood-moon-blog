/** * ArticleDetail.vue - 文章详情页（沉浸式阅读体验） * * 功能： * - 文章正文渲染 * - 右侧 TOC
目录导航（桌面端固定悬浮，移动端折叠下拉） * - 阅读进度条 + 返回顶部（ReadingProgress 组件） * -
文章内图片懒加载（基于 IntersectionObserver 后处理） * - 评论区 */
<template>
  <div class="article-detail">
    <!-- 阅读进度条 + 返回顶部 -->
    <ReadingProgress />

    <!-- 返回按钮 -->
    <div class="back-bar">
      <button class="back-btn" @click="goBack">
        <el-icon><ArrowLeft /></el-icon>
        <span>返回</span>
      </button>
    </div>

    <!-- 面包屑导航 -->
    <nav v-if="article" class="breadcrumb">
      <router-link to="/" class="breadcrumb-item">首页</router-link>
      <span class="breadcrumb-separator">/</span>
      <router-link
        v-if="article.category_slug"
        :to="`/category/${article.category_slug}`"
        class="breadcrumb-item"
      >
        {{ article.category_name }}
      </router-link>
      <span v-if="article.category_slug" class="breadcrumb-separator">/</span>
      <span class="breadcrumb-current">{{ article.title }}</span>
    </nav>

    <!-- 移动端 TOC 下拉 -->
    <div v-if="tocItems.length > 0" class="toc-mobile">
      <button class="toc-mobile-toggle" @click="tocMobileOpen = !tocMobileOpen">
        <el-icon><List /></el-icon>
        <span>目录</span>
        <el-icon class="toc-chevron" :class="{ open: tocMobileOpen }"><ArrowDown /></el-icon>
      </button>
      <transition name="toc-slide">
        <nav v-if="tocMobileOpen" class="toc-mobile-dropdown">
          <a
            v-for="item in tocItems"
            :key="item.id"
            :href="`#${item.id}`"
            class="toc-mobile-item"
            :class="{
              'toc-h2': item.level === 2,
              'toc-h3': item.level === 3,
              active: activeTocId === item.id
            }"
            @click.prevent="scrollToHeading(item.id)"
          >
            {{ item.text }}
          </a>
        </nav>
      </transition>
    </div>

    <!-- 文章正文 -->
    <article v-if="article" class="article-content">
      <header class="article-header reveal">
        <div class="article-meta">
          <router-link
            v-if="article.category_slug"
            :to="`/category/${article.category_slug}`"
            class="meta-category"
          >
            {{ article.category_name }}
          </router-link>
          <span class="meta-item">
            <el-icon><Clock /></el-icon>
            {{ formatDate(article.created_at) }}
          </span>
          <span class="meta-item">
            <el-icon><View /></el-icon>
            {{ article.view_count }} 阅读
          </span>
          <span class="meta-item reading-time">
            <el-icon><Timer /></el-icon>
            约 {{ readingTime }} 分钟
          </span>
        </div>
        <h1 class="article-title">{{ article.title }}</h1>
        <p v-if="article.summary" class="article-summary">{{ article.summary }}</p>
      </header>

      <figure v-if="article.cover_image && !coverImageError" class="article-cover reveal">
        <img
          :src="article.cover_image"
          :alt="article.title"
          loading="lazy"
          @error="coverImageError = true"
        />
      </figure>

      <!-- Markdown 正文（含 id 锚点的标题） -->
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div ref="articleBodyRef" class="article-body reveal" v-html="renderedContent"></div>

      <section v-if="article.tags && article.tags.length > 0" class="article-tags reveal">
        <router-link
          v-for="tag in article.tags"
          :key="tag.id"
          :to="`/tag/${tag.slug}`"
          class="tag-item"
        >
          #{{ tag.name }}
        </router-link>
      </section>

      <section class="share-bar reveal">
        <span class="share-label">分享到</span>
        <button class="share-btn wechat" @click="shareWechat">
          <el-icon><ChatDotRound /></el-icon>
          <span>微信</span>
        </button>
        <button class="share-btn weibo" @click="shareWeibo">
          <el-icon><Share /></el-icon>
          <span>微博</span>
        </button>
        <button class="share-btn copy" @click="copyLink">
          <el-icon><Link /></el-icon>
          <span>复制链接</span>
        </button>
      </section>

      <section class="interaction-bar reveal">
        <button class="interact-btn like-btn" :class="{ active: liked }" @click="handleToggleLike">
          <el-icon><StarFilled v-if="liked" /><Star v-else /></el-icon>
          <span>{{ liked ? '已点赞' : '点赞' }}</span>
          <span v-if="likeCount > 0" class="interact-count">{{ likeCount }}</span>
        </button>
      </section>

      <footer class="article-footer reveal">
        <router-link
          v-if="article.prev_article"
          :to="`/article/${article.prev_article.id}`"
          class="nav-card prev"
        >
          <span class="nav-direction"
            ><el-icon><ArrowLeft /></el-icon>上一篇</span
          >
          <span class="nav-title">{{ article.prev_article.title }}</span>
        </router-link>
        <div v-else class="nav-card placeholder"></div>

        <router-link
          v-if="article.next_article"
          :to="`/article/${article.next_article.id}`"
          class="nav-card next"
        >
          <span class="nav-direction"
            >下一篇<el-icon><ArrowRight /></el-icon
          ></span>
          <span class="nav-title">{{ article.next_article.title }}</span>
        </router-link>
        <div v-else class="nav-card placeholder"></div>
      </footer>
    </article>

    <!-- 桌面端 TOC 侧边栏 -->
    <aside v-if="tocItems.length > 0" class="toc-sidebar">
      <div class="toc-sidebar-inner">
        <h4 class="toc-title">目录</h4>
        <nav class="toc-nav">
          <a
            v-for="item in tocItems"
            :key="item.id"
            :href="`#${item.id}`"
            class="toc-link"
            :class="{
              'toc-h2': item.level === 2,
              'toc-h3': item.level === 3,
              active: activeTocId === item.id
            }"
            @click.prevent="scrollToHeading(item.id)"
          >
            {{ item.text }}
          </a>
        </nav>
      </div>
    </aside>

    <!-- 相关文章推荐 -->
    <section v-if="relatedArticles.length > 0" class="related-section reveal">
      <h3 class="related-title">相关推荐</h3>
      <div class="related-grid">
        <router-link
          v-for="related in relatedArticles"
          :key="related.id"
          :to="`/article/${related.id}`"
          class="related-card"
        >
          <div class="related-cover">
            <img
              v-if="related.cover_image"
              :src="related.cover_image"
              :alt="related.title"
              loading="lazy"
            />
            <div v-else class="cover-placeholder">
              <el-icon><Document /></el-icon>
            </div>
          </div>
          <div class="related-content">
            <h4 class="related-card-title">{{ related.title }}</h4>
            <p class="related-excerpt">{{ related.summary || '暂无摘要' }}</p>
            <span class="related-meta">
              <el-icon><View /></el-icon>
              {{ related.view_count || 0 }} 阅读
            </span>
          </div>
        </router-link>
      </div>
    </section>

    <!-- 评论区 -->
    <CommentSection v-if="article" :article-id="route.params.id" />

    <!-- 错误状态 -->
    <div v-if="!loading && !article" class="error-state">
      <p class="error-text">文章不存在或已被删除</p>
      <button class="back-home-btn" @click="goHome">返回首页</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { ElMessage } from 'element-plus';
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  View,
  ChatDotRound,
  Share,
  Link,
  List,
  ArrowDown,
  Star,
  StarFilled,
  Document,
  Timer
} from '@element-plus/icons-vue';
import { getArticleDetail, getRelatedArticles } from '../../api/articles';
import { toggleLike, getLikeStatus, getLikeCount } from '../../api/likes';
import { useUserStore } from '../../stores/user';
import CommentSection from '../../components/front/CommentSection.vue';
import ReadingProgress from '../../components/front/ReadingProgress.vue';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const article = ref(null);
const loading = ref(true);
const coverImageError = ref(false);
const articleBodyRef = ref(null);

// ---- 点赞 ----
const liked = ref(false);
const likeCount = ref(0);
const relatedArticles = ref([]);

/**
 * 加载相关文章
 * @param {number} articleId - 文章ID
 */
async function loadRelatedArticles(articleId) {
  try {
    const res = await getRelatedArticles(articleId, 5);
    relatedArticles.value = res.data.data || [];
  } catch (e) {
    console.error('加载相关文章失败：', e);
    relatedArticles.value = [];
  }
}

async function handleToggleLike() {
  if (!userStore.token) {
    ElMessage.warning('请先登录');
    return;
  }
  try {
    await toggleLike(article.value.id);
    liked.value = !liked.value;
    likeCount.value += liked.value ? 1 : -1;
    ElMessage.success(liked.value ? '已点赞' : '已取消点赞');
  } catch {
    ElMessage.error('操作失败');
  }
}

async function fetchInteractionStatus() {
  if (!userStore.token || !article.value) return;
  try {
    const [likeRes, countRes] = await Promise.all([
      getLikeStatus(article.value.id).catch(() => ({ data: { liked: false } })),
      getLikeCount(article.value.id).catch(() => ({ data: { count: 0 } }))
    ]);
    liked.value = likeRes.data?.liked || false;
    likeCount.value = countRes.data?.count || 0;
  } catch {
    // 静默失败
  }
}

// ---- TOC 相关 ----
const tocMobileOpen = ref(false);
const activeTocId = ref('');

/** 从 Markdown 原文提取 h2/h3 标题并生成唯一 id */
const tocItems = computed(() => {
  if (!article.value || !article.value.content) return [];
  const headings = [];
  const lines = article.value.content.split('\n');
  let h2Index = 0;
  let h3Index = 0;

  for (const line of lines) {
    const h2Match = line.match(/^##\s+(.+)/);
    const h3Match = line.match(/^###\s+(.+)/);
    if (h2Match) {
      h2Index++;
      h3Index = 0;
      const text = h2Match[1].trim();
      headings.push({ id: `heading-${h2Index}-0`, text, level: 2 });
    } else if (h3Match) {
      h3Index++;
      const text = h3Match[1].trim();
      headings.push({ id: `heading-${h2Index}-${h3Index}`, text, level: 3 });
    }
  }
  return headings;
});

// ---- Reveal 动画 Observer ----
let revealObserver = null;

// ---- 图片懒加载 Observer ----
let lazyImgObserver = null;

/**
 * 计算阅读时间（按中文约 500 字/分钟，英文约 200 词/分钟）
 * @returns {number} 预估阅读时间（分钟）
 */
const readingTime = computed(() => {
  if (!article.value || !article.value.content) return 1;
  const text = article.value.content.replace(/<[^>]+>/g, ''); // 去除 HTML 标签
  const charCount = text.length;
  // 平均阅读速度：约 400 字/分钟
  const minutes = Math.ceil(charCount / 400);
  return Math.max(1, minutes);
});

const renderedContent = computed(() => {
  if (!article.value || !article.value.content) return '';
  let html = DOMPurify.sanitize(marked(article.value.content));

  // 给 h2/h3 加上 id 锚点
  let h2Count = 0;
  let h3Count = 0;
  html = html.replace(/<(h[23])>(.*?)<\/\1>/gi, (match, tag, text) => {
    let id;
    if (tag === 'h2') {
      h2Count++;
      h3Count = 0;
      id = `heading-${h2Count}-0`;
    } else {
      h3Count++;
      id = `heading-${h2Count}-${h3Count}`;
    }
    return `<${tag} id="${id}">${text}</${tag}>`;
  });

  // 将 img 标签改为懒加载占位（data-src + class）
  html = html.replace(/<img\s/g, '<img loading="lazy" class="lazy-img" ');

  return html;
});

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

async function loadArticle() {
  loading.value = true;
  coverImageError.value = false;
  try {
    const id = route.params.id;
    const { data } = await getArticleDetail(id);
    article.value = data;
    await nextTick();
    initRevealObserver();
    initLazyImages();
    updateActiveToc();
    fetchInteractionStatus();
    // 加载相关文章
    loadRelatedArticles(id);
  } catch (e) {
    console.error('加载文章失败:', e);
    article.value = null;
  } finally {
    loading.value = false;
  }
}

function initRevealObserver() {
  if (revealObserver) revealObserver.disconnect();
  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.05, rootMargin: '0px 0px -40px 0px' }
  );
  document.querySelectorAll('.article-detail .reveal').forEach((el) => revealObserver.observe(el));
}

/** 对文章正文中的 img 标签设置 IntersectionObserver 懒加载 */
function initLazyImages() {
  if (lazyImgObserver) lazyImgObserver.disconnect();

  const imgs = articleBodyRef.value?.querySelectorAll('img.lazy-img');
  if (!imgs || imgs.length === 0) return;

  lazyImgObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target;
          // 已加载过的跳过
          if (img.dataset.lazyLoaded === 'true') {
            lazyImgObserver.unobserve(img);
            return;
          }
          img.dataset.lazyLoaded = 'true';

          // 如果 src 是有效 URL，淡入显示
          if (img.src && !img.src.startsWith('data:')) {
            img.style.opacity = '0';
            img.style.transition = 'opacity 0.4s ease';
            const preloader = new Image();
            preloader.onload = () => {
              img.style.opacity = '1';
              img.classList.add('lazy-loaded');
            };
            preloader.onerror = () => {
              img.classList.add('lazy-error');
            };
            preloader.src = img.src;
          }
          lazyImgObserver.unobserve(img);
        }
      });
    },
    { rootMargin: '200px 0px', threshold: 0.01 }
  );

  imgs.forEach((img) => {
    lazyImgObserver.observe(img);
  });
}

// ---- TOC 滚动监听 ----
function updateActiveToc() {
  const headingElements = articleBodyRef.value?.querySelectorAll('h2[id], h3[id]');
  if (!headingElements || headingElements.length === 0) return;

  const scrollTop = window.scrollY + 120; // 偏移量

  let currentId = '';
  headingElements.forEach((el) => {
    if (el.offsetTop <= scrollTop) {
      currentId = el.id;
    }
  });
  activeTocId.value = currentId;
}

function scrollToHeading(id) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    tocMobileOpen.value = false;
  }
}

let scrollTicking = false;
function handleScroll() {
  if (!scrollTicking) {
    requestAnimationFrame(() => {
      updateActiveToc();
      scrollTicking = false;
    });
    scrollTicking = true;
  }
}

function goBack() {
  router.back();
}
function goHome() {
  router.push('/');
}

function getArticleUrl() {
  return window.location.href;
}
function getArticleTitle() {
  return article.value?.title || '';
}

function copyToClipboard(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
  } else {
    const input = document.createElement('input');
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
  }
}

function shareWechat() {
  copyToClipboard(getArticleUrl());
  ElMessage.success('链接已复制，快去微信粘贴分享吧');
}

function shareWeibo() {
  const url = encodeURIComponent(getArticleUrl());
  const title = encodeURIComponent(getArticleTitle());
  window.open(`https://service.weibo.com/share/share.php?url=${url}&title=${title}`, '_blank');
}

function copyLink() {
  copyToClipboard(getArticleUrl());
  ElMessage.success('链接已复制到剪贴板');
}

watch(
  () => route.params.id,
  (newId, oldId) => {
    if (newId && newId !== oldId) {
      loadArticle();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
);

onMounted(() => {
  loadArticle();
  window.addEventListener('scroll', handleScroll, { passive: true });
});

onUnmounted(() => {
  if (revealObserver) revealObserver.disconnect();
  if (lazyImgObserver) lazyImgObserver.disconnect();
  window.removeEventListener('scroll', handleScroll);
});
</script>

<style scoped>
/* ========== 整体布局 ========== */
.article-detail {
  position: relative;
  max-width: 800px;
  margin: 0 auto;
  padding: 32px 32px 80px;
}

/* ========== 返回按钮 ========== */
.back-bar {
  margin-bottom: 32px;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 20px;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition:
    color 0.25s,
    border-color 0.25s,
    background 0.25s,
    transform 0.25s;
}

.back-btn:hover {
  color: var(--primary);
  border-color: var(--primary);
  background: var(--primary-bg);
  transform: translateX(-3px);
}

/* ========== 移动端 TOC 下拉 ========== */
.toc-mobile {
  display: none;
  margin-bottom: 20px;
}

.toc-mobile-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 16px;
  background: var(--bg-body);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: border-color 0.2s;
}

.toc-mobile-toggle:hover {
  border-color: var(--primary);
}

.toc-chevron {
  margin-left: auto;
  transition: transform 0.25s;
}
.toc-chevron.open {
  transform: rotate(180deg);
}

.toc-mobile-dropdown {
  margin-top: 8px;
  padding: 12px 16px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  max-height: 320px;
  overflow-y: auto;
}

.toc-mobile-item {
  display: block;
  padding: 6px 0;
  font-size: 13px;
  color: var(--text-secondary);
  text-decoration: none;
  border-left: 2px solid transparent;
  padding-left: 12px;
  transition:
    color 0.2s,
    border-color 0.2s;
}

.toc-mobile-item.toc-h3 {
  padding-left: 24px;
  font-size: 12px;
}

.toc-mobile-item:hover,
.toc-mobile-item.active {
  color: var(--primary);
  border-left-color: var(--primary);
}

/* ========== 桌面端 TOC 侧边栏 ========== */
.toc-sidebar {
  position: fixed;
  right: max(32px, calc((100vw - 1200px) / 2));
  top: 120px;
  width: 200px;
  z-index: 50;
  display: block;
}

.toc-sidebar-inner {
  padding: 20px 0;
  border-left: 1px solid var(--border);
  padding-left: 20px;
}

.toc-title {
  margin: 0 0 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.toc-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: calc(100vh - 250px);
  overflow-y: auto;
}

.toc-link {
  display: block;
  padding: 5px 12px;
  font-size: 13px;
  color: var(--text-secondary);
  text-decoration: none;
  border-left: 2px solid transparent;
  margin-left: -21px;
  padding-left: 19px;
  transition:
    color 0.2s,
    border-color 0.2s,
    background 0.2s;
  border-radius: 0 4px 4px 0;
  line-height: 1.4;
}

.toc-link.toc-h3 {
  padding-left: 31px;
  font-size: 12px;
}

.toc-link:hover {
  color: var(--primary);
  background: rgba(220, 38, 38, 0.05);
}

.toc-link.active {
  color: var(--primary);
  border-left-color: var(--primary);
  background: rgba(220, 38, 38, 0.08);
  font-weight: 600;
}

/* ========== 文章头部 ========== */
.article-header {
  margin-bottom: 40px;
  padding-bottom: 32px;
  border-bottom: 1px solid var(--border);
}

.article-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 20px;
  font-size: 13px;
  color: var(--text-tertiary);
}

.meta-category {
  padding: 4px 12px;
  font-weight: 600;
  color: var(--primary);
  background: var(--primary-bg);
  border-radius: 12px;
  text-decoration: none;
  transition: background 0.25s;
}
.meta-category:hover {
  background: rgba(220, 38, 38, 0.18);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.article-title {
  margin: 0 0 20px;
  font-size: clamp(28px, 4vw, 42px);
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1.25;
  letter-spacing: -1px;
}

.article-summary {
  margin: 0;
  padding-left: 16px;
  font-size: 16px;
  font-style: italic;
  color: var(--text-secondary);
  line-height: 1.7;
  border-left: 3px solid var(--primary);
}

/* ========== 封面图 ========== */
.article-cover {
  margin: 0 0 40px;
  border-radius: 14px;
  overflow: hidden;
}
.article-cover img {
  width: 100%;
  height: auto;
  display: block;
  max-height: 480px;
  object-fit: cover;
}

/* ========== Markdown 正文 ========== */
.article-body {
  font-size: 17px;
  line-height: 1.8;
  color: #334155;
}

.article-body :deep(h1) {
  font-size: 32px;
  margin: 48px 0 24px;
  padding-bottom: 12px;
  border-bottom: 2px solid var(--border);
  color: var(--text-primary);
}

.article-body :deep(h2) {
  font-size: 26px;
  margin: 40px 0 20px;
  color: var(--text-primary);
  scroll-margin-top: 100px;
}

.article-body :deep(h3) {
  font-size: 22px;
  margin: 32px 0 16px;
  color: var(--text-primary);
  scroll-margin-top: 100px;
}

.article-body :deep(p) {
  margin: 16px 0;
}

.article-body :deep(ul),
.article-body :deep(ol) {
  padding-left: 24px;
  margin: 16px 0;
}
.article-body :deep(li) {
  margin: 8px 0;
}

.article-body :deep(code) {
  padding: 2px 8px;
  background: #f1f5f9;
  border-radius: 4px;
  font-size: 15px;
  color: var(--primary-dark);
  font-family: var(--font-mono);
}

.article-body :deep(pre) {
  padding: 20px;
  background: #1e293b;
  color: #e2e8f0;
  border-radius: 12px;
  overflow-x: auto;
  margin: 24px 0;
  font-size: 14px;
  line-height: 1.6;
}
.article-body :deep(pre code) {
  padding: 0;
  background: transparent;
  color: inherit;
  font-size: inherit;
}

.article-body :deep(blockquote) {
  margin: 24px 0;
  padding: 16px 24px;
  background: rgba(220, 38, 38, 0.05);
  border-left: 4px solid var(--primary);
  border-radius: 0 8px 8px 0;
  color: var(--text-secondary);
}

.article-body :deep(a) {
  color: var(--primary);
  text-decoration: none;
  border-bottom: 1px dashed var(--primary);
  transition: border-style 0.2s;
}
.article-body :deep(a:hover) {
  border-bottom-style: solid;
}

.article-body :deep(img) {
  max-width: 100%;
  border-radius: 8px;
  margin: 16px 0;
}

.article-body :deep(img.lazy-img) {
  opacity: 0;
  transition: opacity 0.4s ease;
}
.article-body :deep(img.lazy-loaded) {
  opacity: 1;
}
.article-body :deep(img.lazy-error) {
  opacity: 0.3;
  filter: grayscale(1);
}

.article-body :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 24px 0;
}
.article-body :deep(th),
.article-body :deep(td) {
  border: 1px solid var(--border);
  padding: 10px 16px;
  text-align: left;
}
.article-body :deep(th) {
  background: var(--bg-body);
  font-weight: 600;
}

/* ========== 标签 ========== */
.article-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 48px;
  padding-top: 28px;
  border-top: 1px solid var(--border);
}

.tag-item {
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 500;
  color: var(--primary);
  background: var(--primary-bg);
  border-radius: 16px;
  text-decoration: none;
  transition:
    background 0.25s,
    transform 0.25s;
}
.tag-item:hover {
  background: var(--primary);
  color: #fff;
  transform: translateY(-2px);
}

/* ========== 分享栏 ========== */
.share-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 40px;
  padding-top: 28px;
  border-top: 1px solid var(--border);
}

.share-label {
  font-size: 13px;
  color: var(--text-tertiary);
  margin-right: 4px;
}

.share-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 500;
  border: 1px solid var(--border);
  border-radius: 20px;
  background: var(--bg-hover);
  color: var(--text-secondary);
  cursor: pointer;
  transition:
    color 0.25s,
    border-color 0.25s,
    background 0.25s,
    transform 0.25s;
}
.share-btn:hover {
  transform: translateY(-2px);
}
.share-btn.wechat:hover {
  color: #07c160;
  border-color: #07c160;
  background: rgba(7, 193, 96, 0.06);
}
.share-btn.weibo:hover {
  color: #e6162d;
  border-color: #e6162d;
  background: rgba(230, 22, 45, 0.06);
}
.share-btn.copy:hover {
  color: var(--primary);
  border-color: var(--primary);
  background: var(--primary-bg);
}

/* ========== 点赞/收藏栏 ========== */
.interaction-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 28px;
  padding-top: 24px;
  justify-content: center;
}

.interact-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 500;
  border: 1px solid var(--border);
  border-radius: 24px;
  background: var(--bg-hover);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.25s;
}

.interact-btn:hover {
  transform: translateY(-2px);
}

.interact-btn.like-btn:hover,
.interact-btn.like-btn.active {
  color: #f59e0b;
  border-color: #f59e0b;
  background: rgba(245, 158, 11, 0.08);
}

.interact-btn.fav-btn:hover,
.interact-btn.fav-btn.active {
  color: #ef4444;
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
}

.interact-count {
  font-size: 12px;
  opacity: 0.7;
}

/* ========== 上一篇 / 下一篇 ========== */
.article-footer {
  display: flex;
  gap: 24px;
  margin-top: 48px;
  padding-top: 28px;
  border-top: 1px solid var(--border);
}

.nav-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 20px;
  background: var(--bg-body);
  border-radius: 12px;
  text-decoration: none;
  color: var(--text-secondary);
  transition:
    background 0.25s,
    color 0.25s,
    transform 0.25s;
  min-width: 0;
}
.nav-card:hover {
  background: var(--primary-bg);
  color: var(--primary);
  transform: translateY(-3px);
}
.nav-card.placeholder {
  background: transparent;
  pointer-events: none;
}

.nav-direction {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--text-tertiary);
  text-transform: uppercase;
}
.nav-card.next {
  text-align: right;
  align-items: flex-end;
}
.nav-card.next .nav-direction {
  flex-direction: row-reverse;
}

.nav-title {
  font-size: 15px;
  font-weight: 600;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.5;
}

/* ========== 错误状态 ========== */
.error-state {
  text-align: center;
  padding: 80px 20px;
}
.error-text {
  margin: 0 0 24px;
  font-size: 16px;
  color: var(--text-secondary);
}
.back-home-btn {
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: var(--primary);
  border: none;
  border-radius: 20px;
  cursor: pointer;
  transition:
    background 0.25s,
    transform 0.25s;
}
.back-home-btn:hover {
  background: var(--primary-dark);
  transform: translateY(-2px);
}

/* ========== 滚动揭示 ========== */
.reveal {
  opacity: 0;
  transform: translateY(24px);
  transition:
    opacity 0.7s,
    transform 0.7s;
}
.reveal.visible {
  opacity: 1;
  transform: translateY(0);
}

/* TOC 下拉过渡 */
.toc-slide-enter-active,
.toc-slide-leave-active {
  transition:
    max-height 0.3s ease,
    opacity 0.3s ease,
    padding 0.3s ease;
  overflow: hidden;
}
.toc-slide-enter-from,
.toc-slide-leave-to {
  max-height: 0;
  opacity: 0;
  padding-top: 0;
  padding-bottom: 0;
}
.toc-slide-enter-to,
.toc-slide-leave-from {
  max-height: 400px;
  opacity: 1;
}

/* ========== 响应式 ========== */
@media (max-width: 1200px) {
  .toc-sidebar {
    display: none;
  }
}

@media (max-width: 768px) {
  .article-detail {
    padding: 24px 20px 64px;
  }
  .article-header {
    margin-bottom: 32px;
    padding-bottom: 24px;
  }
  .article-footer {
    flex-direction: column;
    gap: 16px;
  }
  .nav-card.next {
    text-align: left;
    align-items: flex-start;
  }
  .nav-card.next .nav-direction {
    flex-direction: row;
  }
  .share-bar {
    flex-wrap: wrap;
    gap: 8px;
  }
  .share-btn {
    padding: 6px 12px;
    font-size: 12px;
  }
  .toc-mobile {
    display: block;
  }
}
</style>

<style scoped>
/* ========== 相关文章推荐 ========== */
.related-section {
  max-width: 900px;
  margin: 48px auto;
  padding: 32px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
}

.related-title {
  font-size: 20px;
  font-weight: 600;
  color: #fff;
  margin: 0 0 24px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.related-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
}

.related-card {
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
}

.related-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 32px rgba(198, 40, 40, 0.1);
  border-color: rgba(198, 40, 40, 0.2);
}

.related-cover {
  width: 100%;
  height: 120px;
  overflow: hidden;
}

.related-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.related-card:hover .related-cover img {
  transform: scale(1.05);
}

.related-cover .cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  color: rgba(255, 255, 255, 0.2);
}

.related-content {
  padding: 12px;
}

.related-card-title {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  margin: 0 0 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.related-excerpt {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.5;
  margin: 0 0 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.related-meta {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  display: flex;
  align-items: center;
  gap: 4px;
}

@media (max-width: 768px) {
  .related-section {
    margin: 32px 16px;
    padding: 20px;
  }
  .related-grid {
    grid-template-columns: 1fr;
  }
}

/* ========== 面包屑导航 ========== */
.breadcrumb {
  max-width: 900px;
  margin: 0 auto 24px;
  padding: 0 24px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.breadcrumb-item {
  color: rgba(255, 255, 255, 0.6);
  text-decoration: none;
  transition: color 0.2s ease;
}

.breadcrumb-item:hover {
  color: #c62828;
}

.breadcrumb-separator {
  color: rgba(255, 255, 255, 0.3);
}

.breadcrumb-current {
  color: rgba(255, 255, 255, 0.9);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .breadcrumb {
    padding: 0 16px;
    font-size: 12px;
  }
  .breadcrumb-current {
    max-width: 120px;
  }
}
</style>
