<template>
  <div class="tiptap-editor">
    <!-- 工具栏 -->
    <div class="editor-toolbar">
      <!-- 文本格式 -->
      <button
        type="button"
        :class="{ active: editor?.isActive('bold') }"
        class="toolbar-btn"
        title="加粗 (Ctrl+B)"
        @mousedown.prevent="editor?.chain().focus().toggleBold().run()"
      >
        <strong>B</strong>
      </button>
      <button
        type="button"
        :class="{ active: editor?.isActive('italic') }"
        class="toolbar-btn"
        title="斜体 (Ctrl+I)"
        @mousedown.prevent="editor?.chain().focus().toggleItalic().run()"
      >
        <em>I</em>
      </button>
      <button
        type="button"
        :class="{ active: editor?.isActive('underline') }"
        class="toolbar-btn"
        title="下划线"
        @mousedown.prevent="editor?.chain().focus().toggleUnderline().run()"
      >
        <u>U</u>
      </button>
      <button
        type="button"
        :class="{ active: editor?.isActive('strike') }"
        class="toolbar-btn"
        title="删除线"
        @mousedown.prevent="editor?.chain().focus().toggleStrike().run()"
      >
        <s>S</s>
      </button>

      <div class="toolbar-divider"></div>

      <!-- 标题 -->
      <button
        type="button"
        :class="{ active: editor?.isActive('heading', { level: 1 }) }"
        class="toolbar-btn"
        title="一级标题"
        @mousedown.prevent="editor?.chain().focus().toggleHeading({ level: 1 }).run()"
      >
        H1
      </button>
      <button
        type="button"
        :class="{ active: editor?.isActive('heading', { level: 2 }) }"
        class="toolbar-btn"
        title="二级标题"
        @mousedown.prevent="editor?.chain().focus().toggleHeading({ level: 2 }).run()"
      >
        H2
      </button>
      <button
        type="button"
        :class="{ active: editor?.isActive('heading', { level: 3 }) }"
        class="toolbar-btn"
        title="三级标题"
        @mousedown.prevent="editor?.chain().focus().toggleHeading({ level: 3 }).run()"
      >
        H3
      </button>

      <div class="toolbar-divider"></div>

      <!-- 列表 -->
      <button
        type="button"
        :class="{ active: editor?.isActive('bulletList') }"
        class="toolbar-btn"
        title="无序列表"
        @mousedown.prevent="editor?.chain().focus().toggleBulletList().run()"
      >
        • 列
      </button>
      <button
        type="button"
        :class="{ active: editor?.isActive('orderedList') }"
        class="toolbar-btn"
        title="有序列表"
        @mousedown.prevent="editor?.chain().focus().toggleOrderedList().run()"
      >
        1. 列
      </button>

      <div class="toolbar-divider"></div>

      <!-- 引用和代码 -->
      <button
        type="button"
        :class="{ active: editor?.isActive('blockquote') }"
        class="toolbar-btn"
        title="引用"
        @mousedown.prevent="editor?.chain().focus().toggleBlockquote().run()"
      >
        "
      </button>
      <button
        type="button"
        :class="{ active: editor?.isActive('codeBlock') }"
        class="toolbar-btn"
        title="代码块"
        @mousedown.prevent="editor?.chain().focus().toggleCodeBlock().run()"
      >
        &lt;/&gt;
      </button>
      <button
        type="button"
        :class="{ active: editor?.isActive('code') }"
        class="toolbar-btn"
        title="行内代码"
        @mousedown.prevent="editor?.chain().focus().toggleCode().run()"
      >
        `code`
      </button>

      <div class="toolbar-divider"></div>

      <!-- 链接和图片 -->
      <button
        type="button"
        class="toolbar-btn"
        title="插入链接"
        @mousedown.prevent="openLinkDialog"
      >
        🔗 链
      </button>
      <button
        type="button"
        class="toolbar-btn"
        title="插入图片"
        @mousedown.prevent="triggerImageUpload"
      >
        🖼️ 图
      </button>
      <button
        type="button"
        class="toolbar-btn"
        title="插入音频"
        @mousedown.prevent="triggerAudioUpload"
      >
        🔊 音
      </button>
      <button
        type="button"
        class="toolbar-btn"
        title="插入视频"
        @mousedown.prevent="triggerVideoUpload"
      >
        🎬 视
      </button>

      <div class="toolbar-divider"></div>

      <!-- 分割线和表格 -->
      <button
        type="button"
        class="toolbar-btn"
        title="分割线"
        @mousedown.prevent="editor?.chain().focus().setHorizontalRule().run()"
      >
        ─
      </button>
      <button
        type="button"
        class="toolbar-btn"
        title="插入表格"
        @mousedown.prevent="
          editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        "
      >
        表
      </button>

      <div class="toolbar-divider"></div>

      <!-- 清除格式 -->
      <button
        type="button"
        class="toolbar-btn"
        title="清除格式"
        @mousedown.prevent="editor?.chain().focus().clearNodes().run()"
      >
        ✕ 清
      </button>

      <div class="toolbar-spacer"></div>

      <!-- 字数统计 -->
      <span class="word-count">{{ wordCount }} 字</span>

      <!-- 草稿指示器 -->
      <span v-if="draftSavedAt" class="draft-indicator" title="草稿已自动保存">
        草稿 {{ draftSavedAt }}
      </span>
      <button
        v-if="draftSavedAt"
        type="button"
        class="draft-clear-btn"
        title="丢弃草稿"
        @click="clearDraft"
      >
        清除草稿
      </button>
    </div>

    <!-- 编辑器 -->
    <EditorContent :editor="editor" class="editor-content" />

    <!-- 链接对话框 -->
    <el-dialog v-model="linkDialogVisible" title="插入链接" width="400px">
      <el-form>
        <el-form-item label="URL">
          <el-input v-model="linkUrl" placeholder="https://example.com" />
        </el-form-item>
        <el-form-item label="文字（可选）">
          <el-input v-model="linkText" placeholder="链接显示文字" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="linkDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="insertLink">确定</el-button>
      </template>
    </el-dialog>

    <!-- 隐藏的文件输入 -->
    <input
      ref="imageInputRef"
      type="file"
      accept="image/*"
      style="display: none"
      @change="handleImageFileChange"
    />
    <input
      ref="audioInputRef"
      type="file"
      accept="audio/*"
      style="display: none"
      @change="handleAudioFileChange"
    />
    <input
      ref="videoInputRef"
      type="file"
      accept="video/*"
      style="display: none"
      @change="handleVideoFileChange"
    />
  </div>
