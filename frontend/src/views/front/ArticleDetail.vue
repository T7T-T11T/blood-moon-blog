/** * @file ArticleDetail.vue * @description 文章详情页 - 沉浸式阅读体验 * * 作用： * -
顶部固定阅读进度条（随滚动填充） * - 文章头部：大标题 + 元信息 + 摘要 * - Markdown 正文（marked
渲染，max-width 800px） * - 标签、上一篇/下一篇导航 * - 树形评论列表 + 回复表单 * - 返回顶部浮动按钮
* * 设计： * - 主色青绿色 #0d9488 * - 阅读优先：800px 内容宽度、行高 1.8 * - 三组动效：阅读进度条 /
内容滚动揭示 / 返回顶部按钮 */
<template>
  <div class="article-detail">
    <!-- 阅读进度条：固定顶部，随滚动填充 -->
    <div class="progress-bar" :style="{ width: progress + '%' }"></div>

    <!-- 返回按钮 -->
    <div class="back-bar">
      <button class="back-btn" @click="goBack">
        <el-icon><ArrowLeft /></el-icon>
        <span>返回</span>
      </button>
    </div>

    <!-- 文章正文 -->
    <article v-if="article" class="article-content">
      <!-- 文章头部 -->
      <header class="article-header reveal">
        <!-- 元信息 -->
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
        </div>

        <!-- 大标题 -->
        <h1 class="article-title">{{ article.title }}</h1>

        <!-- 摘要 -->
        <p v-if="article.summary" class="article-summary">{{ article.summary }}</p>
      </header>

      <!-- 封面图 -->
      <figure v-if="article.cover_image" class="article-cover reveal">
        <img :src="article.cover_image" :alt="article.title" loading="lazy" />
      </figure>

      <!-- Markdown 正文 -->
      <div class="article-body reveal" v-html="renderedContent"></div>

      <!-- 标签 -->
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

      <!-- 分享栏 -->
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

      <!-- 上一篇 / 下一篇 -->
      <footer class="article-footer reveal">
        <router-link
          v-if="article.prev_article"
          :to="`/article/${article.prev_article.id}`"
          class="nav-card prev"
        >
          <span class="nav-direction">
            <el-icon><ArrowLeft /></el-icon>
            上一篇
          </span>
          <span class="nav-title">{{ article.prev_article.title }}</span>
        </router-link>
        <div v-else class="nav-card placeholder"></div>

        <router-link
          v-if="article.next_article"
          :to="`/article/${article.next_article.id}`"
          class="nav-card next"
        >
          <span class="nav-direction">
            下一篇
            <el-icon><ArrowRight /></el-icon>
          </span>
          <span class="nav-title">{{ article.next_article.title }}</span>
        </router-link>
        <div v-else class="nav-card placeholder"></div>
      </footer>
    </article>

    <!-- 评论区 -->
    <section v-if="article" class="comment-section reveal">
      <h2 class="section-title">
        评论
        <span class="comment-count">{{ commentCount }}</span>
      </h2>

      <!-- 评论表单 -->
      <div class="comment-form-wrapper">
        <div v-if="replyTo" class="reply-tip">
          <span>回复 @{{ replyTo.nickname }}</span>
          <button class="cancel-btn" @click="cancelReply">取消</button>
        </div>
        <div class="comment-form">
          <div class="form-row">
            <input
              v-model="commentForm.nickname"
              type="text"
              class="form-input"
              placeholder="昵称 *"
              maxlength="30"
            />
            <input
              v-model="commentForm.email"
              type="email"
              class="form-input"
              placeholder="邮箱 *（不会公开）"
              maxlength="100"
            />
          </div>
          <textarea
            v-model="commentForm.content"
            class="form-textarea"
            placeholder="写下你的评论..."
            rows="4"
            maxlength="500"
          ></textarea>
          <div class="form-actions">
            <button class="submit-btn" :disabled="!canSubmit || submitting" @click="submitComment">
              {{ submitting ? '提交中…' : '发表评论' }}
            </button>
          </div>
        </div>
      </div>

      <!-- 评论列表 -->
      <div v-if="comments.length > 0" class="comment-list">
        <div v-for="comment in comments" :key="comment.id" class="comment-item">
          <div class="comment-main">
            <div class="comment-avatar">
              <img
                v-if="comment.avatar_url"
                :src="comment.avatar_url"
                :alt="comment.nickname"
                class="avatar-img"
              />
              <div v-else class="avatar-placeholder">
                {{ comment.nickname.charAt(0).toUpperCase() }}
              </div>
            </div>
            <div class="comment-body">
              <div class="comment-header">
                <span class="comment-nickname">{{ comment.nickname }}</span>
                <span class="comment-time">{{ formatDate(comment.created_at) }}</span>
              </div>
              <div class="comment-content">{{ comment.content }}</div>
              <button class="reply-btn" @click="setReplyTo(comment)">回复</button>
            </div>
          </div>

          <!-- 子评论：递归渲染 children -->
          <div v-if="comment.children && comment.children.length > 0" class="comment-children">
            <div v-for="child in comment.children" :key="child.id" class="comment-item child">
              <div class="comment-main">
                <div class="comment-avatar">
                  <img
                    v-if="child.avatar_url"
                    :src="child.avatar_url"
                    :alt="child.nickname"
                    class="avatar-img"
                  />
                  <div v-else class="avatar-placeholder">
                    {{ child.nickname.charAt(0).toUpperCase() }}
                  </div>
                </div>
                <div class="comment-body">
                  <div class="comment-header">
                    <span class="comment-nickname">{{ child.nickname }}</span>
                    <span class="comment-time">{{ formatDate(child.created_at) }}</span>
                  </div>
                  <div class="comment-content">{{ child.content }}</div>
                  <button class="reply-btn" @click="setReplyTo(child)">回复</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 评论空状态 -->
      <div v-else class="comment-empty">
        <p class="empty-text">暂无评论，快来抢沙发吧！</p>
      </div>
    </section>

    <!-- 错误状态 -->
    <div v-if="!loading && !article" class="error-state">
      <p class="error-text">文章不存在或已被删除</p>
      <button class="back-home-btn" @click="goHome">返回首页</button>
    </div>

    <!-- 返回顶部浮动按钮 -->
    <transition name="fade-scale">
      <button v-if="showBackTop" class="back-top" aria-label="返回顶部" @click="scrollToTop">
        <el-icon><Top /></el-icon>
      </button>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { marked } from 'marked';
