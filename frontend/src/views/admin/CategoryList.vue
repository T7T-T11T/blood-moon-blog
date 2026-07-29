<template>
  <div class="category-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">分类管理</h2>
        <span class="count">{{ categories.length }} 个分类</span>
      </div>
      <el-button type="primary" @click="openCreateDialog">
        <el-icon><Plus /></el-icon>
        <span>新增分类</span>
      </el-button>
    </div>

    <!-- 分类表格 -->
    <div class="table-container">
      <el-table :data="categories" stripe style="width: 100%">
        <el-table-column label="排序" width="80">
          <template #default="{ row }">
            <el-input-number
              v-model="row.sort_order"
              :min="0"
              size="small"
              @change="handleSortChange(row)"
            />
          </template>
        </el-table-column>

        <el-table-column label="分类名称" width="200">
          <template #default="{ row }">
            <span class="category-name">{{ row.name }}</span>
          </template>
        </el-table-column>

        <el-table-column label="标识" width="200">
          <template #default="{ row }">
            <code class="slug">{{ row.slug }}</code>
          </template>
        </el-table-column>

        <el-table-column label="描述" min-width="250">
          <template #default="{ row }">
            <span class="description">{{ row.description || '-' }}</span>
          </template>
        </el-table-column>

        <el-table-column label="文章数" width="100" align="center">
          <template #default="{ row }">
            <el-tag type="info" effect="plain">{{ row.article_count || 0 }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" text @click="openEditDialog(row)">
              编辑
            </el-button>
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
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';

/** 分类列表 */
const categories = ref([]);

/** 对话框可见性 */
const dialogVisible = ref(false);

/** 是否编辑模式 */
const isEditing = ref(false);

/** 编辑中的分类ID */
const editingId = ref(null);

/** 保存中 */
const saving = ref(false);

/** 表单引用 */
const formRef = ref(null);

/** 表单数据 */
const form = ref({
  name: '',
  slug: '',
  description: '',
  sort_order: 0
});

/** 验证规则 */
const rules = {
  name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }],
  slug: [{ required: true, message: '请输入分类标识', trigger: 'blur' }]
};

/** 加载分类列表 */
async function loadCategories() {
  try {
    const res = await fetch('/api/categories?with_count=true');
    const json = await res.json();
    if (json.code === 200) {
      categories.value = json.data;
    }
  } catch (e) {
    console.error('加载分类失败:', e);
  }
}

/** 打开新增对话框 */
function openCreateDialog() {
  isEditing.value = false;
  editingId.value = null;
  form.value = { name: '', slug: '', description: '', sort_order: 0 };
  dialogVisible.value = true;
}

/** 打开编辑对话框 */
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

/** 保存分类 */
async function handleSave() {
  if (!formRef.value) return;
  try {
    await formRef.value.validate();
  } catch {
    return;
  }

  saving.value = true;
  try {
    const url = isEditing.value ? `/api/categories/${editingId.value}` : '/api/categories';
    const method = isEditing.value ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(form.value)
    });
    const json = await res.json();

    if (json.code === 200) {
      ElMessage.success(isEditing.value ? '更新成功' : '创建成功');
      dialogVisible.value = false;
      loadCategories();
    } else {
      ElMessage.error(json.message || '保存失败');
    }
  } catch (e) {
    console.error('保存分类失败:', e);
    ElMessage.error('保存失败');
  } finally {
    saving.value = false;
  }
}

/** 删除分类 */
async function handleDelete(category) {
  if (category.article_count > 0) {
    ElMessage.warning('该分类下还有文章，无法删除');
    return;
  }

  try {
    await ElMessageBox.confirm(`确定要删除分类"${category.name}"吗？`, '确认删除', {
      type: 'warning'
    });

    const res = await fetch(`/api/categories/${category.id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    const json = await res.json();

    if (json.code === 200) {
      ElMessage.success('删除成功');
      loadCategories();
    }
  } catch (e) {
    // 用户取消删除
  }
}

/** 处理排序变化 */
async function handleSortChange(category) {
  try {
    await fetch(`/api/categories/${category.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        name: category.name,
        slug: category.slug,
        description: category.description,
        sort_order: category.sort_order
      })
    });
  } catch (e) {
    console.error('更新排序失败:', e);
  }
}

onMounted(() => {
  loadCategories();
});
</script>

<style scoped>
.category-page {
  animation: fade-in 0.3s ease;
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.count {
  font-size: 14px;
  color: #64748b;
  background: #f1f5f9;
  padding: 4px 12px;
  border-radius: 16px;
}

.table-container {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.category-name {
  font-weight: 500;
  color: #0f172a;
}

.slug {
  background: #f1f5f9;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 13px;
  color: #475569;
}

.description {
  color: #64748b;
  font-size: 14px;
}
</style>