</template>

<script setup>
import { useEditor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import Underline from '@tiptap/extension-underline';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { uploadImage, uploadAudio, uploadVideo } from '@/api/upload';
import AudioExtension from './tiptap-extensions/AudioExtension';
import VideoExtension from './tiptap-extensions/VideoExtension';

const lowlight = createLowlight(common);

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: '开始写作...'
  }
});

const emit = defineEmits(['update:modelValue']);

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit.configure({
      codeBlock: false,
      link: false,
      underline: false
    }),
    CodeBlockLowlight.configure({
      lowlight
    }),
    Link.configure({
      openOnClick: false,
      autolink: true
    }),
    Image.configure({
      allowBase64: true
    }),
    Table.configure({
      resizable: true,
      handleWidth: 4,
      cellMinWidth: 50,
      lastColumnResizable: true,
      allowTableNodeSelection: true
    }),
    TableRow,
    TableHeader,
    TableCell,
    Underline,
    AudioExtension,
    VideoExtension
  ],
  editorProps: {
    attributes: {
      class: 'tiptap-content'
    }
  },
  onUpdate: ({ editor: ed }) => {
    // 标记此次更新来自编辑器内部，防止 watch 触发 setContent 导致光标重置
    skipModelUpdate.value = true;
    emit('update:modelValue', ed.getHTML());
    // 下一个微任务清除标记，确保 watch 能正确响应外部变更
    queueMicrotask(() => {
      skipModelUpdate.value = false;
    });
  }
});

/** 标记编辑器内部更新，防止 watch 回环 */
const skipModelUpdate = ref(false);

const linkDialogVisible = ref(false);
const linkUrl = ref('');
const linkText = ref('');

