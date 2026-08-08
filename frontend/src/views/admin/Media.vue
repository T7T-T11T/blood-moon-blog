/** * Media.vue - 媒体库管理页面 * 展示 uploads 目录中的文件列表，支持预览、复制链接、删除 */
<template>
  <div class="media-page">
    <div class="page-header">
      <h2>媒体库</h2>
      <div class="header-actions">
        <el-select
          v-model="filterDir"
          placeholder="全部类型"
          clearable
          style="width: 140px"
          @change="loadFiles"
        >
          <el-option label="全部" value="" />
          <el-option label="图片" value="image" />
          <el-option label="视频" value="video" />
          <el-option label="音频" value="audio" />
          <el-option label="文件" value="file" />
        </el-select>
        <span class="total-count">共 {{ total }} 个文件</span>
      </div>
    </div>

    <!-- 媒体网格 -->
    <div v-loading="loading" class="media-grid">
      <div v-for="file in files" :key="file.name" class="media-item">
        <!-- 图片预览 -->
        <div v-if="file.type === 'image'" class="media-preview" @click="previewImage(file)">
          <img :src="file.url" :alt="file.name" loading="lazy" />
        </div>
        <!-- 视频预览 -->
        <div v-else-if="file.type === 'video'" class="media-preview video-preview">
          <video :src="file.url" controls preload="metadata" />
        </div>
        <!-- 其他文件图标 -->
        <div v-else class="media-preview file-preview">
          <el-icon :size="40"><Document /></el-icon>
        </div>

        <div class="media-info">
          <span class="media-name" :title="file.name">{{ file.name }}</span>
          <span class="media-size">{{ formatSize(file.size) }}</span>
        </div>

        <div class="media-actions">
          <el-button size="small" text @click="copyUrl(file.url)">复制链接</el-button>
          <el-button size="small" text type="danger" @click="confirmDelete(file)">删除</el-button>
        </div>
      </div>

      <div v-if="!loading && files.length === 0" class="empty-state">
        <el-icon :size="48"><FolderOpened /></el-icon>
        <p>暂无文件</p>
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="total > pageSize" class="pagination-wrapper">
      <el-pagination
        v-model:current-page="currentPage"
        :page-size="pageSize"
        :total="total"
        layout="prev, pager, next"
        @current-change="loadFiles"
      />
    </div>

    <!-- 图片预览弹窗 -->
    <el-dialog v-model="previewVisible" title="图片预览" width="80%" destroy-on-close>
      <div class="preview-container">
        <img :src="previewUrl" :alt="previewName" style="max-width: 100%; max-height: 70vh" />
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { Document, FolderOpened } from '@element-plus/icons-vue';
import { getUploadList, deleteUploadFile } from '../../api/upload';

const files = ref([]);
const total = ref(0);
const loading = ref(false);
const currentPage = ref(1);
const pageSize = ref(30);
const filterDir = ref('');

const previewVisible = ref(false);
const previewUrl = ref('');
const previewName = ref('');

async function loadFiles() {
  loading.value = true;
  try {
    const params = { page: currentPage.value, page_size: pageSize.value };
    if (filterDir.value) params.dir = filterDir.value;
    const { data } = await getUploadList(params);
    files.value = data.list || [];
    total.value = data.total || 0;
  } catch (e) {
    ElMessage.error('加载文件列表失败');
  } finally {
    loading.value = false;
  }
}

function formatSize(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function previewImage(file) {
  previewUrl.value = file.url;
  previewName.value = file.name;
  previewVisible.value = true;
}

async function copyUrl(url) {
  const fullUrl = window.location.origin + url;
  try {
    await navigator.clipboard.writeText(fullUrl);
    ElMessage.success('链接已复制');
  } catch {
    // 降级方案
    const textarea = document.createElement('textarea');
    textarea.value = fullUrl;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    ElMessage.success('链接已复制');
  }
}

async function confirmDelete(file) {
  try {
    await ElMessageBox.confirm(`确定删除「${file.name}」？此操作不可恢复。`, '确认删除', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    });
    await deleteUploadFile(file.name);
    ElMessage.success('已删除');
    loadFiles();
  } catch {
    // 取消
  }
}

onMounted(() => {
  loadFiles();
});
</script>

<style scoped>
.media-page {
  padding: 0;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.page-header h2 {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.total-count {
  font-size: 13px;
  color: var(--text-secondary);
}

.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
  min-height: 200px;
}

.media-item {
  background: var(--bg-card);
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--border);
  transition: box-shadow 0.2s;
}

.media-item:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.media-preview {
  width: 100%;
  height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  overflow: hidden;
  cursor: pointer;
}

.media-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.media-preview video {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.file-preview {
  background: var(--bg-hover);
  color: var(--text-tertiary);
}

.media-info {
  padding: 10px 12px 4px;
}

.media-name {
  display: block;
  font-size: 13px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.media-size {
  font-size: 11px;
  color: var(--text-tertiary);
  display: block;
  margin-top: 2px;
}

.media-actions {
  padding: 0 8px 8px;
  display: flex;
  justify-content: flex-end;
  gap: 4px;
}

.empty-state {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  color: var(--text-tertiary);
}

.empty-state p {
  margin-top: 12px;
  font-size: 14px;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}

.preview-container {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