import { ElMessage } from 'element-plus';
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  View,
  Top,
  ChatDotRound,
  Share,
  Link
} from '@element-plus/icons-vue';
import { getArticleDetail } from '../../api/articles';
import { getComments, postComment } from '../../api/comments';

const route = useRoute();
const router = useRouter();

/** 文章数据 */
const article = ref(null);

/** 评论树形列表 */
const comments = ref([]);

/** 加载状态 */
const loading = ref(true);

/** 评论提交中状态 */
const submitting = ref(false);

/** 当前回复目标（null 表示顶级评论） */
const replyTo = ref(null);

/** 阅读进度（0-100） */
const progress = ref(0);

/** 是否显示返回顶部按钮 */
const showBackTop = ref(false);

/** Intersection Observer 实例 */
let observer = null;

/** 评论表单 */
const commentForm = ref({
  nickname: '',
  email: '',
  content: ''
});

/**
 * 渲染后的 Markdown HTML
 * @returns {string}
 */
const renderedContent = computed(() => {
  if (!article.value || !article.value.content) return '';
  return marked(article.value.content);
});

/**
 * 评论总数（含子回复）
 * @returns {number}
 */
const commentCount = computed(() => {
  let count = 0;
  for (const comment of comments.value) {
    count += 1;
    if (comment.children && Array.isArray(comment.children)) {
      count += comment.children.length;
    }
  }
  return count;
});

/**
 * 是否可提交评论
 * @returns {boolean}
 */