const imageInputRef = ref(null);
const audioInputRef = ref(null);
const videoInputRef = ref(null);
const imageUploading = ref(false);
const audioUploading = ref(false);
const videoUploading = ref(false);

const wordCount = computed(() => {
  return editor?.value?.state?.doc?.textContent?.length || 0;
});

// ==================== 草稿自动保存 ====================

const DRAFT_KEY = 'article-draft';

/** 草稿最近一次保存时间（格式化字符串），null 表示无草稿 */
const draftSavedAt = ref(null);

/** 自动保存定时器 */
let autoSaveTimer = null;

/** 上次保存的内容（用于避免重复保存相同内容） */
let lastSavedContent = '';

/**
 * 保存草稿到 localStorage
 */
function saveDraft() {
  if (!editor.value) return;
  const content = editor.value.getHTML();
  // 空内容不保存
  if (!content || content === '<p></p>') return;
  // 内容未变化不重复保存
  if (content === lastSavedContent) return;

  const draft = {
    content,
    savedAt: Date.now()
  };
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  lastSavedContent = content;

  // 更新显示时间
  updateDraftTime(draft.savedAt);
}

/** 更新草稿时间显示 */
function updateDraftTime(timestamp) {
  if (!timestamp) {
    draftSavedAt.value = null;
    return;
  }
  const d = new Date(timestamp);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) {
    draftSavedAt.value = '刚刚';
  } else if (diffMin < 60) {
    draftSavedAt.value = `${diffMin} 分钟前`;
  } else {
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    draftSavedAt.value = `${h}:${m}`;
  }
}

/** 清除草稿 */
function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
  lastSavedContent = '';
  draftSavedAt.value = null;
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer);
    autoSaveTimer = null;
  }
}

/** 检查是否有历史草稿并提示恢复 */
async function checkExistingDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;

    const draft = JSON.parse(raw);
    if (!draft.content || draft.content === '<p></p>') {
      localStorage.removeItem(DRAFT_KEY);
      return;
    }

    // 显示草稿时间
    updateDraftTime(draft.savedAt);

    // 使用确认对话框询问是否恢复
    try {
      await ElMessageBox.confirm(
        `检测到 ${draftSavedAt.value} 前的未保存草稿，是否恢复？`,
        '恢复草稿',
        {
          confirmButtonText: '恢复',
          cancelButtonText: '丢弃',
          type: 'info'
        }
      );
      // 用户选择恢复
      editor.value?.commands.setContent(draft.content);
      emit('update:modelValue', draft.content);
      ElMessage.success('草稿已恢复');
    } catch {
      // 用户选择丢弃
      clearDraft();
    }
  } catch (e) {
    localStorage.removeItem(DRAFT_KEY);
  }
}

/** 启动自动保存定时器（每 30 秒） */
function startAutoSave() {
  if (autoSaveTimer) clearInterval(autoSaveTimer);
  autoSaveTimer = setInterval(() => {
    saveDraft();
  }, 30000);
}

watch(
  () => props.modelValue,
  (newVal) => {
    // 跳过编辑器内部触发的更新，防止光标重置和内容闪烁
    if (skipModelUpdate.value) return;
    if (editor.value && newVal !== editor.value.getHTML()) {
      editor.value.commands.setContent(newVal, false);
    }
  }
);

const openLinkDialog = () => {
  linkUrl.value = '';
  linkText.value = '';
  linkDialogVisible.value = true;
};

const insertLink = () => {
  if (!linkUrl.value) {
    ElMessage.warning('请输入链接地址');
    return;
  }

  const url = linkUrl.value.startsWith('http') ? linkUrl.value : `https://${linkUrl.value}`;
  const text = linkText.value || url;

  editor.value
    .chain()
    .focus()
    .extendMarkRange('link')
    .setLink({ href: url })
    .command(({ commands }) => {
      return commands.insertContent(text);
    })
    .run();

  linkDialogVisible.value = false;
  linkUrl.value = '';
  linkText.value = '';
};

// ==================== 图片上传 ====================

const triggerImageUpload = () => {
  imageInputRef.value?.click();
};

