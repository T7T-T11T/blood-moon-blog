<template>
  <article class="comment-item" :class="{ 'is-reply': depth > 0 }">
    <div class="comment-main">
      <div class="comment-avatar">
        <img
          v-if="comment.avatar_url"
          :src="comment.avatar_url"
          :alt="comment.nickname"
          class="avatar-img"
        />
        <div v-else class="avatar-placeholder">
          {{ (comment.nickname || '访').charAt(0).toUpperCase() }}
        </div>
      </div>
      <div class="comment-body">
        <div class="comment-header">
          <span class="comment-nickname">{{ comment.nickname || '访客' }}</span>
          <span class="comment-time">{{ formatDate(comment.created_at) }}</span>
        </div>
        <div class="comment-content">{{ comment.content }}</div>
        <button class="reply-btn" @click="$emit('reply', comment)">回复</button>
      </div>
    </div>

    <div v-if="comment.children?.length" class="comment-children">
      <CommentNode
        v-for="child in comment.children"
        :key="child.id"
        :comment="child"
        :depth="depth + 1"
        @reply="$emit('reply', $event)"
      />
    </div>
  </article>
</template>

<script setup>
import { formatDate } from '@/utils/format';

defineProps({
  comment: { type: Object, required: true },
  depth: { type: Number, default: 0 }
});

defineEmits(['reply']);
</script>

<style scoped>
.comment-item { position: relative; }
.comment-main { display: flex; gap: 14px; }
.comment-avatar { flex: 0 0 auto; width: 40px; height: 40px; }
.avatar-img, .avatar-placeholder { width: 100%; height: 100%; border-radius: 50%; }
.avatar-img { display: block; object-fit: cover; }
.avatar-placeholder { display: grid; place-items: center; background: linear-gradient(135deg, var(--primary), var(--primary-light)); color: #fff; font-size: 16px; font-weight: 700; }
.comment-body { min-width: 0; flex: 1; }
.comment-header { display: flex; align-items: center; gap: 12px; margin-bottom: 6px; }
.comment-nickname { color: var(--text-primary); font-size: 14px; font-weight: 700; }
.comment-time { color: var(--text-tertiary); font-size: 12px; }
.comment-content { margin-bottom: 8px; color: var(--text-secondary); font-size: 14px; line-height: 1.7; overflow-wrap: anywhere; }
.reply-btn { padding: 0; border: 0; background: transparent; color: var(--text-tertiary); cursor: pointer; font-size: 13px; }
.reply-btn:hover { color: var(--primary); }
.comment-children { display: flex; flex-direction: column; gap: 16px; margin: 16px 0 0 26px; padding-left: 20px; border-left: 2px solid var(--border); }
.is-reply .comment-avatar { width: 32px; height: 32px; }
@media (max-width: 768px) { .comment-children { margin-left: 12px; padding-left: 12px; } }
</style>
