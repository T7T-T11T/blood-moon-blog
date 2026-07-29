/** * @file ArticleDetail.vue * @description 文章详情页（杂志风/阅读体验优先） * *
作用：展示单篇文章的完整内容，包含： * -
文章头部：分类标签、大号标题、摘要、元信息（浏览量/日期/分类） * - 封面图（存在 cover_image 时展示）
* - 文章正文：使用 marked 渲染 Markdown，行高 1.8，代码高亮样式 * -
标签区域：展示所有标签，可点击跳转 /tag/:slug * - 上一篇/下一篇导航 * - 评论区：树形评论列表 +
评论表单（昵称/邮箱/内容），支持回复（parent_id） * * 数据获取： * - getArticleDetail(id)
获取文章详情 * - getComments(articleId) 获取评论树形列表 * - postComment(articleId, data) 发表评论 *
* 路由参数：useRoute().params.id 获取文章 ID * * 设计要点： * - 主色调青绿色 #0d9488 * -
阅读体验优先：800px 内容宽度、行高 1.8、正文 17px * - 评论树形结构通过递归渲染 children 实现 */
<template>
  <div v-loading="loading" class="article-detail">
    <!-- 返回按钮 -->
    <div class="back-bar">
      <button class="back-btn" @click="goBack">
        <el-icon><ArrowLeft /></el-icon>
        <span>返回列表</span>
      </button>
    </div>

    <!-- 文章内容：article 加载完成后展示 -->
    <article v-if="article" class="article-content">
      <!-- 文章头部：分类标签、标题、摘要、元信息 -->
      <header class="article-header">
        <!-- 元信息行：分类标签 + 日期 + 浏览量 -->
        <div class="article-meta">
          <router-link
            v-if="article.category_slug"
            :to="`/category/${article.category_slug}`"
            class="category-tag"
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
          <span v-if="article.category_name" class="meta-item">
            <el-icon><Collection /></el-icon>
            {{ article.category_name }}
          </span>
        </div>

        <!-- 文章标题（大号字） -->
        <h1 class="article-title">{{ article.title }}</h1>

        <!-- 文章摘要：存在 summary 时展示 -->
        <p v-if="article.summary" class="article-summary">{{ article.summary }}</p>
      </header>

      <!-- 封面图：存在 cover_image 时展示 -->
      <figure v-if="article.cover_image" class="article-cover">
        <img :src="article.cover_image" :alt="article.title" loading="lazy" />
      </figure>

      <!-- 文章正文：使用 marked 渲染 Markdown -->
      <div class="article-body" v-html="renderedContent"></div>

      <!-- 标签区域：展示所有标签，可点击跳转 /tag/:slug -->
      <section v-if="article.tags && article.tags.length > 0" class="article-tags">
        <span class="tags-label">
          <el-icon><PriceTag /></el-icon>
          标签：
        </span>
        <router-link
          v-for="tag in article.tags"
          :key="tag.id"
          :to="`/tag/${tag.slug}`"
          class="tag-item"
        >
          #{{ tag.name }}
        </router-link>
      </section>

      <!-- 文章底部：上一篇/下一篇导航 -->
      <footer class="article-footer">
        <div class="prev-next">
          <!-- 上一篇文章：存在 prev_article 时展示 -->
          <router-link
            v-if="article.prev_article"
            :to="`/article/${article.prev_article.id}`"
            class="nav-link prev"
          >
            <span class="nav-direction">
              <el-icon><ArrowLeft /></el-icon>
              上一篇
            </span>
            <span class="nav-title">{{ article.prev_article.title }}</span>
          </router-link>
          <!-- 占位：无上一篇文章时保持布局对齐 -->
          <div v-else class="nav-link placeholder"></div>

          <!-- 下一篇文章：存在 next_article 时展示 -->
          <router-link
            v-if="article.next_article"
            :to="`/article/${article.next_article.id}`"
            class="nav-link next"
          >
            <span class="nav-direction">
              下一篇
              <el-icon><ArrowRight /></el-icon>
            </span>
            <span class="nav-title">{{ article.next_article.title }}</span>
          </router-link>
          <!-- 占位：无下一篇文章时保持布局对齐 -->
          <div v-else class="nav-link placeholder"></div>
        </div>
      </footer>
    </article>

    <!-- 评论区 -->
    <section v-if="article" class="comment-section">
      <h2 class="section-title">
        <el-icon><ChatDotRound /></el-icon>
        评论 <span class="comment-count">{{ commentCount }}</span>
      </h2>

      <!-- 评论表单 -->
      <div class="comment-form-wrapper">
        <!-- 回复提示：当前处于回复状态时展示 -->
        <div v-if="replyTo" class="reply-tip">
          <span>回复 @{{ replyTo.nickname }}：</span>
          <el-button text size="small" @click="cancelReply">取消回复</el-button>
        </div>
        <el-form :model="commentForm" class="comment-form" label-position="top">
          <div class="form-row">
            <el-form-item label="昵称" class="form-item-nickname">
              <el-input v-model="commentForm.nickname" placeholder="请输入昵称" maxlength="30" />
            </el-form-item>
            <el-form-item label="邮箱" class="form-item-email">
              <el-input
                v-model="commentForm.email"
                placeholder="请输入邮箱（不会公开）"
                maxlength="100"
              />
            </el-form-item>
          </div>
          <el-form-item label="评论内容">
            <el-input
              v-model="commentForm.content"
              type="textarea"
              :rows="4"
              placeholder="写下你的评论..."
              maxlength="500"
              show-word-limit
            />
          </el-form-item>
          <div class="form-actions">
            <el-button
              type="primary"
              :loading="submitting"
              :disabled="!canSubmit"
              @click="submitComment"
            >
              发表评论
            </el-button>
          </div>
        </el-form>
      </div>

      <!-- 评论列表：树形结构，递归渲染 -->
      <div v-if="comments.length > 0" class="comment-list">
        <div v-for="comment in comments" :key="comment.id" class="comment-item">
          <!-- 评论内容 -->
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

          <!-- 子回复列表：递归渲染 children -->
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
        <el-icon :size="48" color="#cbd5e1"><ChatLineSquare /></el-icon>
        <p class="empty-text">暂无评论，快来抢沙发吧！</p>
      </div>
    </section>

    <!-- 错误提示：加载完成但未获取到文章 -->
    <div v-if="!loading && !article" class="error-state">
      <el-icon :size="64" color="#94a3b8"><Warning /></el-icon>
      <p class="error-text">文章不存在或已被删除</p>
      <el-button type="primary" @click="goBack">返回首页</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { marked } from 'marked';
