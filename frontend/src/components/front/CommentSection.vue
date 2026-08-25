<!--
  CommentSection.vue
  文章评论区块：评论表单 + 树形评论列表
  Props: articleId - 文章 ID
-->
<template>
  <section class="comment-section">
    <div class="comment-header-row">
      <h2 class="section-title">
        评论
        <span class="comment-count">{{ commentCount }}</span>
      </h2>
      <div class="comment-sort">
        <button
          v-for="opt in sortOptions"
          :key="opt.value"
          class="sort-btn"
          :class="{ active: commentSort === opt.value }"
          @click="commentSort = opt.value"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <!-- 评论表单 -->
    <div class="comment-form-wrapper">
      <div v-if="replyTo" class="reply-tip">
        <span>回复 @{{ replyTo.nickname }}</span>
        <button class="cancel-btn" @click="cancelReply">取消</button>
      </div>
      <div class="comment-form">
        <!-- 蜜罐字段：人类不可见，机器人会自动填写（用于反垃圾） -->
        <input
          v-model="commentForm.website"
          type="text"
          class="honeypot-field"
          tabindex="-1"
          autocomplete="off"
          aria-hidden="true"
        />
        <input
          v-model="commentForm.nickname"
          type="text"
          class="form-input"
          :placeholder="userStore.isLoggedIn ? `昵称（当前：${userStore.username}）` : '昵称（可选，留空显示访客）'"
          maxlength="30"
        />
        <textarea
          v-model="commentForm.content"
          class="form-textarea"
          placeholder="写下你的评论..."
          rows="4"
          maxlength="2000"
        ></textarea>
        <div class="form-actions">
          <span class="char-count">{{ commentForm.content.length }}/2000</span>
          <button class="submit-btn" :disabled="!canSubmit || submitting" @click="submitComment">
            {{ submitting ? '提交中…' : '发表评论' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 评论列表 -->
    <div v-if="comments.length > 0" class="comment-list">
      <CommentNode
        v-for="comment in sortedComments"
        :key="comment.id"
        :comment="comment"
        @reply="setReplyTo"
      />
    </div>

    <!-- 评论空状态 -->
    <div v-else class="comment-empty">
      <p class="empty-text">暂无评论，快来抢沙发吧！</p>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { getComments, postComment } from '../../api/comments';
import { useUserStore } from '@/stores/user';
import CommentNode from './CommentNode.vue';
import { buildCommentTree, countComments, findComment } from '@/utils/commentTree';

const props = defineProps({
  articleId: { type: [String, Number], required: true }
});

/** 用户状态（Pinia Store），用于获取已登录用户的昵称/头像 */
const userStore = useUserStore();

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

/** 组件挂载后：如已登录则自动填充当前用户的昵称（用户可修改） */
onMounted(() => {
  if (userStore.isLoggedIn && userStore.username) {
    commentForm.value.nickname = userStore.username;
  }
});

/**
 * 评论总数（含子回复）
 * @returns {number}
 */
const commentCount = computed(() => {
  return countComments(comments.value);
});

/**
 * 是否可提交评论
 * 规则：内容必填；昵称非必填（后端兜底：已登录用用户名，未登录用 '访客'）
 * @returns {boolean}
 */
const canSubmit = computed(() => {
  return commentForm.value.content.trim() !== '';
});

/** 加载评论列表 */
async function loadComments() {
  try {
    const { data } = await getComments(props.articleId);
    const list = Array.isArray(data) ? data : (data?.list ?? []);
    comments.value = buildCommentTree(list);
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

/** 评论排序：最新 / 最热（按回复数）/ 最早 */
const sortOptions = [
  { value: 'newest', label: '最新' },
  { value: 'hottest', label: '最热' },
  { value: 'oldest', label: '最早' }
];
const commentSort = ref('newest');
const sortedComments = computed(() => {
  const list = [...comments.value];
  if (commentSort.value === 'oldest') {
    list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  } else if (commentSort.value === 'hottest') {
    list.sort((a, b) => (b.children || []).length - (a.children || []).length);
  } else {
    list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
  return list;
});

async function submitComment() {
  // 蜜罐检测：被机器人填写则静默丢弃，不提示
  if (commentForm.value.website) {
    commentForm.value.content = '';
    return;
  }
  if (!canSubmit.value) {
    ElMessage.warning('请填写评论内容');
    return;
  }
  submitting.value = true;
  try {
    const nickname = commentForm.value.nickname.trim() || '访客';
    const content = commentForm.value.content.trim();
    const payload = { nickname, content };
    if (replyTo.value) {
      payload.parent_id = replyTo.value.id;
    }
    const res = await postComment(props.articleId, payload);

    ElMessage.success('评论发表成功');

    /** 乐观更新：提交成功后立即将新评论插入本地列表，提升访客体验 */
    const newComment = {
      id: res?.data?.id || Date.now(),
      nickname,
      avatar_url: userStore.avatar_url || '',
      content,
      status: '已通过',
      created_at: new Date().toISOString(),
      parent_id: replyTo.value?.id || null,
      children: []
    };

    if (replyTo.value) {
      // 回复评论：插入到父评论的 children 数组中
      const parent = findComment(comments.value, replyTo.value.id);
      if (parent) {
        if (!parent.children) parent.children = [];
        parent.children.push(newComment);
      }
    } else {
      // 顶级评论：插入到列表头部
      comments.value.unshift(newComment);
    }

    commentForm.value.nickname = '';
    commentForm.value.content = '';
    replyTo.value = null;

    // 异步刷新以获取服务端真实数据（防止 ID 等字段不一致）
    loadComments();
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
  background: rgba(79, 143, 220, 0.10);
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
  box-shadow: 0 0 0 3px rgba(79, 143, 220, 0.14);
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
  box-shadow: 0 0 0 3px rgba(79, 143, 220, 0.14);
}

.honeypot-field {
  position: absolute;
  left: -9999px;
  width: 0;
  height: 0;
  opacity: 0;
  overflow: hidden;
}

.char-count {
  font-size: 12px;
  color: var(--text-secondary, #6b7280);
  margin-right: 12px;
  align-self: center;
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
  box-shadow: 0 8px 20px rgba(79, 143, 220, 0.26);
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

/* ========== 响应式 ========== */
@media (max-width: 768px) {
}

/* ========== 评论排序 ========== */
.comment-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.comment-header-row .section-title {
  margin-bottom: 0;
}

.comment-sort {
  display: flex;
  gap: 6px;
}

.sort-btn {
  padding: 4px 12px;
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 14px;
  cursor: pointer;
  transition:
    color 0.2s,
    border-color 0.2s,
    background 0.2s;
}

.sort-btn:hover {
  color: var(--primary);
  border-color: var(--primary);
}

.sort-btn.active {
  color: #fff;
  background: var(--primary);
  border-color: var(--primary);
}</style>
