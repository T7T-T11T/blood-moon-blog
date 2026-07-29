<template>
  <div class="tag-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">标签管理</h2>
        <span class="count">{{ tags.length }} 个标签</span>
      </div>
      <el-button type="primary" @click="openCreateDialog">
        <el-icon><Plus /></el-icon>
        <span>新增标签</span>
      </el-button>
    </div>

    <!-- 标签列表 -->
    <div class="tags-container">
      <div class="tag-grid">
        <div v-for="tag in tags" :key="tag.id" class="tag-card">
          <div class="tag-info">
            <span class="tag-name">{{ tag.name }}</span>
            <code class="tag-slug">{{ tag.slug }}</code>
          </div>
          <div class="tag-meta">
            <el-tag size="small" type="info" effect="plain">
              {{ tag.article_count || 0 }} 篇文章
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

      <div v-if="tags.length === 0" class="empty-state">
        <el-icon :size="64" color="#94a3b8"><PriceTag /></el-icon>
        <p>暂无标签</p>
      </div>
    </div>

    <!-- 新增/编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="isEditing ? '编辑标签' : '新增标签'" width="450px">
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
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Edit, Delete, PriceTag } from '@element-plus/icons-vue';

/** 标签列表 */
const tags = ref([]);

/** 对话框可见性 */
const dialogVisible = ref(false);

/** 是否编辑模式 */
const isEditing = ref(false);

/** 编辑中的标签ID */
const editingId = ref(null);

/** 保存中 */
const saving = ref(false);

/** 表单引用 */
const formRef = ref(null);

/** 表单数据 */
const form = ref({
  name: '',
  slug: ''
});

/** 验证规则 */
const rules = {
  name: [{ required: true, message: '请输入标签名称', trigger: 'blur' }],
  slug: [{ required: true, message: '请输入标签标识', trigger: 'blur' }]
};

/** 加载标签列表 */
async function loadTags() {
  try {
    const res = await fetch('/api/tags?with_count=true');
    const json = await res.json();
    if (json.code === 200) {
      tags.value = json.data;
    }
  } catch (e) {
    console.error('加载标签失败:', e);
  }
}

/** 打开新增对话框 */
function openCreateDialog() {
  isEditing.value = false;
  editingId.value = null;
  form.value = { name: '', slug: '' };
  dialogVisible.value = true;
}

/** 打开编辑对话框 */
function openEditDialog(tag) {
  isEditing.value = true;
  editingId.value = tag.id;
  form.value = { name: tag.name, slug: tag.slug };
  dialogVisible.value = true;
}

/** 保存标签 */
async function handleSave() {
  if (!formRef.value) return;
  try {
    await formRef.value.validate();
  } catch {
    return;
  }

  saving.value = true;
  try {
    const url = isEditing.value ? `/api/tags/${editingId.value}` : '/api/tags';
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
      loadTags();
    } else {
      ElMessage.error(json.message || '保存失败');
    }
  } catch (e) {
    console.error('保存标签失败:', e);
    ElMessage.error('保存失败');
  } finally {
    saving.value = false;
  }
}

/** 删除标签 */
async function handleDelete(tag) {
  try {
    await ElMessageBox.confirm(`确定要删除标签"${tag.name}"吗？`, '确认删除', { type: 'warning' });

    const res = await fetch(`/api/tags/${tag.id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    const json = await res.json();

    if (json.code === 200) {
      ElMessage.success('删除成功');
      loadTags();
    }
  } catch (e) {
    // 用户取消删除
  }
}

onMounted(() => {
  loadTags();
});
</script>

<style scoped>
.tag-page {
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

.tags-container {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.tag-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.tag-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: linear-gradient(135deg, rgba(13, 148, 136, 0.05), rgba(8, 145, 178, 0.02));
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
}

.tag-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  border-color: #0d9488;
}

.tag-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tag-name {
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
}

.tag-slug {
  font-size: 12px;
  color: #64748b;
  background: rgba(13, 148, 136, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  width: fit-content;
}

.tag-meta {
  margin: 0 16px;
}

.tag-actions {
  display: flex;
  gap: 4px;
}

.empty-state {
  text-align: center;
  padding: 48px 0;
  color: #64748b;
}
</style>