import { ElMessage } from 'element-plus';
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  View,
  Collection,
  PriceTag,
  ChatDotRound,
  ChatLineSquare,
  Warning
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

/** 评论表单数据 */
const commentForm = ref({
  nickname: '',
  email: '',
  content: ''
});

/**
 * 渲染后的文章内容
 * 使用 marked 将 Markdown 转换为 HTML
 * @returns {string} 渲染后的 HTML 字符串
 */
const renderedContent = computed(() => {
  // 文章未加载时返回空字符串，避免渲染异常
  if (!article.value || !article.value.content) return '';
  return marked(article.value.content);
});

/**
 * 评论总数（包含子回复）
 * 遍历评论树，累加顶级评论与子回复数量
 * @returns {number} 评论总数
 */
const commentCount = computed(() => {
  let count = 0;
  // 遍历顶级评论
  for (const comment of comments.value) {
    count += 1;
    // 存在子回复时累加子回复数量
    if (comment.children && Array.isArray(comment.children)) {
      count += comment.children.length;
    }
  }
  return count;
});

/**
 * 是否可以提交评论
 * 昵称、邮箱、内容均非空时允许提交
 * @returns {boolean} 是否可提交
 */
const canSubmit = computed(() => {
  return (
    commentForm.value.nickname.trim() !== '' &&
    commentForm.value.email.trim() !== '' &&
    commentForm.value.content.trim() !== ''
  );
});