const canSubmit = computed(() => {
  return (
    commentForm.value.nickname.trim() !== '' &&
    commentForm.value.email.trim() !== '' &&
    commentForm.value.content.trim() !== ''
  );
});

/**
 * 格式化日期 YYYY-MM-DD
 * @param {string} dateStr
 * @returns {string}
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 滚动监听：更新阅读进度 + 控制返回顶部按钮显隐
 * - 进度 = 已滚动距离 / (文档总高 - 视口高) * 100
 * - 滚动超过 400px 显示返回顶部
 */
function handleScroll() {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  // 兜底：文档高度小于视口时进度为 0
  progress.value = docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0;
  showBackTop.value = scrollTop > 400;
}

/**
 * 平滑滚动到顶部
 */
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * 加载文章详情
 * @returns {Promise<void>}
 */
async function loadArticle() {
  loading.value = true;
  try {
    const id = route.params.id;
    const { data } = await getArticleDetail(id);
    article.value = data;
    // 文章加载后并行：加载评论 + 初始化滚动揭示
    loadComments();
    await nextTick();
    initObserver();
  } catch (e) {
    console.error('加载文章失败:', e);
    article.value = null;
  } finally {
    loading.value = false;
  }
}

/**
 * 加载评论列表
 * @returns {Promise<void>}
 */
async function loadComments() {
  try {
    const id = route.params.id;
    const { data } = await getComments(id);
    comments.value = Array.isArray(data) ? data : (data?.list ?? []);
  } catch (e) {
    console.error('加载评论失败:', e);
    comments.value = [];
  }
}

/**
 * 初始化 Intersection Observer
 * 监听 .reveal 元素，进入视口时添加 visible 类
 */
function initObserver() {
  if (observer) observer.disconnect();
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.05, rootMargin: '0px 0px -40px 0px' }
  );
  document.querySelectorAll('.article-detail .reveal').forEach((el) => observer.observe(el));
}

/**
 * 设置回复目标
 * @param {Object} comment
 */
function setReplyTo(comment) {
  replyTo.value = comment;
  const formEl = document.querySelector('.comment-form-wrapper');
  if (formEl) {
    formEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

/** 取消回复 */
function cancelReply() {
  replyTo.value = null;
}

/**
 * 提交评论
 * @returns {Promise<void>}
 */
async function submitComment() {
  if (!canSubmit.value) {
    ElMessage.warning('请填写完整的评论信息');
    return;
  }
  submitting.value = true;
  try {
    const id = route.params.id;
    const payload = {
      nickname: commentForm.value.nickname.trim(),
      email: commentForm.value.email.trim(),
      content: commentForm.value.content.trim()
    };
    if (replyTo.value) {
      payload.parent_id = replyTo.value.id;
    }
    await postComment(id, payload);
    ElMessage.success('评论发表成功');
    commentForm.value.content = '';
    replyTo.value = null;
    await loadComments();
  } catch (e) {
    console.error('发表评论失败:', e);
    ElMessage.error('评论发表失败，请稍后重试');
  } finally {
    submitting.value = false;
  }
}

/** 返回上一页 */
function goBack() {
  router.back();
}

/** 返回首页 */
function goHome() {
  router.push('/');
}

/**
 * 获取当前文章完整链接
 * @returns {string}
 */
function getArticleUrl() {
  return window.location.href;
}

/**
 * 获取文章标题
 * @returns {string}
 */
function getArticleTitle() {
  return article.value?.title || '';
}

/** 微信分享：复制链接并提示 */
function shareWechat() {
  copyToClipboard(getArticleUrl());
  ElMessage.success('链接已复制，快去微信粘贴分享吧');
}

/** 微博分享：跳转到微博分享页 */
function shareWeibo() {
  const url = encodeURIComponent(getArticleUrl());
  const title = encodeURIComponent(getArticleTitle());
  window.open(`https://service.weibo.com/share/share.php?url=${url}&title=${title}`, '_blank');
}

/** 复制链接 */
function copyLink() {
  copyToClipboard(getArticleUrl());
  ElMessage.success('链接已复制到剪贴板');
}

/**
 * 复制文本到剪贴板
 * @param {string} text
 */
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

/**
 * 监听路由 ID 变化：切换文章时重新加载
 */
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
  window.removeEventListener('scroll', handleScroll);
  if (observer) observer.disconnect();
});
</script>

