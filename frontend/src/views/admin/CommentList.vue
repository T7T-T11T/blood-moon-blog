<template>
  <div class="comment-list-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">评论管理</h2>
        <span class="count">共 {{ total }} 条</span>
      </div>
      <div class="header-right">
        <!-- 状态筛选 -->
        <el-select
          v-model="filterStatus"
          placeholder="按状态筛选"
          clearable
          @change="handleFilterChange"
        >
          <el-option
            v-for="opt in statusOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
        <!-- 文章ID筛选 -->
        <el-input
          v-model="filterArticleId"
          placeholder="按文章ID筛选"
          clearable
          class="article-filter"
          @keyup.enter="handleFilterChange"
          @clear="handleFilterChange"
        />
        <el-button type="primary" @click="handleFilterChange">筛选</el-button>
      </div>
    </div>

    <!-- 评论表格 -->
    <div v-loading="loading" class="table-container">
      <el-table :data="comments" stripe style="width: 100%">
        <el-table-column label="昵称" width="140">
          <template #default="{ row }">
            <div class="nickname-cell">
              <el-avatar v-if="row.avatar_url" :src="row.avatar_url" :size="28" />
              <span class="nickname">{{ row.nickname }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="评论内容" min-width="240">
          <template #default="{ row }">
            <div class="content-cell" :title="row.content">{{ row.content }}</div>
          </template>
        </el-table-column>

        <el-table-column label="文章标题" min-width="180">
          <template #default="{ row }">
            <span v-if="row.article_title" class="article-title">{{ row.article_title }}</span>
            <span v-else class="no-data">已删除</span>
          </template>
        </el-table-column>

        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" effect="dark">{{ row.status }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column label="IP" width="140">
          <template #default="{ row }">
            <span class="ip-text">{{ row.ip_address || '-' }}</span>
          </template>
        </el-table-column>

        <el-table-column label="时间" width="160">
          <template #default="{ row }">
            <span class="date">{{ formatDate(row.created_at) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <!-- 仅待审核状态显示"通过/拒绝"按钮 -->
            <el-button
              v-if="row.status !== '已通过'"
              type="success"
              size="small"
              text
              @click="handleUpdateStatus(row, '已通过')"
            >
              通过
            </el-button>
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
        <el-icon :size="64" color="#94a3b8"><ChatDotRound /></el-icon>
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
 * 作用：展示所有评论（含待审核），支持按状态/文章ID筛选、分页，
 *       并提供通过、拒绝、删除等审核操作。
 * 依赖 API：getCommentList / updateCommentStatus / deleteComment
 */
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ChatDotRound } from '@element-plus/icons-vue';
import { getCommentList, updateCommentStatus, deleteComment } from '../../api/comments';

/** 评论列表数据 */
const comments = ref([]);

/** 加载状态 */
const loading = ref(false);

/** 当前页码 */
const page = ref(1);

/** 每页数量 */
const pageSize = ref(10);

/** 总条数（用于分页） */
const total = ref(0);

/** 状态筛选值：空字符串表示全部 */
const filterStatus = ref('');

/** 文章ID筛选值 */
const filterArticleId = ref('');

/** 状态筛选项定义 */
const statusOptions = [
  { label: '全部', value: '' },
  { label: '待审核', value: '待审核' },
  { label: '已通过', value: '已通过' },
  { label: '已拒绝', value: '已拒绝' }
];

/**
 * 根据评论状态返回对应的 ElTag 类型
 * @param {string} status - 评论状态（待审核/已通过/已拒绝）
 * @returns {string} ElTag 类型（warning/success/danger/info）
 */
function getStatusTagType(status) {
  // 按状态映射到不同颜色，便于一眼区分
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
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * 加载评论列表
 * 根据当前筛选条件与分页参数请求后端数据
 */
async function loadComments() {
  loading.value = true;
  try {
    // 组装查询参数：仅携带非空条件，避免后端误判
    const params = {
      page: page.value,
      page_size: pageSize.value
    };
    if (filterStatus.value) params.status = filterStatus.value;
    if (filterArticleId.value) params.article_id = filterArticleId.value;

    const { data } = await getCommentList(params);
    // 后端返回 { list, pagination: { total, ... } }
    comments.value = data.list || [];
    total.value = data.pagination?.total || 0;
  } catch (e) {
    // 响应拦截器已统一提示错误，这里仅兜底日志
    console.error('加载评论列表失败:', e);
  } finally {
    loading.value = false;
  }
}

/**
 * 筛选条件变化时重置页码并重新加载
 */
function handleFilterChange() {
  // 切换筛选条件时回到第一页，避免停留在不存在的页码
  page.value = 1;
  loadComments();
}

/**
 * 每页数量变化时重置页码并重新加载
 */
function handleSizeChange() {
  page.value = 1;
  loadComments();
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
    // 响应拦截器已统一提示错误，这里仅兜底日志
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
    // 用户点击取消时进入此分支，无需处理
    if (e !== 'cancel') {
      console.error('删除评论失败:', e);
    }
  }
}

onMounted(() => {
  loadComments();
});
</script>

<style scoped>
.comment-list-page {
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

/* 页面头部 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
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

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.article-filter {
  width: 180px;
}

/* 表格容器 */
.table-container {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.nickname-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nickname {
  font-weight: 500;
  color: #0f172a;
}

.content-cell {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  color: #475569;
  font-size: 14px;
  line-height: 1.5;
}

.article-title {
  color: #0d9488;
  font-size: 14px;
}

.no-data {
  color: #94a3b8;
  font-size: 13px;
}

.ip-text {
  font-size: 13px;
  color: #64748b;
  font-family: 'Courier New', monospace;
}

.date {
  font-size: 13px;
  color: #64748b;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 64px 0;
}

.empty-text {
  font-size: 16px;
  color: #64748b;
  margin: 16px 0 0;
}

/* 分页 */
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

/* 响应式 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-right {
    flex-wrap: wrap;
    width: 100%;
  }

  .article-filter {
    width: 100%;
  }
}
</style>
