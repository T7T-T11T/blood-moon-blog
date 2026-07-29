<template>
  <div class="link-list-page animate-fade-in-up">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">友链管理</h2>
        <span class="count-badge">{{ links.length }} 个友链</span>
      </div>
      <el-button type="primary" @click="openCreateDialog">
        <el-icon><Plus /></el-icon>
        <span>新增友链</span>
      </el-button>
    </div>

    <!-- 友链表格 -->
    <div v-loading="loading" class="table-container">
      <el-table :data="links" stripe style="width: 100%">
        <!-- 名称/头像列 -->
        <el-table-column label="名称" min-width="200">
          <template #default="{ row }">
            <div class="link-name-cell">
              <el-avatar v-if="row.avatar_url" :src="row.avatar_url" :size="34" />
              <el-avatar v-else :size="34">{{ row.name?.charAt(0) || '?' }}</el-avatar>
              <div class="name-info">
                <span class="link-name">{{ row.name }}</span>
                <span v-if="row.email" class="link-email">{{ row.email }}</span>
              </div>
            </div>
          </template>
        </el-table-column>

        <!-- URL 列 -->
        <el-table-column label="URL" min-width="220">
          <template #default="{ row }">
            <a
              :href="row.url"
              target="_blank"
              rel="noopener noreferrer"
              class="link-url"
              :title="row.url"
            >
              {{ row.url }}
            </a>
          </template>
        </el-table-column>

        <!-- 描述列 -->
        <el-table-column label="描述" min-width="180">
          <template #default="{ row }">
            <span class="link-desc">{{ row.description || '-' }}</span>
          </template>
        </el-table-column>

        <!-- 分类列 -->
        <el-table-column label="分类" width="120">
          <template #default="{ row }">
            <el-tag type="info" effect="plain">{{ row.category || '友情链接' }}</el-tag>
          </template>
        </el-table-column>

        <!-- 排序列 -->
        <el-table-column label="排序" width="80" align="center">
          <template #default="{ row }">
            <span class="sort-text">{{ row.sort_order ?? 0 }}</span>
          </template>
        </el-table-column>

        <!-- 状态列 -->
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" effect="light">{{ row.status }}</el-tag>
          </template>
        </el-table-column>

        <!-- 操作列 -->
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" text @click="openEditDialog(row)"
              >编辑</el-button
            >
            <el-button type="danger" size="small" text @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 空状态 -->
      <div v-if="!loading && links.length === 0" class="empty-state">
        <el-icon :size="56" color="var(--text-tertiary)"><Link /></el-icon>
        <p class="empty-text">暂无友链</p>
        <el-button type="primary" @click="openCreateDialog">立即添加</el-button>
      </div>
    </div>

    <!-- 新增/编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="isEditing ? '编辑友链' : '新增友链'" width="560px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="网站名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入网站名称" />
        </el-form-item>
        <el-form-item label="网站URL" prop="url">
          <el-input v-model="form.url" placeholder="https://example.com" />
        </el-form-item>
        <el-form-item label="头像URL">
          <el-input v-model="form.avatar_url" placeholder="网站头像地址（可选）" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="2"
            placeholder="网站简介（可选）"
          />
        </el-form-item>
        <el-form-item label="分类">
          <el-input v-model="form.category" placeholder="如：友情链接、技术博客" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="form.email" placeholder="站长邮箱（可选）" />
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
/**
 * @file LinkList.vue
 * @description 友链管理页面（管理端）
 * 作用：展示所有友情链接，支持新增、编辑、删除操作，新增与编辑复用同一对话框表单。
 * 依赖 API：getAllLinks / createLink / updateLink / deleteLink
 */
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Link } from '@element-plus/icons-vue';
import { getAllLinks, createLink, updateLink, deleteLink } from '@/api/links';

/** 友链列表数据 */
const links = ref([]);

/** 加载状态 */
const loading = ref(false);

