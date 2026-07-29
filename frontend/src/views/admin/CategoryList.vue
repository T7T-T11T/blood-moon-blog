<template>
  <div class="category-page animate-fade-in-up">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">分类管理</h2>
        <span class="count-badge">{{ categories.length }} 个分类</span>
      </div>
      <el-button type="primary" @click="openCreateDialog">
        <el-icon><Plus /></el-icon>
        <span>新增分类</span>
      </el-button>
    </div>

    <!-- 分类表格 -->
    <div v-loading="loading" class="table-container">
      <el-table :data="categories" stripe style="width: 100%">
        <!-- 分类名称列 -->
        <el-table-column label="分类名称" min-width="180">
          <template #default="{ row }">
            <span class="category-name">{{ row.name }}</span>
          </template>
        </el-table-column>

        <!-- 标识列 -->
        <el-table-column label="标识" width="200">
          <template #default="{ row }">
            <code class="slug">{{ row.slug }}</code>
          </template>
        </el-table-column>

        <!-- 描述列 -->
        <el-table-column label="描述" min-width="240">
          <template #default="{ row }">
            <span class="description">{{ row.description || '-' }}</span>
          </template>
        </el-table-column>

        <!-- 排序列 -->
        <el-table-column label="排序" width="90" align="center">
          <template #default="{ row }">
            <span class="sort-text">{{ row.sort_order ?? 0 }}</span>
          </template>
        </el-table-column>

        <!-- 文章数列 -->
        <el-table-column label="文章数" width="100" align="center">
          <template #default="{ row }">
            <el-tag type="info" effect="plain">{{ row.article_count || 0 }}</el-tag>
          </template>
        </el-table-column>

        <!-- 操作列 -->
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" text @click="openEditDialog(row)"
              >编辑</el-button
            >
            <el-button
              type="danger"
              size="small"
              text
              :disabled="row.article_count > 0"
              @click="handleDelete(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 空状态 -->
      <div v-if="!loading && categories.length === 0" class="empty-state">
        <el-icon :size="56" color="var(--text-tertiary)"><Folder /></el-icon>
        <p class="empty-text">暂无分类</p>
        <el-button type="primary" @click="openCreateDialog">立即创建</el-button>
      </div>
    </div>

    <!-- 新增/编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="isEditing ? '编辑分类' : '新增分类'" width="500px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入分类名称" />
        </el-form-item>
        <el-form-item label="标识" prop="slug">
          <el-input v-model="form.slug" placeholder="请输入分类标识（英文）" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请输入分类描述（可选）"
          />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort_order" :min="0" />
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
 * @file CategoryList.vue
 * @description 分类管理页面（管理端）
 * 作用：展示分类列表，支持新增、编辑、删除操作，分类下有文章时禁止删除。
 * 依赖 API：getCategories / addCategory / updateCategory / deleteCategory
 */
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Folder } from '@element-plus/icons-vue';
import { getCategories, addCategory, updateCategory, deleteCategory } from '@/api/categories';

/** 分类列表数据 */
const categories = ref([]);

/** 加载状态 */
const loading = ref(false);

/** 对话框可见性 */
const dialogVisible = ref(false);

/** 是否为编辑模式 */
const isEditing = ref(false);

/** 编辑中的分类ID */
const editingId = ref(null);

/** 保存中状态 */
const saving = ref(false);

/** 表单引用 */
const formRef = ref(null);

/** 表单数据 */
const form = ref({ name: '', slug: '', description: '', sort_order: 0 });

/** 表单校验规则 */
const rules = {
  name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }],
  slug: [{ required: true, message: '请输入分类标识', trigger: 'blur' }]
};

/** 加载分类列表 */
async function loadCategories() {
  loading.value = true;
  try {
    const res = await getCategories();
    if (res.code === 200) {
      categories.value = res.data || [];
    }
  } catch (e) {
    console.error('加载分类失败:', e);
  } finally {
    loading.value = false;
  }
}

/** 打开新增对话框，重置表单 */
function openCreateDialog() {
  isEditing.value = false;
  editingId.value = null;
  form.value = { name: '', slug: '', description: '', sort_order: 0 };
  dialogVisible.value = true;
}

/**
 * 打开编辑对话框，回填当前行数据
 * @param {Object} category - 当前行分类数据
 */
function openEditDialog(category) {
  isEditing.value = true;
  editingId.value = category.id;
  form.value = {
    name: category.name,
    slug: category.slug,
    description: category.description || '',
    sort_order: category.sort_order || 0
  };
  dialogVisible.value = true;
}

/** 保存分类（新增或更新） */
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
      await updateCategory(editingId.value, form.value);
      ElMessage.success('更新成功');
    } else {
      await addCategory(form.value);
      ElMessage.success('创建成功');
    }
    dialogVisible.value = false;
    loadCategories();
  } catch (e) {
    console.error('保存分类失败:', e);
  } finally {
    saving.value = false;
  }
}

/**
 * 删除分类（带二次确认，分类下有文章时禁止删除）
 * @param {Object} category - 当前行分类数据
 */
async function handleDelete(category) {
  if (category.article_count > 0) {
    ElMessage.warning('该分类下还有文章，无法删除');
    return;
  }

  try {
    await ElMessageBox.confirm(`确定要删除分类"${category.name}"吗？`, '确认删除', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning'
    });

    await deleteCategory(category.id);
    ElMessage.success('删除成功');
    loadCategories();
  } catch (e) {
    // 用户取消删除时进入此分支，无需处理
    if (e !== 'cancel') {
      console.error('删除分类失败:', e);
    }
  }
}

onMounted(() => {
  loadCategories();
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

/* ========== 表格容器 ========== */
.table-container {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 16px;
  box-shadow: var(--shadow-sm);
}

.category-name {
  font-weight: 600;
  color: var(--text-primary);
}

.slug {
  background: var(--bg-hover);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: var(--text-secondary);
}

.description {
  color: var(--text-secondary);
  font-size: 14px;
}

.sort-text {
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 500;
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
