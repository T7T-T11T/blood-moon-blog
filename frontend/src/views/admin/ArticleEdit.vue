<template>
  <div class="article-edit-page animate-fade-in">
    <div class="edit-container">
      <!-- 左侧编辑主区域 -->
      <div class="editor-main">
        <el-form ref="formRef" :model="form" :rules="rules" class="article-form">
          <!-- 标题输入（大号无边框） -->
          <el-form-item prop="title" class="title-form-item">
            <el-input
              v-model="form.title"
              placeholder="请输入文章标题"
              class="title-input"
              size="large"
            />
          </el-form-item>

          <!-- 摘要输入 -->
          <el-form-item prop="summary" class="summary-form-item">
            <el-input
              v-model="form.summary"
              type="textarea"
              :rows="2"
              placeholder="请输入文章摘要（可选）"
              maxlength="200"
              show-word-limit
              class="summary-input"
            />
          </el-form-item>

          <!-- Markdown 内容编辑器 -->
          <el-form-item prop="content" class="content-form-item">
            <div class="editor-wrapper">
              <MdEditor
                ref="mdEditorRef"
                v-model="form.content"
                :toolbars="toolbars"
                placeholder="开始写作..."
                class="md-editor"
                theme="dark"
              />
            </div>
          </el-form-item>
        </el-form>
      </div>

      <!-- 右侧发布设置面板 -->
      <div class="settings-panel">
        <!-- 发布设置 -->
        <div class="panel-section">
          <h3 class="panel-title">发布设置</h3>

          <div class="setting-item">
            <span class="setting-label">状态</span>
            <el-tag
              :type="form.status === '已发布' ? 'success' : 'warning'"
              effect="dark"
              size="small"
            >
              {{ form.status }}
            </el-tag>
          </div>

          <div class="setting-item">
            <span class="setting-label">分类</span>
            <el-select
              v-model="form.category_id"
              placeholder="选择分类"
              clearable
              size="small"
              class="setting-select"
            >
              <el-option
                v-for="cat in categories"
                :key="cat.id"
                :label="cat.name"
                :value="cat.id"
              />
            </el-select>
          </div>

          <div class="setting-item setting-item-block">
            <span class="setting-label">标签</span>
            <el-select
              v-model="form.tag_ids"
              placeholder="选择标签"
              multiple
              filterable
              allow-create
              size="small"
              class="setting-select"
            >
              <el-option v-for="tag in tags" :key="tag.id" :label="tag.name" :value="tag.id" />
            </el-select>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="panel-section">
          <h3 class="panel-title">操作</h3>
          <div class="action-buttons">
            <el-button type="success" size="large" :loading="saving" @click="handleSave">
              <el-icon><Check /></el-icon>
              <span>保存</span>
            </el-button>
            <el-button size="large" :loading="saving" @click="handleSaveAndPublish">
              <el-icon><Promotion /></el-icon>
              <span>保存并发布</span>
            </el-button>
            <el-button size="large" :loading="saving" @click="handleDraft">
              <el-icon><Document /></el-icon>
              <span>存为草稿</span>
            </el-button>
            <el-button size="large" :disabled="isNew" @click="handleCancel">取消</el-button>
          </div>
        </div>

        <!-- 媒体上传 -->
        <div class="panel-section">
          <h3 class="panel-title">媒体上传</h3>
          <div class="media-buttons">
            <input
              ref="audioInputRef"
              type="file"
              accept="audio/*"
              style="display: none"
              @change="handleAudioSelected"
            />
            <input
              ref="videoInputRef"
              type="file"
              accept="video/*"
              style="display: none"
              @change="handleVideoSelected"
            />
            <el-button size="small" :loading="uploadingAudio" @click="selectAudio">
              <el-icon><Headset /></el-icon>
              <span>上传音频</span>
            </el-button>
            <el-button size="small" :loading="uploadingVideo" @click="selectVideo">
              <el-icon><VideoCamera /></el-icon>
              <span>上传视频</span>
            </el-button>
          </div>
          <p class="media-tip">上传后自动插入编辑器光标处</p>
        </div>

        <!-- 文章信息（仅编辑模式显示） -->
        <div v-if="!isNew && article" class="panel-section">
          <h3 class="panel-title">文章信息</h3>
          <div class="info-item">
            <span class="info-label">创建时间</span>
            <span class="info-value">{{ formatDate(article.created_at) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">更新时间</span>
            <span class="info-value">{{ formatDate(article.updated_at) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">阅读量</span>
            <span class="info-value">{{ article.view_count || 0 }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * @file ArticleEdit.vue
 * @description 文章编辑/新增页面（管理端）
 * 作用：提供标题、摘要、Markdown 正文、分类与标签的编辑表单，
 *       支持保存、保存并发布、存为草稿三种操作。编辑模式下加载已有文章详情。
 * 依赖 API：getAdminArticleDetail / addArticle / updateArticle / getCategories / getTags
 */
import { ref, computed, onMounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { MdEditor } from 'md-editor-v3';
import 'md-editor-v3/lib/preview.css';
import { Check, Promotion, Document, Headset, VideoCamera } from '@element-plus/icons-vue';
import { getAdminArticleDetail, addArticle, updateArticle } from '@/api/articles';
import { getCategories } from '@/api/categories';
import { getTags } from '@/api/tags';
import { uploadAudio, uploadVideo } from '@/api/upload';

const route = useRoute();
const router = useRouter();

/** 表单引用 */
const formRef = ref(null);

/** MdEditor 组件引用 */
const mdEditorRef = ref(null);

/** 是否为新建模式（无路由 id 参数） */
const isNew = computed(() => !route.params.id);

/** 文章详情（编辑模式下缓存原始数据） */
const article = ref(null);

/** 保存中状态 */
const saving = ref(false);

/** 音频上传中状态 */
const uploadingAudio = ref(false);

/** 视频上传中状态 */
const uploadingVideo = ref(false);

/** 音频文件 input 引用 */
const audioInputRef = ref(null);

/** 视频文件 input 引用 */
const videoInputRef = ref(null);

/** 分类列表 */
const categories = ref([]);

/** 标签列表 */
const tags = ref([]);

/** 表单数据 */
const form = ref({
  title: '',
  summary: '',
  content: '',
  category_id: null,
  tag_ids: [],
  status: '草稿'
});

/** 表单校验规则 */
const rules = {
  title: [
    { required: true, message: '请输入文章标题', trigger: 'blur' },
    { min: 2, max: 200, message: '标题长度在 2 到 200 个字符', trigger: 'blur' }
  ],
  content: [{ required: true, message: '请输入文章内容', trigger: 'blur' }]
};

/**
 * md-editor-v3 工具栏配置
 * 使用 '|' 作为分组分隔符
 */
const toolbars = [
  'bold',
  'italic',
  'underline',
  'strikeThrough',
  '|',
  'title',
  'sub',
  'quote',
  '|',
  'image',
  'video',
  'file',
  '|',
  'list',
  'ordered-list',
  'task',
  '|',
  'link',
  'table',
  '|',
  'preview',
  'htmlPreview',
  'catalog'
];

/**
 * 格式化日期为完整本地时间
 * @param {string} dateStr - 后端返回的时间字符串
 * @returns {string} 格式化后的日期
 */
function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/** 加载分类列表 */
async function loadCategories() {
  try {
    const res = await getCategories();
    if (res.code === 200) {
      categories.value = res.data;
    }
  } catch (e) {
    console.error('加载分类失败:', e);
  }
}

/** 加载标签列表 */
async function loadTags() {
  try {
    const res = await getTags();
    if (res.code === 200) {
      tags.value = res.data;
    }
  } catch (e) {
    console.error('加载标签失败:', e);
  }
}

/** 加载文章详情（仅编辑模式） */
async function loadArticle() {
  if (isNew.value) return;

  try {
    const res = await getAdminArticleDetail(route.params.id);
    if (res.code === 200) {
      article.value = res.data;
      // 回填表单字段
      form.value.title = res.data.title;
      form.value.summary = res.data.summary || '';
      form.value.content = res.data.content;
      form.value.category_id = res.data.category_id;
      form.value.tag_ids = res.data.tags?.map((t) => t.id) || [];
      form.value.status = res.data.status;
    }
  } catch (e) {
    console.error('加载文章失败:', e);
    ElMessage.error('加载文章失败');
  }
}

/**
 * 保存文章（新增或更新）
 * @param {string} status - 目标状态（已发布/草稿）
 */
async function saveArticle(status = '草稿') {
  if (!formRef.value) return;

  // 先做表单校验
  try {
    await formRef.value.validate();
  } catch {
    return;
  }

  saving.value = true;
  try {
    const payload = {
      title: form.value.title,
      content: form.value.content,
      summary: form.value.summary,
      category_id: form.value.category_id,
      tag_ids: form.value.tag_ids,
      status
    };

    let res;
    if (isNew.value) {
      res = await addArticle(payload);
    } else {
      res = await updateArticle(route.params.id, payload);
    }

    if (res.code === 200) {
      ElMessage.success(isNew.value ? '创建成功' : '更新成功');
      // 新建成功后跳转到编辑页（带新 id），否则返回列表
      if (isNew.value && res.data?.id) {
        router.replace(`/admin/articles/edit/${res.data.id}`);
      } else {
        router.push('/admin/articles');
      }
    } else {
      ElMessage.error(res.message || '保存失败');
    }
  } catch (e) {
    console.error('保存文章失败:', e);
    ElMessage.error('保存失败');
  } finally {
    saving.value = false;
  }
}

/** 保存（保持当前状态） */
function handleSave() {
  saveArticle(form.value.status);
}

/** 保存并发布 */
function handleSaveAndPublish() {
  saveArticle('已发布');
}

/** 存为草稿 */
function handleDraft() {
  saveArticle('草稿');
}

/** 取消编辑，返回列表 */
function handleCancel() {
  router.push('/admin/articles');
}

/** 触发音频文件选择 */
function selectAudio() {
  audioInputRef.value?.click();
}

/** 触发视频文件选择 */
function selectVideo() {
  videoInputRef.value?.click();
}

/**
 * 将文本插入编辑器光标位置
 * @param {string} text - 要插入的文本
 */
function insertIntoEditor(text) {
  // 优先尝试通过 MdEditor 内部的 textarea 插入
  const wrapper = mdEditorRef.value?.$el;
  const textarea = wrapper?.querySelector('textarea');
  if (textarea) {
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const value = form.value.content || '';
    form.value.content = value.substring(0, start) + text + value.substring(end);
    // 恢复光标位置
    nextTick(() => {
      textarea.selectionStart = textarea.selectionEnd = start + text.length;
      textarea.focus();
    });
  } else {
    // 兜底：追加到末尾
    form.value.content = (form.value.content || '') + '\n' + text + '\n';
  }
}

/**
 * 处理音频文件选择并上传
 * @param {Event} e - input change 事件
 */
async function handleAudioSelected(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  uploadingAudio.value = true;
  try {
    const res = await uploadAudio(file);
    if (res.code === 200) {
      const url = res.data?.url || '';
      const name = res.data?.originalName || '音频';
      const tag = `\n<audio controls src="${url}" style="width:100%">${name}</audio>\n`;
      insertIntoEditor(tag);
      ElMessage.success('音频上传成功');
    } else {
      ElMessage.error(res.message || '上传失败');
    }
  } catch (err) {
    console.error('音频上传失败:', err);
    ElMessage.error('音频上传失败');
  } finally {
    uploadingAudio.value = false;
    if (audioInputRef.value) audioInputRef.value.value = '';
  }
}

/**
 * 处理视频文件选择并上传
 * @param {Event} e - input change 事件
 */
async function handleVideoSelected(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  uploadingVideo.value = true;
  try {
    const res = await uploadVideo(file);
    if (res.code === 200) {
      const url = res.data?.url || '';
      const name = res.data?.originalName || '视频';
      const tag = `\n<video controls src="${url}" style="width:100%;max-height:480px">${name}</video>\n`;
      insertIntoEditor(tag);
      ElMessage.success('视频上传成功');
    } else {
      ElMessage.error(res.message || '上传失败');
    }
  } catch (err) {
    console.error('视频上传失败:', err);
    ElMessage.error('视频上传失败');
  } finally {
    uploadingVideo.value = false;
    if (videoInputRef.value) videoInputRef.value.value = '';
  }
}

onMounted(() => {
  loadCategories();
  loadTags();
  loadArticle();
});
</script>

<style scoped>
/* ========== 编辑页容器（全屏铺满内容区） ========== */
.article-edit-page {
  padding: 0;
  margin: -24px -32px;
  min-height: calc(100vh - 60px);
  background: var(--bg-card);
}

.edit-container {
  display: flex;
  height: calc(100vh - 60px);
}

/* ========== 左侧编辑主区域 ========== */
.editor-main {
  flex: 1;
  padding: 32px 40px;
  overflow-y: auto;
}

.article-form {
  max-width: 860px;
}

/* 标题输入：大号无边框 */
.title-form-item {
  margin-bottom: 8px;
}

.title-input :deep(.el-input__wrapper) {
  box-shadow: none;
  border: none;
  padding: 0;
}

.title-input :deep(.el-input__inner) {
  font-size: 30px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.3;
}

.title-input :deep(.el-input__inner::placeholder) {
  color: var(--text-placeholder);
  font-weight: 400;
}

/* 摘要输入 */
.summary-form-item {
  margin-bottom: 16px;
}

.summary-input :deep(.el-textarea__inner) {
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-secondary);
}

/* Markdown 编辑器外层包装 */
.content-form-item {
  margin-bottom: 0;
}

.editor-wrapper {
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
  transition: border-color 0.2s var(--ease-out);
}

.editor-wrapper:focus-within {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.15);
}

.editor-wrapper :deep(.md-editor) {
  border: none;
  min-height: 480px;
  font-size: 15px;
  background: var(--bg-body);
}

.editor-wrapper :deep(.md-editor__toolbar) {
  display: flex !important;
  flex-direction: row !important;
  flex-wrap: wrap !important;
  align-items: center !important;
  gap: 2px;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border);
  padding: 8px 12px;
}

.editor-wrapper :deep(.md-editor__toolbar > *) {
  display: inline-flex !important;
  flex-direction: row !important;
}

.editor-wrapper :deep(.md-editor__content) {
  padding: 24px 28px;
  background: var(--bg-body);
}

.editor-wrapper :deep(.md-editor__preview) {
  padding: 24px 28px;
  background: var(--bg-body);
  color: var(--text-primary);
}

/* MdEditor 暗色主题覆盖 */
.editor-wrapper :deep(.md-editor-dark) {
  background: var(--bg-body) !important;
  color: var(--text-primary) !important;
}

.editor-wrapper :deep(.md-editor-dark .md-editor__content) {
  background: var(--bg-body) !important;
  color: var(--text-primary) !important;
}

.editor-wrapper :deep(.md-editor-dark .md-editor__content textarea) {
  background: var(--bg-body) !important;
  color: var(--text-primary) !important;
}

.editor-wrapper :deep(.md-editor-dark .md-editor__preview) {
  background: var(--bg-body) !important;
  color: var(--text-primary) !important;
}

.editor-wrapper :deep(.md-editor-dark .md-editor__preview h1),
.editor-wrapper :deep(.md-editor-dark .md-editor__preview h2),
.editor-wrapper :deep(.md-editor-dark .md-editor__preview h3) {
  color: var(--text-primary) !important;
}

.editor-wrapper :deep(.md-editor-dark .md-editor__preview p),
.editor-wrapper :deep(.md-editor-dark .md-editor__preview li) {
  color: var(--text-secondary) !important;
}

.editor-wrapper :deep(.md-editor-dark .md-editor__preview code) {
  background: var(--bg-hover) !important;
  color: var(--primary-light) !important;
}

.editor-wrapper :deep(.md-editor-dark .md-editor__preview blockquote) {
  border-left-color: var(--primary) !important;
  background: var(--bg-hover) !important;
  color: var(--text-secondary) !important;
}

.editor-wrapper :deep(.md-editor-dark .md-editor__table) {
  background: var(--bg-card) !important;
  color: var(--text-primary) !important;
  border-color: var(--border) !important;
}

/* ========== 右侧设置面板 ========== */
.settings-panel {
  width: 280px;
  flex-shrink: 0;
  background: var(--bg-card);
  border-left: 1px solid var(--border);
  padding: 24px;
  overflow-y: auto;
}

.panel-section {
  margin-bottom: 28px;
}

.panel-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  margin: 0 0 16px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-light);
  gap: 12px;
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-item-block {
  flex-direction: column;
  align-items: stretch;
}

.setting-label {
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.setting-select {
  width: 180px;
}

.setting-item-block .setting-select {
  width: 100%;
  margin-top: 6px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-light);
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.info-value {
  font-size: 13px;
  color: var(--text-primary);
  font-weight: 500;
}

/* 操作按钮纵向排列 */
.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.action-buttons .el-button {
  width: 100%;
  justify-content: flex-start;
}

/* 媒体上传按钮 */
.media-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.media-buttons .el-button {
  width: 100%;
  justify-content: flex-start;
}

.media-tip {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--text-tertiary);
}

/* ========== 响应式 ========== */
@media (max-width: 1024px) {
  .settings-panel {
    display: none;
  }
}

@media (max-width: 768px) {
  .editor-main {
    padding: 16px;
  }

  .title-input :deep(.el-input__wrapper),
  .title-input :deep(.el-input__inner) {
    font-size: 24px;
  }

  .article-edit-page {
    margin: -16px;
  }
}
</style>