/** 对话框可见性 */
const dialogVisible = ref(false);

/** 是否为编辑模式 */
const isEditing = ref(false);

/** 编辑中的友链ID */
const editingId = ref(null);

/** 保存中状态 */
const saving = ref(false);

/** 表单引用 */
const formRef = ref(null);

/** 创建空表单初始数据，新增/编辑时复用 */
function createEmptyForm() {
  return {
    name: '',
    url: '',
    description: '',
    avatar_url: '',
    category: '友情链接',
    sort_order: 0,
    status: '已通过',
    email: ''
  };
}

/** 表单数据 */
const form = ref(createEmptyForm());

/** 表单校验规则 */
const rules = {
  name: [{ required: true, message: '请输入网站名称', trigger: 'blur' }],
  url: [
    { required: true, message: '请输入网站URL', trigger: 'blur' },
    { pattern: /^https?:\/\//, message: 'URL 需以 http:// 或 https:// 开头', trigger: 'blur' }
  ],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }]
};

/**
 * 根据友链状态返回对应的 ElTag 类型
 * @param {string} status - 友链状态（待审核/已通过/已拒绝）
 * @returns {string} ElTag 类型
 */
function getStatusTagType(status) {
  if (status === '已通过') return 'success';
  if (status === '已拒绝') return 'danger';
  if (status === '待审核') return 'warning';
  return 'info';
}

/** 加载所有友链列表 */
async function loadLinks() {
  loading.value = true;
  try {
    const res = await getAllLinks();
    if (res.code === 200) {
      links.value = Array.isArray(res.data) ? res.data : [];
    }
  } catch (e) {
    console.error('加载友链列表失败:', e);
  } finally {
    loading.value = false;
  }
}

/** 打开新增对话框，重置表单 */
function openCreateDialog() {
  isEditing.value = false;
  editingId.value = null;
  form.value = createEmptyForm();
  dialogVisible.value = true;
}

/**
 * 打开编辑对话框，回填当前行数据
 * @param {Object} link - 当前行友链数据
 */
function openEditDialog(link) {
  isEditing.value = true;
  editingId.value = link.id;
  // 逐字段回填，避免引用同一对象
  form.value = {
    name: link.name || '',
    url: link.url || '',
    description: link.description || '',
    avatar_url: link.avatar_url || '',
    category: link.category || '友情链接',
    sort_order: link.sort_order ?? 0,
    status: link.status || '已通过',
    email: link.email || ''
  };
  dialogVisible.value = true;
}

/** 保存友链（新增或更新） */
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
      await updateLink(editingId.value, form.value);
      ElMessage.success('更新成功');
    } else {
      await createLink(form.value);
      ElMessage.success('创建成功');
    }
    dialogVisible.value = false;
    loadLinks();
  } catch (e) {
    console.error('保存友链失败:', e);
  } finally {
    saving.value = false;
  }
}

/**
 * 删除友链（带二次确认）
 * @param {Object} link - 当前行友链数据
 */
async function handleDelete(link) {
  try {
    await ElMessageBox.confirm(`确定要删除友链"${link.name}"吗？`, '确认删除', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning'
    });

    await deleteLink(link.id);
    ElMessage.success('删除成功');
    loadLinks();
  } catch (e) {
    // 用户取消删除时进入此分支，无需处理
    if (e !== 'cancel') {
      console.error('删除友链失败:', e);
    }
  }
}

onMounted(() => {
  loadLinks();
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

.link-name-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.name-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.link-name {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 14px;
}

.link-email {
  font-size: 12px;
  color: var(--text-tertiary);
}

.link-url {
  color: var(--primary);
  text-decoration: none;
  font-size: 13px;
  word-break: break-all;
  transition: color 0.2s var(--ease-out);
}

.link-url:hover {
  color: var(--primary-dark);
  text-decoration: underline;
}

.link-desc {
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