const handleImageFileChange = async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    imageUploading.value = true;
    const res = await uploadImage(file);
    if (res.code === 200) {
      const url = res.data.url;
      editor.value.chain().focus().setImage({ src: url }).run();
      ElMessage.success('图片插入成功');
    } else {
      ElMessage.error('图片上传失败');
    }
  } catch (err) {
    console.error('图片上传错误:', err);
    ElMessage.error('图片上传失败');
  } finally {
    imageUploading.value = false;
    // 清空 input 以便重复选择同一文件
    event.target.value = '';
  }
};

// ==================== 音频上传 ====================

const triggerAudioUpload = () => {
  audioInputRef.value?.click();
};

const handleAudioFileChange = async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    audioUploading.value = true;
    const res = await uploadAudio(file);
    if (res.code === 200) {
      const url = res.data.url;
      // 使用 setAudio 命令插入 block atom 节点，确保 ProseMirror 正确处理
      editor.value.chain().focus().setAudio({ src: url }).run();
      ElMessage.success('音频插入成功');
    } else {
      ElMessage.error('音频上传失败');
    }
  } catch (err) {
    console.error('音频上传错误:', err);
    ElMessage.error('音频上传失败');
  } finally {
    audioUploading.value = false;
    event.target.value = '';
  }
};

// ==================== 视频上传 ====================

const triggerVideoUpload = () => {
  videoInputRef.value?.click();
};

const handleVideoFileChange = async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    videoUploading.value = true;
    const res = await uploadVideo(file);
    if (res.code === 200) {
      const url = res.data.url;
      // 使用 setVideo 命令插入 block atom 节点，确保 ProseMirror 正确处理
      editor.value.chain().focus().setVideo({ src: url }).run();
      ElMessage.success('视频插入成功');
    } else {
      ElMessage.error('视频上传失败');
    }
  } catch (err) {
    console.error('视频上传错误:', err);
    ElMessage.error('视频上传失败');
  } finally {
    videoUploading.value = false;
    event.target.value = '';
  }
};

onMounted(() => {
  // 启动自动保存（每 30 秒）
  startAutoSave();
  // 检查历史草稿
  checkExistingDraft();
});

onBeforeUnmount(() => {
  if (autoSaveTimer) clearInterval(autoSaveTimer);
  editor.value?.destroy();
});

// 暴露 clearDraft 给父组件，以便手动保存/发布成功后清除草稿
defineExpose({ clearDraft });
</script>

<style scoped>
.tiptap-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #121828;
  border-radius: 10px;
  border: 1px solid #1e293b;
  overflow: hidden;
}

/* 工具栏 */
.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 12px 16px;
  background: linear-gradient(180deg, #1a2035 0%, #121828 100%);
  border-bottom: 1px solid #1e293b;
  flex-wrap: wrap;
}

.toolbar-btn {
  padding: 6px 10px;
  height: 34px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 6px;
  color: #cbd5e1;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.toolbar-btn:hover {
  background: #334155;
  color: #f1f5f9;
  border-color: #475569;
}

.toolbar-btn.active {
  background: #dc2626;
  border-color: #991b1b;
  color: #f1f5f9;
  box-shadow: 0 0 8px rgba(220, 38, 38, 0.3);
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background: #334155;
  margin: 0 4px;
}

.toolbar-spacer {
  flex: 1;
}

.word-count {
  font-size: 12px;
  color: #64748b;
  padding: 0 8px;
}

/* 草稿指示器 */
.draft-indicator {
  font-size: 12px;
  color: #f59e0b;
  padding: 0 8px;
  white-space: nowrap;
}

.draft-clear-btn {
  padding: 4px 10px;
  height: 28px;
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 6px;
  color: #f59e0b;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.draft-clear-btn:hover {
  background: rgba(245, 158, 11, 0.25);
  border-color: #f59e0b;
}

/* 编辑器内容区 */
.editor-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

/* TipTap 内容样式 */
:deep(.tiptap-content) {
  outline: none;
  color: #f1f5f9;
  font-size: 15px;
  line-height: 1.8;
  min-height: 400px;
}

:deep(.tiptap-content) h1 {
  font-size: 32px;
  font-weight: 800;
  margin: 24px 0 16px;
  color: #f1f5f9;
  letter-spacing: -0.5px;
}

