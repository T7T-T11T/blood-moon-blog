<template>
  <div class="article-edit-page">
    <div class="edit-container">
      <!-- 编辑器主体 -->
      <div class="editor-main">
        <el-form ref="formRef" :model="form" :rules="rules" class="article-form">
          <!-- 标题输入 -->
          <el-form-item prop="title">
            <el-input
              v-model="form.title"
              placeholder="请输入文章标题"
              class="title-input"
              size="large"
            />
          </el-form-item>

          <!-- 摘要输入 -->
          <el-form-item prop="summary">
            <el-input
              v-model="form.summary"
              type="textarea"
              :rows="2"
              placeholder="请输入文章摘要（可选）"
              maxlength="200"
              show-word-limit
            />
          </el-form-item>

          <!-- 分类选择 -->
          <el-form-item prop="category_id">
            <el-select
              v-model="form.category_id"
              placeholder="选择分类"
              clearable
              style="width: 200px"
            >
              <el-option
                v-for="cat in categories"
                :key="cat.id"
                :label="cat.name"
                :value="cat.id"
              />
            </el-select>
          </el-form-item>

          <!-- 标签选择 -->
          <el-form-item prop="tag_ids">
            <el-select
              v-model="form.tag_ids"
              placeholder="选择标签"
              multiple
              filterable
              allow-create
              style="width: 100%"
            >
              <el-option v-for="tag in tags" :key="tag.id" :label="tag.name" :value="tag.id" />
            </el-select>
          </el-form-item>

          <!-- 内容编辑器 -->
          <el-form-item prop="content">
            <div class="editor-wrapper">
              <MdEditor v-model="form.content" :toolbars="toolbars" placeholder="开始写作..." />
            </div>
          </el-form-item>

          <!-- 状态选择 -->
          <el-form-item prop="status">
            <el-radio-group v-model="form.status">
              <el-radio value="已发布">已发布</el-radio>
              <el-radio value="草稿">草稿</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-form>
      </div>

      <!-- 右侧设置面板 -->
      <div class="settings-panel">
        <div class="panel-section">
          <h3 class="panel-title">发布设置</h3>
          <div class="setting-item">
            <span class="setting-label">状态</span>
            <el-tag :type="form.status === '已发布' ? 'success' : 'warning'" effect="dark">
              {{ form.status }}
            </el-tag>
          </div>
        </div>

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

        <div v-if="!isNew" class="panel-section">
          <h3 class="panel-title">文章信息</h3>
          <div class="info-item">
            <span class="info-label">创建时间</span>
            <span class="info-value">{{ formatDate(article?.created_at) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">更新时间</span>
            <span class="info-value">{{ formatDate(article?.updated_at) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">阅读量</span>
            <span class="info-value">{{ article?.view_count || 0 }}</span>
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

const route = useRoute();
const router = useRouter();

/** 表单引用 */
const formRef = ref(null);

/** 是否新建 */
const isNew = computed(() => !route.params.id);

/** 文章数据 */
const article = ref(null);

/** 加载中 */
const loading = ref(false);

/** 保存中 */
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
  status: '已发布'
});

/** 表单验证规则 */
const rules = {
  title: [
    { required: true, message: '请输入文章标题', trigger: 'blur' },
    { min: 2, max: 200, message: '标题长度在 2 到 200 个字符', trigger: 'blur' }
  ],
  content: [{ required: true, message: '请输入文章内容', trigger: 'blur' }]
};

/** 编辑器工具栏配置 */
const toolbars = [
  'bold',
  'italic',
  'underline',
  'strikeThrough',
  '-',
  'title',
  'sub',
  'quote',
  '-',
  'alert',
  'image',
  'video',
  'audio',
  'file',
  '-',
  'list',
  'ordered-list',
  'task',
  '-',
  'link',
  'table',
  '=',
  'preview',
  'htmlPreview',
  'catalog'
];

/** 格式化日期 */
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
    const res = await fetch('/api/categories');
    const json = await res.json();
    if (json.code === 200) {
      categories.value = json.data;
    }
  } catch (e) {
    console.error('加载分类失败:', e);
  }
}

/** 加载标签列表 */
async function loadTags() {
  try {
    const res = await fetch('/api/tags');
    const json = await res.json();
    if (json.code === 200) {
      tags.value = json.data;
    }
  } catch (e) {
    console.error('加载标签失败:', e);
  }
}

/** 加载文章详情 */
async function loadArticle() {
  if (isNew.value) return;

  loading.value = true;
  try {
    const res = await fetch(`/api/articles/${route.params.id}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    const json = await res.json();
    if (json.code === 200) {
      article.value = json.data;
      // 填充表单
      form.value.title = json.data.title;
      form.value.summary = json.data.summary || '';
      form.value.content = json.data.content;
      form.value.category_id = json.data.category_id;
      form.value.tag_ids = json.data.tags?.map((t) => t.id) || [];
      form.value.status = json.data.status;
    }
  } catch (e) {
    console.error('加载文章失败:', e);
    ElMessage.error('加载文章失败');
  } finally {
    loading.value = false;
  }
}

/** 保存文章 */
async function saveArticle(status = '已发布') {
  if (!formRef.value) return;

  try {
    await formRef.value.validate();
  } catch {
    return;
  }

  saving.value = true;
  try {
    const url = isNew.value ? '/api/articles' : `/api/articles/${route.params.id}`;
    const method = isNew.value ? 'POST' : 'PUT';

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        title: form.value.title,
        content: form.value.content,
        summary: form.value.summary,
        category_id: form.value.category_id,
        tag_ids: form.value.tag_ids,
        status
      })
    });
    const json = await res.json();

    if (json.code === 200) {
      ElMessage.success(isNew.value ? '创建成功' : '更新成功');
      if (isNew.value && json.data?.id) {
        router.replace(`/admin/articles/edit/${json.data.id}`);
      } else {
        router.push('/admin/articles');
      }
    } else {
      ElMessage.error(json.message || '保存失败');
    }
  } catch (e) {
    console.error('保存文章失败:', e);
    ElMessage.error('保存失败');
  } finally {
    saving.value = false;
  }
}

/** 保存 */
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

/** 取消 */
function handleCancel() {
  router.back();
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

/* 编辑器主体 */
.editor-main {
  flex: 1;
  padding: 32px 40px;
  overflow-y: auto;
}

.article-form {
  max-width: 900px;
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
}

.editor-wrapper {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
}

.editor-wrapper :deep(.md-editor) {
  border: none;
  min-height: 500px;
}

/* 设置面板 */
.settings-panel {
  width: 280px;
  background: #f8fafc;
  border-left: 1px solid #e2e8f0;
  padding: 24px;
  overflow-y: auto;
}

.panel-section {
  margin-bottom: 32px;
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: #475569;
  margin: 0 0 16px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.setting-item,
.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #e2e8f0;
}

.setting-label,
.info-label {
  font-size: 14px;
  color: #64748b;
}

.info-value {
  font-size: 13px;
  color: #0f172a;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
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
    padding: 20px;
  }

  .title-input :deep(.el-input__wrapper),
  .title-input :deep(.el-input__inner) {
    font-size: 24px;
  }
}
</style>
