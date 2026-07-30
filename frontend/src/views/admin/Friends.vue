<template>
  <div class="friends-page animate-fade-in-up">
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">友链管理</h2>
        <span class="count-badge">{{ friends.length }} 个友链</span>
      </div>
      <el-button type="primary" @click="openCreateDialog">
        <el-icon><Plus /></el-icon>
        <span>新增友链</span>
      </el-button>
    </div>

    <div v-loading="loading" class="table-container">
      <el-table :data="friends" stripe style="width: 100%">
        <el-table-column label="名称" min-width="200">
          <template #default="{ row }">
            <div class="friend-name-cell">
              <el-avatar v-if="row.avatar" :src="row.avatar" :size="34" />
              <el-avatar v-else :size="34">{{ row.name?.charAt(0) || '?' }}</el-avatar>
              <span class="friend-name">{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="URL" min-width="220">
          <template #default="{ row }">
            <a
              :href="row.url"
              target="_blank"
              rel="noopener noreferrer"
              class="friend-url"
              :title="row.url"
            >
              {{ row.url }}
            </a>
          </template>
        </el-table-column>

        <el-table-column label="描述" min-width="180">
          <template #default="{ row }">
            <span class="friend-desc">{{ row.description || '-' }}</span>
          </template>
        </el-table-column>

        <el-table-column label="排序" width="80" align="center">
          <template #default="{ row }">
            <span class="sort-text">{{ row.sort_order ?? 0 }}</span>
          </template>
        </el-table-column>

        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" effect="light">{{ row.status }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" text @click="openEditDialog(row)"
              >编辑</el-button
            >
            <el-button type="danger" size="small" text @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="!loading && friends.length === 0" class="empty-state">
        <el-icon :size="56" color="var(--text-tertiary)"><Link /></el-icon>
        <p class="empty-text">暂无友链</p>
        <el-button type="primary" @click="openCreateDialog">立即添加</el-button>
      </div>
    </div>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEditing ? '编辑友链' : '新增友链'"
      width="520px"
      append-to-body
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="网站名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入网站名称" />
        </el-form-item>
        <el-form-item label="网站URL" prop="url">
          <el-input v-model="form.url" placeholder="https://example.com" />
        </el-form-item>
        <el-form-item label="头像URL">
          <el-input v-model="form.avatar" placeholder="网站头像地址（可选）" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="2"
            placeholder="网站简介（可选）"
          />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort_order" :min="0" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="form.status" placeholder="请选择状态">
            <el-option label="待审核" value="待审核" />
            <el-option label="已通过" value="已通过" />
            <el-option label="已拒绝" value="已拒绝" />
          </el-select>
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
import { Plus, Link } from '@element-plus/icons-vue';
import { getAllFriends, createFriend, updateFriend, deleteFriend } from '@/api/friends';

const friends = ref([]);
const loading = ref(false);
const dialogVisible = ref(false);
const isEditing = ref(false);
const editingId = ref(null);
const saving = ref(false);
const formRef = ref(null);

function createEmptyForm() {
  return {
    name: '',
    url: '',
    description: '',
    avatar: '',
    sort_order: 0,
    status: '已通过'
  };
}

const form = ref(createEmptyForm());

const rules = {
  name: [{ required: true, message: '请输入网站名称', trigger: 'blur' }],
  url: [
    { required: true, message: '请输入网站URL', trigger: 'blur' },
    { pattern: /^https?:\/\//, message: 'URL 需以 http:// 或 https:// 开头', trigger: 'blur' }
  ],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }]
};

function getStatusTagType(status) {
  if (status === '已通过') return 'success';
  if (status === '已拒绝') return 'danger';
  if (status === '待审核') return 'warning';
  return 'info';
}

async function loadFriends() {
  loading.value = true;
  try {
    const res = await getAllFriends();
    if (res.code === 200) {
      friends.value = Array.isArray(res.data) ? res.data : [];
    }
  } catch (e) {
    console.error('加载友链列表失败:', e);
  } finally {
    loading.value = false;
  }
}

function openCreateDialog() {
  isEditing.value = false;
  editingId.value = null;
  form.value = createEmptyForm();
  dialogVisible.value = true;
}

function openEditDialog(friend) {
  isEditing.value = true;
  editingId.value = friend.id;
  form.value = {
    name: friend.name || '',
    url: friend.url || '',
    description: friend.description || '',
    avatar: friend.avatar || '',
    sort_order: friend.sort_order ?? 0,
    status: friend.status || '已通过'
  };
  dialogVisible.value = true;
}

async function handleSave() {
  if (!formRef.value) return;
  try {
    await formRef.value.validate();
  } catch {
    return;
  }

  saving.value = true;
  try {
    if (isEditing.value) {
      await updateFriend(editingId.value, form.value);
      ElMessage.success('更新成功');
    } else {
      await createFriend(form.value);
      ElMessage.success('创建成功');
    }
    dialogVisible.value = false;
    loadFriends();
  } catch (e) {
    console.error('保存友链失败:', e);
  } finally {
    saving.value = false;
  }
}

async function handleDelete(friend) {
  try {
    await ElMessageBox.confirm(`确定要删除友链"${friend.name}"吗？`, '确认删除', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning'
    });
    await deleteFriend(friend.id);
    ElMessage.success('删除成功');
    loadFriends();
  } catch (e) {
    if (e !== 'cancel') {
      console.error('删除友链失败:', e);
    }
  }
}

onMounted(() => {
  loadFriends();
});
</script>

<style scoped>
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

.table-container {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 16px;
  box-shadow: var(--shadow-sm);
}

.friend-name-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.friend-name {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 14px;
}

.friend-url {
  color: var(--primary);
  text-decoration: none;
  font-size: 13px;
  word-break: break-all;
  transition: color 0.2s var(--ease-out);
}

.friend-url:hover {
  color: var(--primary-dark);
  text-decoration: underline;
}

.friend-desc {
  color: var(--text-secondary);
  font-size: 13px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.sort-text {
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 500;
}

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
