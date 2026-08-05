<template>
  <div class="trash-list-page animate-fade-in-up">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">回收站</h2>
        <span class="count-badge">{{ total }} 篇已删除文章</span>
      </div>
      <div class="header-right">
        <el-button v-if="articles.length > 0" type="danger" plain @click="handleClearAll">
          <el-icon><Delete /></el-icon>
          <span>清空回收站</span>
        </el-button>
      </div>
    </div>

    <!-- 文章表格 -->
    <div v-loading="loading" class="table-container">
      <el-table :data="articles" stripe style="width: 100%">
        <!-- 文章标题列 -->
        <el-table-column label="文章" min-width="280">
          <template #default="{ row }">
            <div class="article-cell">
              <h4 class="article-title">{{ row.title }}</h4>
              <p v-if="row.summary" class="article-summary">{{ row.summary }}</p>
            </div>
          </template>
        </el-table-column>

        <!-- 分类列 -->
        <el-table-column label="分类" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.category_name" type="info" effect="plain">
              {{ row.category_name }}
            </el-tag>
            <span v-else class="no-data">未分类</span>
          </template>
        </el-table-column>

        <!-- 删除时间列 -->
        <el-table-column label="删除时间" width="180">
          <template #default="{ row }">
            <span class="time-text">{{ formatDate(row.deleted_at) }}</span>
          </template>
        </el-table-column>

        <!-- 操作列 -->
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleRestore(row)">
              <el-icon><RefreshLeft /></el-icon>
              <span>恢复</span>
            </el-button>
            <el-button type="danger" link @click="handlePermanentDelete(row)">
              <el-icon><Delete /></el-icon>
              <span>永久删除</span>
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 空状态 -->
      <div v-if="!loading && articles.length === 0" class="empty-state">
        <el-icon :size="64" class="empty-icon"><Delete /></el-icon>
        <p class="empty-title">回收站为空</p>
        <p class="empty-desc">已删除的文章会在此保留30天，过期后自动清理</p>
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="total > pageSize" class="pagination-wrapper">
      <el-pagination
        :current-page="currentPage"
        :page-size="pageSize"
        :total="total"
        layout="prev, pager, next"
        background
        @current-change="handlePageChange"
      />
    </div>
  </div>
</template>

<script setup>
/**
 * @file TrashList.vue
 * @description 回收站页面组件
 * 作用：展示已删除的文章，支持恢复和永久删除操作
 */

import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Delete, RefreshLeft } from '@element-plus/icons-vue';
import {
  getTrashArticles,
  restoreArticle,
  permanentDeleteArticle,
  clearAllTrash
} from '../../api/trash';

/** 文章列表 */
const articles = ref([]);

/** 加载状态 */
const loading = ref(false);

/** 当前页码 */
const currentPage = ref(1);

/** 每页数量 */
const pageSize = 20;

/** 文章总数 */
const total = ref(0);

/**
 * 格式化日期
 * @param {string} dateStr - 日期字符串
 * @returns {string} 格式化后的日期
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/**
 * 加载回收站文章列表
 * @returns {Promise<void>}
 */
async function loadArticles() {
  loading.value = true;
  try {
    const res = await getTrashArticles({
      page: currentPage.value,
      page_size: pageSize
    });
    if (res.code === 200 && res.data) {
      articles.value = res.data.list || [];
      total.value = res.data.pagination?.total || 0;
    }
  } catch (e) {
    console.error('加载回收站失败:', e);
    articles.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

/**
 * 恢复文章
 * @param {Object} row - 文章数据
 */
async function handleRestore(row) {
  try {
    await ElMessageBox.confirm(`确定要恢复文章「${row.title}」吗？`, '恢复确认', {
      confirmButtonText: '恢复',
      cancelButtonText: '取消',
      type: 'info'
    });
    const res = await restoreArticle(row.id);
    if (res.code === 200) {
      ElMessage.success('文章已恢复');
      loadArticles();
    } else {
      ElMessage.error(res.message || '恢复失败');
    }
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('恢复失败');
    }
  }
}

/**
 * 永久删除文章
 * @param {Object} row - 文章数据
 */
async function handlePermanentDelete(row) {
  try {
    await ElMessageBox.confirm(
      `确定要永久删除文章「${row.title}」吗？此操作不可恢复！`,
      '永久删除确认',
      {
        confirmButtonText: '永久删除',
        cancelButtonText: '取消',
        type: 'error'
      }
    );
    const res = await permanentDeleteArticle(row.id);
    if (res.code === 200) {
      ElMessage.success('文章已永久删除');
      loadArticles();
    } else {
      ElMessage.error(res.message || '删除失败');
    }
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('删除失败');
    }
  }
}

/**
 * 清空回收站
 */
async function handleClearAll() {
  try {
    await ElMessageBox.confirm(
      '确定要清空回收站吗？所有已删除的文章将被永久删除，此操作不可恢复！',
      '清空回收站确认',
      {
        confirmButtonText: '清空',
        cancelButtonText: '取消',
        type: 'error'
      }
    );
    const res = await clearAllTrash();
    if (res.code === 200) {
      ElMessage.success(res.message || '回收站已清空');
      loadArticles();
    } else {
      ElMessage.error(res.message || '清空失败');
    }
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('清空失败');
    }
  }
}

/**
 * 分页器页码变化回调
 * @param {number} page - 新页码
 */
function handlePageChange(page) {
  currentPage.value = page;
  loadArticles();
}

onMounted(() => {
  loadArticles();
});
</script>

<style scoped>
/* ========== 页面头部 ========== */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: var(--admin-text);
}

.count-badge {
  padding: 4px 12px;
  font-size: 13px;
  color: var(--admin-text-secondary);
  background: var(--admin-card);
  border-radius: 12px;
}

.header-right {
  display: flex;
  gap: 12px;
}

/* ========== 表格容器 ========== */
.table-container {
  background: var(--admin-card);
  border-radius: 8px;
  overflow: hidden;
}

.article-cell {
  cursor: default;
}

.article-title {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 600;
  color: var(--admin-text);
}

.article-summary {
  margin: 0;
  font-size: 13px;
  color: var(--admin-text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.no-data {
  color: var(--admin-text-tertiary);
}

.time-text {
  color: var(--admin-text-secondary);
  font-variant-numeric: tabular-nums;
}

/* ========== 空状态 ========== */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80px 20px;
}

.empty-icon {
  color: var(--admin-text-tertiary);
  margin-bottom: 16px;
}

.empty-title {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 600;
  color: var(--admin-text-secondary);
}

.empty-desc {
  margin: 0;
  font-size: 14px;
  color: var(--admin-text-tertiary);
}

/* ========== 分页 ========== */
.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}
</style>
