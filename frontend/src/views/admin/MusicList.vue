<template>
  <div class="music-list-page animate-fade-in-up">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">音乐管理</h2>
        <span class="count-badge">共 {{ total }} 首音乐</span>
      </div>
      <el-button type="primary" @click="openUploadDialog">
        <el-icon><Upload /></el-icon>
        <span>上传音乐</span>
      </el-button>
    </div>

    <!-- 音乐列表 -->
    <div v-loading="loading" class="table-container">
      <el-table :data="musicList" stripe style="width: 100%">
        <!-- ID 列 -->
        <el-table-column prop="id" label="ID" width="60" />

        <!-- 信息列 -->
        <el-table-column label="音乐信息" min-width="280">
          <template #default="{ row }">
            <div class="music-info">
              <div class="music-icon">
                <el-icon :size="22"><Headset /></el-icon>
              </div>
              <div class="music-detail">
                <div class="music-title">{{ row.title }}</div>
                <div class="music-artist">{{ row.artist || '未知艺术家' }}</div>
              </div>
            </div>
          </template>
        </el-table-column>

        <!-- 状态列 -->
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-switch
              v-model="row.is_active"
              :active-value="1"
              :inactive-value="0"
              @change="toggleActive(row)"
            />
          </template>
        </el-table-column>

        <!-- 排序列 -->
        <el-table-column label="排序" width="100">
          <template #default="{ row }">
            <el-input-number
              v-model="row.sort_order"
              :min="0"
              :max="9999"
              size="small"
              @change="updateSort(row)"
            />
          </template>
        </el-table-column>

        <!-- 操作列 -->
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="editMusic(row)"> 编辑 </el-button>
            <el-button type="danger" link size="small" @click="deleteMusicItem(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div v-if="pagination.total_pages > 1" class="pagination-wrap">
        <el-pagination
          v-model:current-page="pagination.page"
          :page-size="pagination.page_size"
          :total="pagination.total"
          layout="prev, pager, next"
          background
          @current-change="fetchList"
        />
      </div>
    </div>

    <!-- 上传对话框 -->
    <el-dialog
      v-model="uploadDialogVisible"
      title="上传音乐"
      width="480px"
      :close-on-click-modal="false"
      class="music-upload-dialog"
      align-center
    >
      <el-form ref="uploadFormRef" :model="uploadForm" :rules="uploadRules" label-width="80px">
        <el-form-item label="音乐文件" prop="file">
          <div class="file-picker-wrapper">
            <input
              ref="fileInputRef"
              type="file"
              accept="audio/*"
              style="display: none"
              @change="handleFileChange"
            />
            <el-button
              type="primary"
              plain
              class="file-picker-btn"
              @click="$refs.fileInputRef.click()"
            >
              <el-icon><FolderOpened /></el-icon>
              <span>{{ uploadForm.fileName || '选择音频文件' }}</span>
            </el-button>
            <div class="file-hint">支持 MP3/WAV/OGG/AAC 格式，最大50MB</div>
          </div>
        </el-form-item>
        <el-form-item label="标题">
          <el-input v-model="uploadForm.title" placeholder="留空则使用文件名" />
        </el-form-item>
        <el-form-item label="艺术家">
          <el-input v-model="uploadForm.artist" placeholder="艺术家名称" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="uploadForm.sort_order" :min="0" :max="9999" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="uploadDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="uploading" @click="submitUpload">
            <el-icon><Upload /></el-icon>
            <span>{{ uploading ? '上传中...' : '确认上传' }}</span>
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 编辑对话框 -->
    <el-dialog v-model="editDialogVisible" title="编辑音乐" width="420px">
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="标题">
          <el-input v-model="editForm.title" />
        </el-form-item>
        <el-form-item label="艺术家">
          <el-input v-model="editForm.artist" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="editForm.sort_order" :min="0" :max="9999" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitEdit"> 保存 </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
/**
 * 音乐管理页面
 * 作用：后台管理音乐列表，支持上传、编辑、删除、启用/停用
 */
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Upload, Headset, FolderOpened } from '@element-plus/icons-vue';
import { getAllMusic, uploadMusic, updateMusic, deleteMusic } from '../../api/music';

/** 音乐列表数据 */
const musicList = ref([]);

/** 加载状态 */
const loading = ref(false);

