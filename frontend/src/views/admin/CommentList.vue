<template>
  <div class="comment-list-page animate-fade-in-up">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">评论管理</h2>
        <span class="count-badge">共 {{ total }} 条</span>
      </div>
      <div class="header-right">
        <!-- 状态筛选标签 -->
        <div class="filter-tabs">
          <div
            v-for="tab in statusTabs"
            :key="tab.value"
            class="filter-tab"
            :class="{ active: filterStatus === tab.value }"
            @click="filterByStatus(tab.value)"
          >
            {{ tab.label }}
          </div>
        </div>
        <!-- 导出按钮 -->
        <el-button @click="handleExportComments">
          <el-icon><Download /></el-icon>
          <span>导出评论</span>
        </el-button>
      </div>
    </div>

    <!-- 评论表格 -->
    <div v-loading="loading" class="table-container">
      <el-table :data="comments" stripe style="width: 100%">
        <!-- 评论者列 -->
        <el-table-column label="评论者" width="150">
          <template #default="{ row }">
            <div class="nickname-cell">
              <el-avatar v-if="row.avatar_url" :src="row.avatar_url" :size="28" />
              <el-avatar v-else :size="28">{{ row.nickname?.[0] || '?' }}</el-avatar>
              <span class="nickname">{{ row.nickname }}</span>
            </div>
          </template>
        </el-table-column>

        <!-- 评论内容列 -->
        <el-table-column label="评论内容" min-width="220">
          <template #default="{ row }">
            <div class="content-cell" :title="row.content">{{ row.content }}</div>
          </template>
        </el-table-column>

        <!-- 文章标题列 -->
        <el-table-column label="文章" min-width="160">
          <template #default="{ row }">
            <span v-if="row.article_title" class="article-title">{{ row.article_title }}</span>
            <span v-else class="no-data">已删除</span>
          </template>
        </el-table-column>

        <!-- 状态列 -->
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" effect="light">{{ row.status }}</el-tag>
          </template>
        </el-table-column>

        <!-- 时间列 -->
        <el-table-column label="时间" width="160">
          <template #default="{ row }">
            <span class="date-text">{{ formatDate(row.created_at) }}</span>
          </template>
        </el-table-column>

        <!-- 操作列 -->
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <!-- 仅未通过状态显示通过按钮 -->
            <el-button
              v-if="row.status !== '已通过'"
              type="success"
              size="small"
              text
              @click="handleUpdateStatus(row, '已通过')"
            >
              通过
            </el-button>
            <!-- 仅未拒绝状态显示拒绝按钮 -->
            <el-button
              v-if="row.status !== '已拒绝'"
              type="warning"
              size="small"
              text
              @click="handleUpdateStatus(row, '已拒绝')"
            >
              拒绝
            </el-button>
            <el-button type="danger" size="small" text @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 空状态 -->
      <div v-if="!loading && comments.length === 0" class="empty-state">
        <el-icon :size="56" color="var(--text-tertiary)"><ChatDotRound /></el-icon>
        <p class="empty-text">暂无评论</p>
      </div>

      <!-- 分页 -->
      <div v-if="total > 0" class="pagination-wrapper">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="handleSizeChange"
          @current-change="loadComments"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * @file CommentList.vue
 * @description 评论管理页面（管理端）
 * 作用：展示所有评论（含待审核），支持按状态筛选、分页，提供通过、拒绝、删除审核操作。
 * 依赖 API：getCommentList / updateCommentStatus / deleteComment
 */
import { ref, onMounted } from 'vue';
import { ChatDotRound, Download } from '@element-plus/icons-vue';
import { getCommentList, updateCommentStatus, deleteComment } from '@/api/comments';

/** 评论列表数据 */
const comments = ref([]);

/** 加载状态 */
const loading = ref(false);

/** 当前页码 */
const page = ref(1);

/** 每页数量 */
const pageSize = ref(10);

/** 总条数 */
const total = ref(0);

/** 状态筛选值（空字符串表示全部） */
const filterStatus = ref('');

/** 状态筛选标签选项 */
const statusTabs = [
  { label: '全部', value: '' },
  { label: '待审核', value: '待审核' },
  { label: '已通过', value: '已通过' },
  { label: '已拒绝', value: '已拒绝' }
];

/**
 * 根据评论状态返回对应的 ElTag 类型
 * @param {string} status - 评论状态（待审核/已通过/已拒绝）
 * @returns {string} ElTag 类型
 */
function getStatusTagType(status) {
  if (status === '已通过') return 'success';
  if (status === '已拒绝') return 'danger';
  if (status === '待审核') return 'warning';
  return 'info';
}

