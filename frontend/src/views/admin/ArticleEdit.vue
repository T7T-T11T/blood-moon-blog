<template>
  <div class="article-edit-page">
    <div class="edit-container">
      <!-- 左侧编辑区 -->
      <div class="editor-main">
        <el-form ref="formRef" :model="form" :rules="rules" class="article-form">
          <!-- 标题输入 -->
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

          <!-- 内容编辑器 -->
          <el-form-item prop="content" class="content-form-item">
            <div class="editor-wrapper">
              <MdEditor
                v-model="form.content"
                :toolbars="toolbars"
                placeholder="开始写作..."
                class="md-editor"
              />
            </div>
          </el-form-item>
        </el-form>
      </div>

      <!-- 右侧设置面板 -->
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
              placeholder="选择或输入标签"
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
            <el-button size="large" :disabled="isNew" @click="handleCancel"> 取消 </el-button>
          </div>
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
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { MdEditor } from 'md-editor-v3';
import 'md-editor-v3/lib/preview.css';
import { Check, Promotion, Document } from '@element-plus/icons-vue';
import { getAdminArticleDetail, addArticle, updateArticle } from '@/api/articles';
import { getCategories } from '@/api/categories';
import { getTags } from '@/api/tags';

const route = useRoute();
const router = useRouter();

/** 表单引用 */
const formRef = ref(null);

/** 是否新建文章 */
const isNew = computed(() => !route.params.id);

/** 文章详情（编辑模式下） */
const article = ref(null);

/** 加载状态 */
const loading = ref(false);

/** 保存状态 */
const saving = ref(false);

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

/** 表单验证规则 */
const rules = {
  title: [
    { required: true, message: '请输入文章标题', trigger: 'blur' },
    { min: 2, max: 200, message: '标题长度在 2 到 200 个字符', trigger: 'blur' }
  ],
  content: [{ required: true, message: '请输入文章内容', trigger: 'blur' }]
};

/**
 * md-editor-v3 工具栏配置
 * 说明：使用 '|' 作为分组分隔符
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
 * 格式化日期
 * @param {string} dateStr - 日期字符串
 * @returns {string} 格式化后的日期
 */
function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
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

/** 加载文章详情（编辑模式） */
async function loadArticle() {
  if (isNew.value) return;

  loading.value = true;
  try {
    const res = await getAdminArticleDetail(route.params.id);
    if (res.code === 200) {
      article.value = res.data;
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
  } finally {
    loading.value = false;
  }
}

/**
 * 保存文章
 * @param {string} status - 文章状态（已发布/草稿）
 */
async function saveArticle(status = '草稿') {
  if (!formRef.value) return;

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

/** 取消编辑 */
function handleCancel() {
  router.push('/admin/articles');
}

onMounted(() => {
  loadCategories();
  loadTags();
  loadArticle();
});
</script>

<style scoped>
.article-edit-page {
  padding: 0;
  margin: -24px -32px;
  min-height: calc(100vh - 60px);
  background: #fff;
}

.edit-container {
  display: flex;
  height: calc(100vh - 60px);
}

/* 编辑主区域 */
.editor-main {
  flex: 1;
  padding: 32px 40px;
  overflow-y: auto;
}

.article-form {
  max-width: 860px;
}

/* 标题样式 */
.title-form-item {
  margin-bottom: 8px;
}

.title-input :deep(.el-input__wrapper) {
  box-shadow: none;
  border: none;
  padding: 0;
  font-size: 32px;
  font-weight: 700;
}

.title-input :deep(.el-input__inner) {
  font-size: 32px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.3;
}

.title-input :deep(.el-input__inner::placeholder) {
  color: #cbd5e1;
  font-weight: 400;
}

/* 摘要样式 */
.summary-form-item {
  margin-bottom: 16px;
}

.summary-input :deep(.el-textarea__inner) {
  font-size: 14px;
  line-height: 1.6;
  color: #475569;
}

/* 编辑器样式 */
.content-form-item {
  margin-bottom: 0;
}

.editor-wrapper {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  transition: border-color 0.2s;
}

.editor-wrapper:focus-within {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.editor-wrapper :deep(.md-editor) {
  border: none;
  min-height: 480px;
  font-size: 15px;
}

.editor-wrapper :deep(.md-editor__toolbar) {
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  padding: 8px 12px;
}

.editor-wrapper :deep(.md-editor__content) {
  padding: 24px 28px;
}

.editor-wrapper :deep(.md-editor__preview) {
  padding: 24px 28px;
}

/* 设置面板 */
.settings-panel {
  width: 280px;
  flex-shrink: 0;
  background: #f8fafc;
  border-left: 1px solid #e2e8f0;
  padding: 24px;
  overflow-y: auto;
}

.panel-section {
  margin-bottom: 28px;
}

.panel-title {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  margin: 0 0 16px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #e2e8f0;
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
  color: #64748b;
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
  border-bottom: 1px solid #e2e8f0;
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 13px;
  color: #64748b;
}

.info-value {
  font-size: 13px;
  color: #0f172a;
  font-weight: 500;
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.action-buttons .el-button {
  width: 100%;
  justify-content: flex-start;
}

/* 响应式 */
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
}
</style>