/** 上传中状态 */
const uploading = ref(false);

/** 保存中状态 */
const saving = ref(false);

/** 分页信息 */
const pagination = reactive({
  page: 1,
  page_size: 20,
  total: 0,
  total_pages: 0
});

/** 总音乐数（用于徽章） */
const total = ref(0);

/** 上传对话框可见性 */
const uploadDialogVisible = ref(false);

/** 编辑对话框可见性 */
const editDialogVisible = ref(false);

/** 上传表单数据 */
const uploadForm = reactive({
  file: null,
  fileName: '',
  title: '',
  artist: '',
  sort_order: 0
});

/** 上传表单校验规则 */
const uploadRules = {
  file: [{ required: true, message: '请选择音频文件', trigger: 'change' }]
};

/** 上传表单引用 */
const uploadFormRef = ref(null);

/** 文件输入引用 */
const fileInputRef = ref(null);

/** 编辑表单数据 */
const editForm = reactive({
  id: null,
  title: '',
  artist: '',
  sort_order: 0
});

/**
 * 获取音乐列表
 */
async function fetchList() {
  loading.value = true;
  try {
    const res = await getAllMusic({
      page: pagination.page,
      page_size: pagination.page_size
    });
    if (res.code === 200) {
      musicList.value = res.data.list;
      pagination.total = res.data.pagination.total;
      pagination.total_pages = res.data.pagination.total_pages;
      total.value = res.data.pagination.total;
    }
  } catch (e) {
    console.error('获取音乐列表失败：', e);
    ElMessage.error('获取音乐列表失败');
  } finally {
    loading.value = false;
  }
}

/**
 * 打开上传对话框
 */
function openUploadDialog() {
  Object.assign(uploadForm, {
    file: null,
    fileName: '',
    title: '',
    artist: '',
    sort_order: 0
  });
  uploadDialogVisible.value = true;
}

/**
 * 处理文件选择
 * @param {Event} e - 文件选择事件
 */
function handleFileChange(e) {
  const file = e.target.files[0];
  if (file) {
    uploadForm.file = file;
    uploadForm.fileName = file.name;
    // 自动用文件名填充标题
    if (!uploadForm.title) {
      uploadForm.title = file.name.replace(/\.[^.]+$/, '');
    }
  }
}

/**
 * 提交上传
 */
async function submitUpload() {
  // 表单校验
  if (uploadFormRef.value) {
    const valid = await uploadFormRef.value.validate().catch(() => false);
    if (!valid) return;
  }

  if (!uploadForm.file) {
    ElMessage.warning('请选择音频文件');
    return;
  }

  uploading.value = true;
  try {
    // 构建 FormData
    const formData = new FormData();
    formData.append('file', uploadForm.file);
    formData.append('title', uploadForm.title || uploadForm.fileName.replace(/\.[^.]+$/, ''));
    formData.append('artist', uploadForm.artist || '未知艺术家');
    formData.append('sort_order', String(uploadForm.sort_order));

    const res = await uploadMusic(formData);
    if (res.code === 200) {
      ElMessage.success('上传成功');
      uploadDialogVisible.value = false;
      fetchList();
    } else {
      ElMessage.error(res.message || '上传失败');
    }
  } catch (e) {
    console.error('上传失败：', e);
    ElMessage.error('上传失败');
  } finally {
    uploading.value = false;
  }
}

/**
 * 编辑音乐
 * @param {Object} row - 音乐行数据
 */
function editMusic(row) {
  editForm.id = row.id;
  editForm.title = row.title;
  editForm.artist = row.artist || '';
  editForm.sort_order = row.sort_order;
  editDialogVisible.value = true;
}

/**
 * 提交编辑
 */
async function submitEdit() {
  saving.value = true;
  try {
    const res = await updateMusic(editForm.id, {
      title: editForm.title,
      artist: editForm.artist,
      sort_order: editForm.sort_order
    });
    if (res.code === 200) {
      ElMessage.success('更新成功');
      editDialogVisible.value = false;
      fetchList();
    } else {
      ElMessage.error(res.message || '更新失败');
    }
  } catch (e) {
    console.error('更新失败：', e);
    ElMessage.error('更新失败');
  } finally {
    saving.value = false;
  }
}