/**
 * 格式化日期为 YYYY-MM-DD
 * @param {string} dateStr - 后端返回的日期字符串
 * @returns {string} 格式化后的日期，无效时返回空字符串
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  // 兼容无效日期，避免展示 NaN
  if (isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 加载文章详情
 * 通过 getArticleDetail 获取文章数据，自动增加浏览量
 * @returns {Promise<void>}
 */
async function loadArticle() {
  loading.value = true;
  try {
    const id = route.params.id;
    const { data } = await getArticleDetail(id);
    article.value = data;
    // 文章加载成功后并行加载评论
    loadComments();
  } catch (e) {
    console.error('加载文章失败:', e);
    article.value = null;
  } finally {
    loading.value = false;
  }
}

/**
 * 加载评论列表
 * 通过 getComments 获取文章的树形评论数据
 * @returns {Promise<void>}
 */
async function loadComments() {
  try {
    const id = route.params.id;
    const { data } = await getComments(id);
    // 兼容数组或对象包裹的数组两种返回结构
    comments.value = Array.isArray(data) ? data : (data?.list ?? []);
  } catch (e) {
    console.error('加载评论失败:', e);
    comments.value = [];
  }
}

/**
 * 设置回复目标
 * 点击回复按钮时调用，记录被回复的评论，作为 parent_id 提交
 * @param {Object} comment - 被回复的评论对象
 */