/**
 * 格式化日期为 yyyy-MM-dd HH:mm
 * @param {string} dateStr - 后端返回的时间字符串
 * @returns {string} 格式化后的本地时间
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

/**
 * 按状态筛选评论
 * @param {string} status - 状态值（空字符串表示全部）
 */
function filterByStatus(status) {
  filterStatus.value = status;
  page.value = 1;
  loadComments();
}

/** 每页数量变化时重置页码 */
function handleSizeChange() {
  page.value = 1;
  loadComments();
}

/**
 * 加载评论列表
 * 根据当前筛选条件与分页参数请求后端数据
 */
async function loadComments() {
  loading.value = true;
  try {
    // 组装查询参数：仅携带非空条件
    const params = { page: page.value, page_size: pageSize.value };
    if (filterStatus.value) params.status = filterStatus.value;

    const res = await getCommentList(params);
    if (res.code === 200) {
      // 兼容数组与分页对象两种返回结构
      if (Array.isArray(res.data)) {
        comments.value = res.data;
        total.value = res.data.length;
      } else {
        comments.value = res.data.list || [];
        total.value = res.data.pagination?.total || res.data.total || 0;
      }
    }
  } catch (e) {
    // 429 限流友好提示，不重复弹窗
    if (e?.response?.status === 429) {
      ElMessage.warning('请求过于频繁，请稍后再试');
    } else {
      console.error('加载评论列表失败:', e);
    }
  } finally {
    loading.value = false;
  }
}

/**
 * 更新评论状态（通过/拒绝）
 * @param {Object} comment - 当前评论对象
 * @param {string} status - 目标状态（已通过/已拒绝）
 */
async function handleUpdateStatus(comment, status) {
  try {
    await updateCommentStatus(comment.id, status);
    ElMessage.success(`已${status === '已通过' ? '通过' : '拒绝'}该评论`);
    loadComments();
  } catch (e) {
    console.error('更新评论状态失败:', e);
  }
}

/**
 * 删除评论（带二次确认）
 * @param {Object} comment - 当前评论对象
 */
async function handleDelete(comment) {
  try {
    await ElMessageBox.confirm('确定要删除该评论吗？此操作不可恢复。', '确认删除', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning'
    });

    await deleteComment(comment.id);
    ElMessage.success('删除成功');
    // 若当前页删除后为空且非第一页，回退一页
    if (comments.value.length === 1 && page.value > 1) {
      page.value -= 1;
    }
    loadComments();
  } catch (e) {
    // 用户取消删除时进入此分支，无需处理
    if (e !== 'cancel') {
      console.error('删除评论失败:', e);
    }
  }
}

/** API 基础路径（开发环境 /api，生产环境为 Workers 完整 URL） */
const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * 导出评论数据
 * 调用后端导出接口，下载 JSON 文件
 */
async function handleExportComments() {
  try {
    loading.value = true;
    const params = {};
    if (filterStatus.value) params.status = filterStatus.value;

    const queryParams = new URLSearchParams(params);
    const res = await fetch(`${apiBase}/export/comments?${queryParams.toString()}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!res.ok) {
      throw new Error('导出失败');
    }

    const data = await res.json();
    if (data.code === 200) {
      // 创建下载链接
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `comments_${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      ElMessage.success(`成功导出 ${data.total} 条评论`);
    }
  } catch (e) {
    console.error('导出评论失败:', e);
    ElMessage.error('导出失败，请稍后重试');
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadComments();
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

.header-right {
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

/* 筛选标签 */
.filter-tabs {
  display: flex;
  gap: 6px;
  background: var(--bg-card);
  padding: 4px;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}

.filter-tab {
  padding: 6px 14px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 13px;
  color: var(--text-secondary);
  transition: all 0.2s var(--ease-out);
}

.filter-tab:hover {
  color: var(--primary);
}

.filter-tab.active {
  background: var(--primary);
  color: #fff;
}

/* ========== 表格容器 ========== */
.table-container {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 16px;
  box-shadow: var(--shadow-sm);
}

.nickname-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nickname {
  font-weight: 500;
  color: var(--text-primary);
  font-size: 14px;
}

.content-cell {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.5;
}

.article-title {
  color: var(--primary);
  font-size: 13px;
}

.no-data {
  color: var(--text-tertiary);
  font-size: 13px;
}

.date-text {
  font-size: 13px;
  color: var(--text-secondary);
}

/* ========== 空状态 ========== */
.empty-state {
  text-align: center;
  padding: 64px 0;
}

.empty-text {
  font-size: 15px;
  color: var(--text-secondary);
  margin: 12px 0 0;
}

/* ========== 分页 ========== */
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

/* ========== 响应式 ========== */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .filter-tabs {
    width: 100%;
    overflow-x: auto;
  }
}
</style>