/**
 * 切换启用/停用状态
 * @param {Object} row - 音乐行数据
 */
async function toggleActive(row) {
  try {
    const res = await updateMusic(row.id, { is_active: row.is_active });
    if (res.code === 200) {
      ElMessage.success(row.is_active ? '已启用' : '已停用');
    } else {
      row.is_active = row.is_active === 1 ? 0 : 1; // 回滚
      ElMessage.error(res.message || '操作失败');
    }
  } catch (e) {
    console.error('状态切换失败：', e);
    row.is_active = row.is_active === 1 ? 0 : 1; // 回滚
    ElMessage.error('操作失败');
  }
}

/**
 * 更新排序
 * @param {Object} row - 音乐行数据
 */
async function updateSort(row) {
  try {
    const res = await updateMusic(row.id, { sort_order: row.sort_order });
    if (res.code !== 200) {
      ElMessage.error(res.message || '排序更新失败');
    }
  } catch (e) {
    console.error('排序更新失败：', e);
    ElMessage.error('排序更新失败');
  }
}

/**
 * 删除音乐
 * @param {Object} row - 音乐行数据
 */
async function deleteMusicItem(row) {
  try {
    await ElMessageBox.confirm(`确定删除音乐「${row.title}」吗？此操作不可恢复。`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    });
    const res = await deleteMusic(row.id);
    if (res.code === 200) {
      ElMessage.success('删除成功');
      fetchList();
    } else {
      ElMessage.error(res.message || '删除失败');
    }
  } catch (e) {
    if (e !== 'cancel') {
      console.error('删除失败：', e);
      ElMessage.error('删除失败');
    }
  }
}

onMounted(fetchList);
</script>

<style scoped>
/* 页面容器 */
.music-list-page {
  padding: 24px;
}

/* 页面头部 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 20px 24px;
  background: rgba(15, 20, 35, 0.6);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-title {
  font-size: 22px;
  font-weight: 600;
  color: #fff;
  margin: 0;
}

.count-badge {
  padding: 4px 12px;
  background: rgba(220, 38, 38, 0.15);
  color: #fca5a5;
  border-radius: 14px;
  font-size: 13px;
  font-weight: 500;
}

/* 表格容器 */
.table-container {
  background: rgba(15, 20, 35, 0.6);
  border-radius: 12px;
  padding: 24px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

/* 音乐信息单元格 */
.music-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.music-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, rgba(220, 38, 38, 0.2), rgba(239, 68, 68, 0.1));
  color: #fca5a5;
  border-radius: 8px;
}

.music-detail {
  display: flex;
  flex-direction: column;
}

.music-title {
  font-size: 14px;
  font-weight: 500;
  color: #fff;
}

.music-artist {
  font-size: 12px;
  color: #94a3b8;
}

/* 文件提示 */
.file-hint {
  font-size: 12px;
  color: #64748b;
  margin-top: 4px;
}

/* 分页 */
.pagination-wrap {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}

/* 暗色适配 */
:deep(.el-table) {
  background: transparent;
  --el-table-bg-color: transparent;
  --el-table-tr-bg-color: transparent;
  --el-table-header-bg-color: rgba(255, 255, 255, 0.03);
  --el-table-row-hover-bg-color: rgba(255, 255, 255, 0.04);
  --el-table-border-color: rgba(255, 255, 255, 0.06);
  --el-table-header-text-color: #cbd5e1;
  --el-table-text-color: #e2e8f0;
  --el-table-header-text-color: #cbd5e1;
}

:deep(.el-table th.el-table__cell) {
  background: rgba(255, 255, 255, 0.03);
  color: #cbd5e1;
}

:deep(.el-table td.el-table__cell) {
  background: transparent;
}

/* ========== 上传对话框样式 ========== */
:deep(.music-upload-dialog) {
  /* 确保对话框不超出视口高度 */
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

:deep(.music-upload-dialog .el-dialog__body) {
  /* 表单区域可滚动 */
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

:deep(.music-upload-dialog .el-dialog__footer) {
  /* 底部按钮始终可见 */
  flex-shrink: 0;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  margin-top: 0;
}

/* 文件选择器包装 */
.file-picker-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.file-picker-btn {
  width: 100%;
  justify-content: flex-start;
}

/* 对话框底部按钮区 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  width: 100%;
}
</style>