:deep(.tiptap-content) h2 {
  font-size: 24px;
  font-weight: 700;
  margin: 20px 0 12px;
  color: #f1f5f9;
}

:deep(.tiptap-content) h3 {
  font-size: 18px;
  font-weight: 600;
  margin: 16px 0 10px;
  color: #f1f5f9;
}

:deep(.tiptap-content) p {
  margin: 12px 0;
}

:deep(.tiptap-content) a {
  color: #fca5a5;
  text-decoration: none;
  border-bottom: 1px solid rgba(252, 165, 165, 0.3);
  transition: all 0.2s ease;
}

:deep(.tiptap-content) a:hover {
  color: #f87171;
  border-bottom-color: #fca5a5;
}

:deep(.tiptap-content) ul,
:deep(.tiptap-content) ol {
  margin: 12px 0;
  padding-left: 24px;
}

:deep(.tiptap-content) li {
  margin: 6px 0;
}

:deep(.tiptap-content) blockquote {
  border-left: 3px solid #dc2626;
  padding: 12px 16px;
  margin: 16px 0;
  background: rgba(220, 38, 38, 0.1);
  border-radius: 4px;
  color: #cbd5e1;
  font-style: italic;
}

:deep(.tiptap-content) code {
  background: #1e293b;
  padding: 2px 6px;
  border-radius: 4px;
  color: #fca5a5;
  font-family: 'Fira Code', monospace;
  font-size: 14px;
}

:deep(.tiptap-content) pre {
  background: #0f1624;
  border: 1px solid #1e293b;
  border-radius: 8px;
  padding: 16px;
  margin: 16px 0;
  overflow-x: auto;
  line-height: 1.6;
}

:deep(.tiptap-content) pre code {
  background: transparent;
  padding: 0;
  color: #f1f5f9;
  font-size: 13px;
}

:deep(.tiptap-content) img {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 16px 0;
  border: 1px solid #1e293b;
}

:deep(.tiptap-content) audio,
:deep(.tiptap-content) video {
  max-width: 100%;
  height: auto;
  margin: 16px 0;
  border-radius: 4px;
  background: #0f1624;
  border: 1px solid #1e293b;
}

:deep(.tiptap-content) table {
  border-collapse: collapse;
  width: 100%;
  margin: 16px 0;
  border: 1px solid #1e293b;
  background: #0f1624;
}

:deep(.tiptap-content) table th,
:deep(.tiptap-content) table td {
  border: 1px solid #1e293b;
  padding: 12px;
  text-align: left;
}

:deep(.tiptap-content) table th {
  background: #1a2035;
  font-weight: 600;
  color: #f1f5f9;
}

:deep(.tiptap-content) table td {
  color: #cbd5e1;
}

:deep(.tiptap-content) hr {
  border: none;
  height: 1px;
  background: linear-gradient(90deg, transparent, #334155, transparent);
  margin: 24px 0;
}

/* 滚动条 */
.editor-content::-webkit-scrollbar {
  width: 8px;
}

.editor-content::-webkit-scrollbar-track {
  background: transparent;
}

.editor-content::-webkit-scrollbar-thumb {
  background: #334155;
  border-radius: 4px;
}

.editor-content::-webkit-scrollbar-thumb:hover {
  background: #475569;
}

/* ========== 响应式：窄屏工具栏适配 ========== */
@media (max-width: 768px) {
  .editor-toolbar {
    padding: 8px 10px;
    gap: 2px;
  }

  .toolbar-btn {
    padding: 4px 7px;
    height: 28px;
    font-size: 11px;
    border-radius: 4px;
  }

  .toolbar-divider {
    height: 18px;
    margin: 0 2px;
  }

  .word-count {
    font-size: 10px;
    padding: 0 4px;
  }

  .editor-content {
    padding: 12px;
  }
}

@media (max-width: 480px) {
  .editor-toolbar {
    padding: 6px 8px;
    gap: 1px;
  }

  .toolbar-btn {
    padding: 3px 5px;
    height: 26px;
    font-size: 10px;
    border-radius: 3px;
  }

  .toolbar-divider {
    height: 14px;
    margin: 0 1px;
  }

  .word-count {
    display: none;
  }
}
</style>