<style scoped>
/* ========== 容器 ========== */
.article-detail {
  position: relative;
  max-width: 800px;
  margin: 0 auto;
  padding: 32px 32px 80px;
}

/* ========== 阅读进度条 ========== */
.progress-bar {
  position: fixed;
  top: 0;
  left: 0;
  height: 3px;
  background: linear-gradient(to right, var(--primary), var(--primary-light));
  z-index: 200;
  transition: width 0.1s linear;
  box-shadow: 0 0 8px rgba(13, 148, 136, 0.4);
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
    color 0.25s var(--ease-out),
    border-color 0.25s var(--ease-out),
    background 0.25s var(--ease-out),
    transform 0.25s var(--ease-out);
}

.back-btn:hover {
  color: var(--primary);
  border-color: var(--primary);
  background: var(--primary-bg);
  transform: translateX(-3px);
}

/* ========== 文章正文 ========== */
.article-content {
  /* 卡片化被舍弃：仅用空白与分隔线组织 */
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
  transition: background 0.25s var(--ease-out);
}

.meta-category:hover {
  background: rgba(13, 148, 136, 0.18);
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

/* ========== 文章正文 Markdown ========== */
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
}

.article-body :deep(h3) {
  font-size: 22px;
  margin: 32px 0 16px;
  color: var(--text-primary);
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

/* 行内代码 */
.article-body :deep(code) {
  padding: 2px 8px;
  background: #f1f5f9;
  border-radius: 4px;
  font-size: 15px;
  color: var(--primary-dark);
  font-family: var(--font-mono);
}

/* 代码块 */
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

/* 引用块 */
.article-body :deep(blockquote) {
  margin: 24px 0;
  padding: 16px 24px;
  background: rgba(13, 148, 136, 0.05);
  border-left: 4px solid var(--primary);
  border-radius: 0 8px 8px 0;
  color: var(--text-secondary);
}

/* 链接 */
.article-body :deep(a) {
  color: var(--primary);
  text-decoration: none;
  border-bottom: 1px dashed var(--primary);
  transition: border-style 0.2s var(--ease-out);
}

.article-body :deep(a:hover) {
  border-bottom-style: solid;
}

/* 图片 */
.article-body :deep(img) {
  max-width: 100%;
  border-radius: 8px;
  margin: 16px 0;
}

/* 表格 */
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
    background 0.25s var(--ease-out),
    transform 0.25s var(--ease-spring);
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
    color 0.25s var(--ease-out),
    border-color 0.25s var(--ease-out),
    background 0.25s var(--ease-out),
    transform 0.25s var(--ease-out);
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
    background 0.25s var(--ease-out),
    color 0.25s var(--ease-out),
    transform 0.25s var(--ease-out);
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

/* ========== 评论区 ========== */
.comment-section {
  margin-top: 64px;
  padding-top: 40px;
  border-top: 2px solid var(--border);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 32px;
  font-size: 24px;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.5px;
}

.comment-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 24px;
  padding: 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: var(--primary);
  border-radius: 12px;
}

/* 评论表单 */
.comment-form-wrapper {
  padding: 24px;
  margin-bottom: 40px;
  background: var(--bg-body);
  border-radius: 14px;
}

.reply-tip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding: 10px 14px;
  background: rgba(13, 148, 136, 0.08);
  border-left: 3px solid var(--primary);
  border-radius: 6px;
  font-size: 13px;
  color: var(--primary-dark);
}

.cancel-btn {
  background: none;
  border: none;
  color: var(--primary);
  font-size: 13px;
  cursor: pointer;
  padding: 0;
}

.cancel-btn:hover {
  text-decoration: underline;
}

