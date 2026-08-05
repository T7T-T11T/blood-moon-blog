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

          <!-- 内容编辑器 -->
          <el-form-item prop="content" class="content-form-item">
            <div class="editor-wrapper">
              <TipTapEditor ref="editorRef" v-model="form.content" placeholder="开始写作..." />
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
          <!-- 自动保存状态 -->
          <div v-if="lastSavedAt" class="auto-save-tip">
            <el-icon><Clock /></el-icon>
            <span>草稿已保存 {{ new Date(lastSavedAt).toLocaleTimeString('zh-CN') }}</span>
          </div>
          <div v-if="isDirty" class="auto-save-tip unsaved">
            <el-icon><Warning /></el-icon>
            <span>有未保存的修改</span>
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
/**
 * @file ArticleEdit.vue
 * @description 文章编辑/新增页面（管理端）
 * 作用：提供标题、摘要、Markdown 正文、分类与标签的编辑表单，
 *       支持保存、保存并发布、存为草稿三种操作。编辑模式下加载已有文章详情。
 * 依赖 API：getAdminArticleDetail / addArticle / updateArticle / getCategories / getTags
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Check, Promotion, Document, Clock, Warning } from '@element-plus/icons-vue';
import TipTapEditor from '@/components/TipTapEditor.vue';
import { getAdminArticleDetail, addArticle, updateArticle } from '@/api/articles';
import { getCategories } from '@/api/categories';
import { getTags } from '@/api/tags';

const route = useRoute();
const router = useRouter();

/** 表单引用 */
const formRef = ref(null);

/** 编辑器组件引用（用于清除草稿） */
const editorRef = ref(null);

/** 是否为新建模式（无路由 id 参数） */
const isNew = computed(() => !route.params.id);

/** 文章详情（编辑模式下缓存原始数据） */
const article = ref(null);

/** 保存中状态 */
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

/** 自动保存相关状态 */
const DRAFT_STORAGE_KEY = 'article_edit_draft';
const DRAFT_DB_NAME = 'blog_drafts';
const DRAFT_STORE_NAME = 'articles';
const autoSaveTimer = ref(null);
const lastSavedAt = ref(null);
const isDirty = ref(false);

/**
 * 草稿存储键（按文章ID区分）
 * @returns {string} localStorage key
 */
const draftKey = computed(() => {
  const id = route.params.id || 'new';
  return `${DRAFT_STORAGE_KEY}_${id}`;
});

/**
 * 确保 IndexedDB 已初始化（首次调用时创建）
 * @returns {Promise<IDBDatabase>} IndexedDB 数据库实例
 */
