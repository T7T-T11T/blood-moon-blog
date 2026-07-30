<!--
  CommentSection.vue
  文章评论区块：评论表单 + 树形评论列表
  Props: articleId - 文章 ID
-->
<template>
  <section class="comment-section reveal">
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
        <input
          v-model="commentForm.nickname"
          type="text"
          class="form-input"
          placeholder="昵称 *"
          maxlength="30"
        />
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
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { getComments, postComment } from '../../api/comments';

const props = defineProps({
  articleId: { type: [String, Number], required: true }
});

/** 评论树形列表 */
const comments = ref([]);

/** 评论提交中状态 */
const submitting = ref(false);

/** 当前回复目标（null 表示顶级评论） */
const replyTo = ref(null);

/** 评论表单 */
const commentForm = ref({
  nickname: '',
  content: ''
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
  return commentForm.value.nickname.trim() !== '' && commentForm.value.content.trim() !== '';
});

/**
 * 格式化日期 YYYY-MM-DD
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

/** 加载评论列表 */
async function loadComments() {
  try {
    const { data } = await getComments(props.articleId);
    comments.value = Array.isArray(data) ? data : (data?.list ?? []);
  } catch (e) {
    console.error('加载评论失败:', e);
    comments.value = [];
  }
}

/** 设置回复目标 */
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

/** 提交评论 */
async function submitComment() {
  if (!canSubmit.value) {
    ElMessage.warning('请填写昵称和评论内容');
    return;
  }
  submitting.value = true;
  try {
    const payload = {
      nickname: commentForm.value.nickname.trim(),
      content: commentForm.value.content.trim()
    };
    if (replyTo.value) {
      payload.parent_id = replyTo.value.id;
    }
    await postComment(props.articleId, payload);
    ElMessage.success('评论发表成功，等待审核');
    commentForm.value.nickname = '';
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

// 监听 articleId 变化，重新加载评论
watch(
  () => props.articleId,
  (newId, oldId) => {
    if (newId && newId !== oldId) {
      loadComments();
    }
  },
  { immediate: true }
);
</script>

<style scoped>
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
  background: rgba(220, 38, 38, 0.08);
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

.form-input {
  width: 100%;
  height: 42px;
  padding: 0 14px;
  margin-bottom: 12px;
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
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.12);
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
  box-shadow: 0 8px 20px rgba(220, 38, 38, 0.35);
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
  .comment-children {
    margin-left: 12px;
    padding-left: 12px;
  }
}
</style>