.comment-form .form-row {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.form-input {
  flex: 1;
  height: 42px;
  padding: 0 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
  font-size: 14px;
  color: var(--text-primary);
  background: var(--bg-hover);
  outline: none;
  transition:
    border-color 0.25s var(--ease-out),
    box-shadow 0.25s var(--ease-out);
}

.form-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.12);
}

.form-textarea {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
  font-size: 14px;
  color: var(--text-primary);
  background: var(--bg-hover);
  outline: none;
  resize: vertical;
  font-family: inherit;
  transition:
    border-color 0.25s var(--ease-out),
    box-shadow 0.25s var(--ease-out);
}

.form-textarea:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.submit-btn {
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: var(--primary);
  border: none;
  border-radius: 20px;
  cursor: pointer;
  transition:
    background 0.25s var(--ease-out),
    transform 0.25s var(--ease-spring),
    box-shadow 0.25s var(--ease-out);
}

.submit-btn:hover:not(:disabled) {
  background: var(--primary-dark);
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(13, 148, 136, 0.35);
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 评论列表 */
.comment-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.comment-item {
  position: relative;
}

.comment-main {
  display: flex;
  gap: 14px;
}

.comment-avatar {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
}

.avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%);
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  border-radius: 50%;
}

.comment-body {
  flex: 1;
  min-width: 0;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
}

.comment-nickname {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.comment-time {
  font-size: 12px;
  color: var(--text-tertiary);
}

.comment-content {
  margin-bottom: 8px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-secondary);
  word-break: break-word;
}

.reply-btn {
  background: none;
  border: none;
  color: var(--text-tertiary);
  font-size: 13px;
  cursor: pointer;
  padding: 0;
  transition: color 0.2s var(--ease-out);
}

.reply-btn:hover {
  color: var(--primary);
}

/* 子评论 */
.comment-children {
  margin-top: 16px;
  margin-left: 26px;
  padding-left: 20px;
  border-left: 2px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.comment-item.child .comment-avatar {
  width: 32px;
  height: 32px;
}

/* 评论空状态 */
.comment-empty {
  text-align: center;
  padding: 48px 0;
}

.empty-text {
  margin: 0;
  font-size: 14px;
  color: var(--text-tertiary);
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
    background 0.25s var(--ease-out),
    transform 0.25s var(--ease-spring);
}

.back-home-btn:hover {
  background: var(--primary-dark);
  transform: translateY(-2px);
}

/* ========== 返回顶部按钮 ========== */
.back-top {
  position: fixed;
  bottom: 32px;
  right: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  font-size: 20px;
  color: #fff;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  z-index: 90;
  box-shadow: 0 8px 24px rgba(13, 148, 136, 0.4);
  transition:
    transform 0.3s var(--ease-spring),
    box-shadow 0.3s var(--ease-out);
}

.back-top:hover {
  transform: translateY(-4px) scale(1.05);
  box-shadow: 0 12px 32px rgba(13, 148, 136, 0.5);
}

/* 返回顶部按钮过渡 */
.fade-scale-enter-active,
.fade-scale-leave-active {
  transition:
    opacity 0.3s var(--ease-out),
    transform 0.3s var(--ease-spring);
}

.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.5);
}

/* ========== 滚动揭示动画 ========== */
.reveal {
  opacity: 0;
  transform: translateY(24px);
  transition:
    opacity 0.7s var(--ease-out),
    transform 0.7s var(--ease-out);
}

.reveal.visible {
  opacity: 1;
  transform: translateY(0);
}

/* ========== 响应式 ========== */
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
  .comment-form .form-row {
    flex-direction: column;
    gap: 12px;
  }
  .comment-children {
    margin-left: 12px;
    padding-left: 12px;
  }
  .back-top {
    right: 20px;
    bottom: 20px;
    width: 44px;
    height: 44px;
  }
  .share-bar {
    flex-wrap: wrap;
    gap: 8px;
  }
  .share-btn {
    padding: 6px 12px;
    font-size: 12px;
  }
}
</style>