function getDraftDB() {
  return new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(DRAFT_DB_NAME, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(DRAFT_STORE_NAME)) {
          db.createObjectStore(DRAFT_STORE_NAME, { keyPath: 'key' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * 将草稿保存到 IndexedDB（大容量存储，解决 localStorage 5MB 限制）
 * @param {string} key - 草稿键
 * @param {Object} data - 草稿数据
 */
async function saveDraftToIndexedDB(key, data) {
  try {
    const db = await getDraftDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DRAFT_STORE_NAME, 'readwrite');
      const store = tx.objectStore(DRAFT_STORE_NAME);
      store.put({ key, value: data, updatedAt: new Date().toISOString() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('[Draft] IndexedDB 保存失败：', e);
    throw e;
  }
}

/**
 * 从 IndexedDB 读取草稿
 * @param {string} key - 草稿键
 * @returns {Promise<Object|null>} 草稿数据
 */
async function loadDraftFromIndexedDB(key) {
  try {
    const db = await getDraftDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DRAFT_STORE_NAME, 'readonly');
      const store = tx.objectStore(DRAFT_STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ? req.result.value : null);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('[Draft] IndexedDB 读取失败：', e);
    return null;
  }
}

/**
 * 从 IndexedDB 删除草稿
 * @param {string} key - 草稿键
 */
async function deleteDraftFromIndexedDB(key) {
  try {
    const db = await getDraftDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DRAFT_STORE_NAME, 'readwrite');
      const store = tx.objectStore(DRAFT_STORE_NAME);
      store.delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('[Draft] IndexedDB 删除失败：', e);
  }
}

/**
 * 保存草稿
 * 存储优先级：localStorage → IndexedDB（大容量降级）
 * 若 localStorage 配额不足（QuotaExceededError），自动降级到 IndexedDB
 */
function saveDraft() {
  const baseDraft = {
    title: form.value.title,
    summary: form.value.summary,
    category_id: form.value.category_id,
    tag_ids: form.value.tag_ids,
    status: form.value.status,
    savedAt: new Date().toISOString()
  };

  const fullDraft = { ...baseDraft, content: form.value.content };
  const draftKeyStr = draftKey.value;

  // 第一步：尝试 localStorage（快速路径，适合小草稿）
  try {
    localStorage.setItem(draftKeyStr, JSON.stringify(fullDraft));
    lastSavedAt.value = baseDraft.savedAt;
    // 同时异步存到 IndexedDB 作为备份
    saveDraftToIndexedDB(draftKeyStr, fullDraft).catch(() => {});
    return;
  } catch (e) {
    // localStorage 配额不足，降级到 IndexedDB
    if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
      console.warn('[Draft] localStorage 配额不足，降级到 IndexedDB');
    } else {
      console.warn('[Draft] localStorage 保存失败：', e);
    }
  }

  // 第二步：尝试 IndexedDB（大容量存储，上限通常 500MB+）
  saveDraftToIndexedDB(draftKeyStr, fullDraft)
    .then(() => {
      lastSavedAt.value = baseDraft.savedAt;
      // IndexedDB 保存成功后，尝试只保存元信息到 localStorage（不占太多空间）
      try {
        localStorage.setItem(draftKeyStr, JSON.stringify(baseDraft));
      } catch (_) {
        // localStorage 还是存不下就算了
      }
    })
    .catch((err) => {
      console.error('[Draft] IndexedDB 也保存失败：', err);
      // 第三步：最后尝试 sessionStorage
      try {
        sessionStorage.setItem(draftKeyStr, JSON.stringify(baseDraft));
        lastSavedAt.value = baseDraft.savedAt;
      } catch (e3) {
        console.error('[Draft] 所有存储方式都失败：', e3);
      }
    });
}

/**
 * 按优先级读取草稿：localStorage → sessionStorage
 * @returns {string|null} 草稿 JSON 字符串，未找到返回 null
 */
/**
 * 按优先级读取草稿：localStorage → IndexedDB → sessionStorage
 * @returns {Promise<string|null>} 草稿 JSON 字符串，未找到返回 null
 */
async function getDraftRaw() {
  // 优先 localStorage（快速读取）
  const local = localStorage.getItem(draftKey.value);
  if (local) return local;

  // 其次 IndexedDB（大容量存储）
  try {
    const idbData = await loadDraftFromIndexedDB(draftKey.value);
    if (idbData) return JSON.stringify(idbData);
  } catch (_) {
    // 忽略 IndexedDB 错误
  }

  // 最后 sessionStorage
  return sessionStorage.getItem(draftKey.value);
}

/**
 * 检测并恢复草稿
 */
/**
 * 检测并恢复草稿（支持 IndexedDB 异步读取）
 */
async function restoreDraft() {
  const saved = await getDraftRaw();
  if (!saved) return;

  try {
    const draft = JSON.parse(saved);
    // 检查是否有实质内容
    if (!draft.title && !draft.content) return;

    ElMessageBox.confirm(
      `检测到未保存的草稿（${new Date(draft.savedAt).toLocaleString('zh-CN')}），是否恢复？`,
      '草稿恢复',
      {
        confirmButtonText: '恢复草稿',
        cancelButtonText: '使用空内容',
        type: 'info'
      }
    )
      .then(() => {
        form.value.title = draft.title;
        form.value.summary = draft.summary;
        form.value.content = draft.content || '';
        form.value.category_id = draft.category_id;
        form.value.tag_ids = draft.tag_ids;
        form.value.status = draft.status;
        ElMessage.success('草稿已恢复');
      })
      .catch(() => {
        // 用户选择不恢复，清除草稿
        localStorage.removeItem(draftKey.value);
        sessionStorage.removeItem(draftKey.value);
      });
  } catch (e) {
    console.error('恢复草稿失败:', e);
  }
}

/**
 * 清除草稿（同时清理 localStorage 和 sessionStorage）
 */
/**
 * 清除当前文章的草稿
 */
async function clearDraft() {
  localStorage.removeItem(draftKey.value);
  sessionStorage.removeItem(draftKey.value);
  try {
    await deleteDraftFromIndexedDB(draftKey.value);
  } catch (_) {
    // 忽略错误
  }
  lastSavedAt.value = null;
  isDirty.value = false;
}

/**
 * 启动自动保存定时器
 */
function startAutoSave() {
  if (autoSaveTimer.value) return;
  autoSaveTimer.value = setInterval(() => {
    if (isDirty.value) {
      saveDraft();
      isDirty.value = false;
    }
  }, 30000); // 每30秒保存一次
}

/**
 * 停止自动保存定时器
 */
function stopAutoSave() {
  if (autoSaveTimer.value) {
    clearInterval(autoSaveTimer.value);
    autoSaveTimer.value = null;
  }
}

/**
 * 监听表单变化，标记为已修改
 */
watch(
  () => [
    form.value.title,
    form.value.summary,
    form.value.content,
    form.value.category_id,
    form.value.tag_ids
  ],
  () => {
    isDirty.value = true;
  },
  { deep: true }
);

/**
 * 页面关闭前保存草稿
 */
function handleBeforeUnload(e) {
  if (isDirty.value) {
    saveDraft();
    e.preventDefault();
    e.returnValue = '';
  }
}

/** 表单校验规则 */
const rules = {
  title: [
    { required: true, message: '请输入文章标题', trigger: 'blur' },
    { min: 2, max: 200, message: '标题长度在 2 到 200 个字符', trigger: 'blur' }
  ],
  content: [{ required: true, message: '请输入文章内容', trigger: 'blur' }]
};

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
      // 清除本地草稿
      clearDraft();
      ElMessage.success(isNew.value ? '创建成功' : '更新成功');
      // 新建成功后跳转到编辑页（带新 id），否则返回列表
      if (isNew.value && res.data?.id) {
        // 清除旧的新建草稿
        localStorage.removeItem(`${DRAFT_STORAGE_KEY}_new`);
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

onMounted(() => {
  loadCategories();
  loadTags();
  loadArticle();
  // 启动自动保存
  startAutoSave();
  // 检测并恢复草稿
  restoreDraft();
  // 监听页面关闭
  window.addEventListener('beforeunload', handleBeforeUnload);
});

/**
 * 组件卸载时清理资源
 */
onUnmounted(() => {
  stopAutoSave();
  window.removeEventListener('beforeunload', handleBeforeUnload);
  // 如果有未保存的修改，保存草稿
  if (isDirty.value) {
    saveDraft();
  }
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

/* 自动保存状态提示 */
.auto-save-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  padding: 8px 10px;
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  font-size: 12px;
  color: var(--text-tertiary);
  animation: fadeIn 0.3s ease;
}

.auto-save-tip .el-icon {
  font-size: 14px;
}

.auto-save-tip.unsaved {
  color: #e6a23c;
  background: rgba(230, 162, 60, 0.1);
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