function setReplyTo(comment) {
  replyTo.value = comment;
  // 滚动到评论表单，引导用户输入
  const formEl = document.querySelector('.comment-form-wrapper');
  if (formEl) {
    formEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

/**
 * 取消回复
 * 清空回复目标，恢复为顶级评论模式
 */
function cancelReply() {
  replyTo.value = null;
}

/**
 * 提交评论
 * 校验表单后调用 postComment，提交成功后刷新评论列表并重置表单
 * @returns {Promise<void>}
 */
async function submitComment() {
  // 二次校验：防止按钮 disabled 状态被绕过
  if (!canSubmit.value) {
    ElMessage.warning('请填写完整的评论信息');
    return;
  }
  submitting.value = true;
  try {
    const id = route.params.id;
    // 组装评论数据，存在回复目标时携带 parent_id
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
    // 重置表单与回复状态
    commentForm.value.content = '';
    replyTo.value = null;
    // 刷新评论列表，展示新评论
    await loadComments();
  } catch (e) {
    console.error('发表评论失败:', e);
    ElMessage.error('评论发表失败，请稍后重试');
  } finally {
    submitting.value = false;
  }
}

/**
 * 返回上一页
 */
function goBack() {
  router.back();
}

/**
 * 监听路由参数变化
 * 文章 ID 变化时重新加载文章，支持上一篇/下一篇导航
 */
watch(
  () => route.params.id,
  (newId, oldId) => {
    // 仅在 ID 实际变化时重新加载，避免首次加载重复请求
    if (newId && newId !== oldId) {
      loadArticle();
      // 切换文章后回到顶部
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
);

onMounted(() => {
  loadArticle();
});
</script>

<style scoped>
.article-detail {
  --color-primary: #0d9488; /* 主色：青绿 */
  --color-primary-dark: #0f766e; /* 主色深 */
  --color-primary-light: #14b8a6; /* 主色浅 */
  --color-text: #0f172a; /* 主文本 */
  --color-text-secondary: #475569; /* 次级文本 */
  --color-text-muted: #94a3b8; /* 弱化文本 */
  --color-bg: #ffffff; /* 卡片背景 */
  --color-bg-soft: #f8fafc; /* 弱化背景 */
  --color-border: #e2e8f0; /* 分割线 */
  max-width: 800px;
  margin: 0 auto;
}

/* ========== 返回按钮 ========== */
.back-bar {
  margin-bottom: 24px;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.back-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

/* ========== 文章卡片 ========== */
.article-content {
  background: var(--color-bg);
  border-radius: 16px;
  padding: 48px;
  border: 1px solid var(--color-border);
}

/* ========== 文章头部 ========== */
.article-header {
  margin-bottom: 32px;
  padding-bottom: 28px;
  border-bottom: 1px solid var(--color-border);
}

.article-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 16px;
  font-size: 14px;
  color: var(--color-text-muted);
}

.category-tag {
  display: inline-block;
  padding: 4px 14px;
  background: linear-gradient(135deg, rgba(13, 148, 136, 0.1), rgba(8, 145, 178, 0.1));
  color: var(--color-primary);
  border-radius: 20px;
  font-weight: 500;
  text-decoration: none;
  transition: background 0.2s ease;
}

.category-tag:hover {
  background: linear-gradient(135deg, rgba(13, 148, 136, 0.2), rgba(8, 145, 178, 0.2));
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.article-title {
  font-size: 38px;
  font-weight: 800;
  color: var(--color-text);
  margin: 0 0 20px;
  line-height: 1.3;
  letter-spacing: -1px;
}

.article-summary {
  font-size: 16px;
  color: var(--color-text-secondary);
  line-height: 1.7;
  margin: 0;
  padding-left: 16px;
  border-left: 3px solid var(--color-primary);
  font-style: italic;
}

/* ========== 封面图 ========== */
.article-cover {
  margin: 0 0 32px;
  border-radius: 12px;
  overflow: hidden;
}

.article-cover img {
  width: 100%;
  height: auto;
  display: block;
  max-height: 480px;
  object-fit: cover;
}

/* ========== 文章正文 ========== */
.article-body {
  font-size: 17px;
  line-height: 1.8;
  color: #334155;
}

.article-body :deep(h1) {
  font-size: 32px;
  margin: 48px 0 24px;
  padding-bottom: 12px;
  border-bottom: 2px solid var(--color-border);
  color: var(--color-text);
}

.article-body :deep(h2) {
  font-size: 26px;
  margin: 40px 0 20px;
  color: var(--color-text);
}

.article-body :deep(h3) {
  font-size: 22px;
  margin: 32px 0 16px;
  color: var(--color-text);
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
  background: #f1f5f9;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 15px;
  color: var(--color-primary-dark);
  font-family: 'Menlo', 'Monaco', 'Consolas', monospace;
}

/* 代码块 */
.article-body :deep(pre) {
  background: #1e293b;
  color: #e2e8f0;
  padding: 20px;
  border-radius: 12px;
  overflow-x: auto;
  margin: 24px 0;
  font-size: 14px;
  line-height: 1.6;
}

.article-body :deep(pre code) {
  background: transparent;
  padding: 0;
  color: inherit;
  font-size: inherit;
}

/* 引用块 */
.article-body :deep(blockquote) {
  border-left: 4px solid var(--color-primary);
  padding: 16px 24px;
  background: rgba(13, 148, 136, 0.05);
  border-radius: 0 8px 8px 0;
  margin: 24px 0;
  color: var(--color-text-secondary);
}

/* 链接 */
.article-body :deep(a) {
  color: var(--color-primary);
  text-decoration: none;
  border-bottom: 1px dashed var(--color-primary);
  transition: border-color 0.2s ease;
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
  border: 1px solid var(--color-border);
  padding: 10px 16px;
  text-align: left;
}

.article-body :deep(th) {
  background: var(--color-bg-soft);
  font-weight: 600;
}

/* ========== 标签区域 ========== */
.article-tags {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 40px;
  padding-top: 28px;
  border-top: 1px solid var(--color-border);
}

.tags-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: var(--color-text-muted);
  font-weight: 500;
}

.tags-label .el-icon {
  color: var(--color-primary);
}

.tag-item {
  font-size: 13px;
  color: var(--color-primary);
  background: rgba(13, 148, 136, 0.08);
  padding: 6px 14px;
  border-radius: 16px;
  text-decoration: none;
  transition: all 0.2s ease;
}

.tag-item:hover {
  background: rgba(13, 148, 136, 0.15);
  transform: translateY(-1px);
}

/* ========== 文章底部 ========== */
.article-footer {
  margin-top: 40px;
  padding-top: 28px;
  border-top: 1px solid var(--color-border);
}

.prev-next {
  display: flex;
  justify-content: space-between;
  gap: 24px;
}

.nav-link {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 20px;
  background: var(--color-bg-soft);
  border-radius: 12px;
  text-decoration: none;
  color: var(--color-text-secondary);
  transition: all 0.2s ease;
  min-width: 0;
}

.nav-link:hover {
  background: #f1f5f9;
  color: var(--color-primary);
  transform: translateY(-2px);
}

.nav-link.placeholder {
  background: transparent;
  pointer-events: none;
}

.nav-direction {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--color-text-muted);
  font-weight: 500;
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

.nav-link.next {
  text-align: right;
  align-items: flex-end;
}

.nav-link.next .nav-direction {
  flex-direction: row-reverse;
}

/* ========== 评论区 ========== */
.comment-section {
  margin-top: 32px;
  background: var(--color-bg);
  border-radius: 16px;
  padding: 40px;
  border: 1px solid var(--color-border);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 28px;
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text);
}

.section-title .el-icon {
  color: var(--color-primary);
}

.comment-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: var(--color-primary);
  border-radius: 12px;
}

/* 评论表单 */
.comment-form-wrapper {
  background: var(--color-bg-soft);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 32px;
}

.reply-tip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  margin-bottom: 16px;
  background: rgba(13, 148, 136, 0.08);
  border-left: 3px solid var(--color-primary);
  border-radius: 4px;
  font-size: 13px;
  color: var(--color-primary-dark);
}

.comment-form .form-row {
  display: flex;
  gap: 16px;
}

.comment-form .form-item-nickname,
.comment-form .form-item-email {
  flex: 1;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
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
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%);
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
  color: var(--color-text);
}

