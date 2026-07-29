<template>
  <div class="tag-page animate-fade-in-up">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">标签管理</h2>
        <span class="count-badge">{{ tags.length }} 个标签</span>
      </div>
      <el-button type="primary" @click="openCreateDialog">
        <el-icon><Plus /></el-icon>
        <span>新增标签</span>
      </el-button>
    </div>

    <!-- 标签卡片网格 -->
    <div v-loading="loading" class="tags-container">
      <div class="tag-grid">
        <div
          v-for="(tag, index) in tags"
          :key="tag.id"
          class="tag-card animate-fade-in-up"
          :class="'delay-' + Math.min(index + 1, 5) * 100"
        >
          <div class="tag-info">
            <span class="tag-name">{{ tag.name }}</span>
            <code class="tag-slug">{{ tag.slug }}</code>
          </div>
          <div class="tag-meta">
            <el-tag size="small" type="info" effect="plain">
              {{ tag.article_count || 0 }} 篇
            </el-tag>
          </div>
          <div class="tag-actions">
            <el-button size="small" text @click="openEditDialog(tag)">
              <el-icon><Edit /></el-icon>
            </el-button>
            <el-button size="small" text type="danger" @click="handleDelete(tag)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="!loading && tags.length === 0" class="empty-state">
        <el-icon :size="56" color="var(--text-tertiary)"><PriceTag /></el-icon>
        <p class="empty-text">暂无标签</p>
        <el-button type="primary" @click="openCreateDialog">立即创建</el-button>
      </div>
    </div>

    <!-- 新增/编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="isEditing ? '编辑标签' : '新增标签'" width="450px" append-to-body>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入标签名称" />
        </el-form-item>
        <el-form-item label="标识" prop="slug">
          <el-input v-model="form.slug" placeholder="请输入标签标识（英文）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
/**
 * @file TagList.vue
 * @description 标签管理页面（管理端）
 * 作用：以卡片网格展示标签，支持新增、编辑、删除操作。
 * 依赖 API：getTags / addTag / updateTag / deleteTag
 */
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Edit, Delete, PriceTag } from '@element-plus/icons-vue';
import { getTags, addTag, updateTag, deleteTag } from '@/api/tags';

/** 标签列表数据 */
const tags = ref([]);

/** 加载状态 */
const loading = ref(false);

/** 对话框可见性 */
const dialogVisible = ref(false);

/** 是否为编辑模式 */
const isEditing = ref(false);

/** 编辑中的标签ID */
const editingId = ref(null);

/** 保存中状态 */
const saving = ref(false);

/** 表单引用 */
const formRef = ref(null);

/** 表单数据 */
const form = ref({ name: '', slug: '' });

/** 表单校验规则 */
const rules = {
  name: [{ required: true, message: '请输入标签名称', trigger: 'blur' }],
  slug: [{ required: true, message: '请输入标签标识', trigger: 'blur' }]
};

/** 加载标签列表 */
async function loadTags() {
  loading.value = true;
  try {
    const res = await getTags();
    if (res.code === 200) {
      tags.value = res.data || [];
    }
  } catch (e) {
    console.error('加载标签失败:', e);
  } finally {
    loading.value = false;
  }
}

/** 打开新增对话框，重置表单 */
function openCreateDialog() {
  isEditing.value = false;
  editingId.value = null;
  form.value = { name: '', slug: '' };
  dialogVisible.value = true;
}

/**
 * 打开编辑对话框，回填当前行数据
 * @param {Object} tag - 当前行标签数据
 */
function openEditDialog(tag) {
  isEditing.value = true;
  editingId.value = tag.id;
  form.value = { name: tag.name, slug: tag.slug };
  dialogVisible.value = true;
}

/** 保存标签（新增或更新） */
async function handleSave() {
  if (!formRef.value) return;
  // 先做表单校验
  try {
    await formRef.value.validate();
  } catch {
    return;
  }

  saving.value = true;
  try {
    if (isEditing.value) {
      await updateTag(editingId.value, form.value);
      ElMessage.success('更新成功');
    } else {
      await addTag(form.value);
      ElMessage.success('创建成功');
    }
    dialogVisible.value = false;
    loadTags();
  } catch (e) {
    console.error('保存标签失败:', e);
  } finally {
    saving.value = false;
  }
}

/**
 * 删除标签（带二次确认）
 * @param {Object} tag - 当前行标签数据
 */
async function handleDelete(tag) {
  try {
    await ElMessageBox.confirm(`确定要删除标签"${tag.name}"吗？`, '确认删除', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning'
    });

    await deleteTag(tag.id);
    ElMessage.success('删除成功');
    loadTags();
  } catch (e) {
    // 用户取消删除时进入此分支，无需处理
    if (e !== 'cancel') {
      console.error('删除标签失败:', e);
    }
  }
}

onMounted(() => {
  loadTags();
});
</script>

<style scoped>
/* ========== 页面头部 ========== */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.count-badge {
  font-size: 13px;
  color: var(--text-secondary);
  background: var(--bg-hover);
  padding: 4px 12px;
  border-radius: 16px;
}

/* ========== 标签容器 ========== */
.tags-container {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 24px;
  box-shadow: var(--shadow-sm);
  min-height: 200px;
}

.tag-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

/* 标签卡片（卡片即交互单元） */
.tag-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: var(--bg-body);
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  transition: all 0.25s var(--ease-out);
}

.tag-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-md);
  border-color: var(--primary);
}

.tag-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.tag-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.tag-slug {
  font-size: 12px;
  color: var(--primary-dark);
  background: var(--primary-bg);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  width: fit-content;
}

.tag-meta {
  margin: 0 12px;
  flex-shrink: 0;
}

.tag-actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}

/* ========== 空状态 ========== */
.empty-state {
  text-align: center;
  padding: 64px 0;
}

.empty-text {
  font-size: 15px;
  color: var(--text-secondary);
  margin: 12px 0 20px;
}
</style>