.comment-time {
  font-size: 12px;
  color: var(--color-text-muted);
}

.comment-content {
  font-size: 14px;
  line-height: 1.7;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
  word-break: break-word;
}

.reply-btn {
  background: none;
  border: none;
  color: var(--color-text-muted);
  font-size: 13px;
  cursor: pointer;
  padding: 0;
  transition: color 0.2s ease;
}

.reply-btn:hover {
  color: var(--color-primary);
}

/* 子评论 */
.comment-children {
  margin-left: 26px;
  margin-top: 16px;
  padding-left: 20px;
  border-left: 2px solid var(--color-border);
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
  margin: 16px 0 0;
  font-size: 14px;
  color: var(--color-text-muted);
}

/* ========== 错误状态 ========== */
.error-state {
  text-align: center;
  padding: 80px 0;
}

.error-text {
  font-size: 16px;
  color: var(--color-text-secondary);
  margin: 16px 0 24px;
}

/* ========== 响应式 ========== */
@media (max-width: 768px) {
  .article-content,
  .comment-section {
    padding: 28px 20px;
  }

  .article-title {
    font-size: 26px;
  }

  .article-summary {
    font-size: 15px;
  }

  .prev-next {
    flex-direction: column;
  }

  .nav-link.next {
    text-align: left;
    align-items: flex-start;
  }

  .nav-link.next .nav-direction {
    flex-direction: row;
  }

  .comment-form .form-row {
    flex-direction: column;
    gap: 0;
  }

  .comment-children {
    margin-left: 12px;
  }
}
</style>
