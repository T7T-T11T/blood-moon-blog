<!--
  任务列表页
  作用：展示当前用户的所有任务，支持状态筛选、快捷状态切换、编辑、删除
-->
<template>
  <div class="task-list-page">
    <!-- 顶部：标题 + 新增按钮 -->
    <div class="page-header animate-fade-in-down">
      <div class="header-left">
        <h2 class="page-title">我的任务</h2>
        <span class="task-count">共 {{ tasks.length }} 项</span>
      </div>
      <el-button type="primary" class="add-btn" @click="$router.push('/admin/tasks')">
        <el-icon><Plus /></el-icon> 新增任务
      </el-button>
    </div>

    <!-- 状态筛选标签 -->
    <div class="filter-bar animate-fade-in-down delay-150">
      <div class="filter-tabs">
        <div
          v-for="tab in statusTabs"
          :key="tab.value"
          class="filter-tab"
          :class="{ active: filterStatus === tab.value }"
          @click="
            filterStatus = tab.value;
            loadTasks();
          "
        >
          <el-icon v-if="tab.icon"><component :is="tab.icon" /></el-icon>
          <span>{{ tab.label }}</span>
          <span v-if="tab.count > 0" class="tab-count">{{ tab.count }}</span>
        </div>
      </div>
    </div>

    <!-- 任务表格 -->
    <div class="table-wrapper animate-fade-in-up delay-300">
      <el-table
        v-loading="loading"
        :data="tasks"
        style="width: 100%"
        empty-text="还没有任务，点击右上角创建吧"
        :header-cell-style="{ background: 'transparent' }"
      >
        <el-table-column prop="title" label="标题" min-width="220">
          <template #default="{ row }">
            <div class="task-title-cell">
              <span class="title-text">{{ row.title }}</span>
              <div v-if="row.description" class="task-desc">{{ row.description }}</div>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" round>{{ row.status }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="priority" label="优先级" width="90">
          <template #default="{ row }">
            <el-tag :type="priorityTagType(row.priority)" effect="light" round>
              {{ row.priority }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="due_date" label="截止日期" width="130">
          <template #default="{ row }">
            <span v-if="row.due_date" class="due-date" :class="{ overdue: isOverdue(row) }">
              <el-icon><Clock /></el-icon>
              {{ formatDate(row.due_date) }}
            </span>
            <span v-else class="no-date">—</span>
          </template>
        </el-table-column>

        <el-table-column prop="created_at" label="创建时间" width="160">
          <template #default="{ row }">
            <span class="created-at">{{ formatDateTime(row.created_at) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="260" fixed="right">
          <template #default="{ row }">
            <el-select
              v-model="row.status"
              size="small"
              class="status-select"
              @change="handleStatusChange(row)"
            >
              <el-option label="待办" value="待办" />
              <el-option label="进行中" value="进行中" />
              <el-option label="已完成" value="已完成" />
            </el-select>
            <el-button
              size="small"
              type="primary"
              text
              @click="$router.push(`/task/edit/${row.id}`)"
            >
              <el-icon><Edit /></el-icon>
            </el-button>
            <el-button size="small" type="danger" text @click="handleDelete(row)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
/**
 * 任务列表页逻辑
 * - 加载任务列表（支持按状态筛选）
 * - 快捷修改任务状态
 * - 删除任务（带确认弹窗）
 */
import { ref, onMounted, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Clock,
  Edit,
  Delete,
  List,
  Odometer,
  RefreshRight,
  CircleCheck
} from '@element-plus/icons-vue';
import { getTasksAPI, deleteTaskAPI, changeTaskStatusAPI } from '../api/tasks';

const tasks = ref([]);
const loading = ref(false);
const filterStatus = ref('全部');

/** 状态标签页配置 */
const statusTabs = computed(() => [
  { label: '全部', value: '全部', icon: List, count: tasks.value.length },
  {
    label: '待办',
    value: '待办',
    icon: Odometer,
    count: tasks.value.filter((t) => t.status === '待办').length
  },
  {
    label: '进行中',
    value: '进行中',
    icon: RefreshRight,
    count: tasks.value.filter((t) => t.status === '进行中').length
  },
  {
    label: '已完成',
    value: '已完成',
    icon: CircleCheck,
    count: tasks.value.filter((t) => t.status === '已完成').length
  }
]);

/** 加载任务列表 */
async function loadTasks() {
  loading.value = true;
  try {
    const params = filterStatus.value !== '全部' ? { status: filterStatus.value } : {};
    const res = await getTasksAPI(params);
    tasks.value = res.data;
  } catch (err) {
    // 错误已在拦截器处理
  } finally {
    loading.value = false;
  }
}

/** 快捷修改任务状态 */
async function handleStatusChange(row) {
  try {
    await changeTaskStatusAPI(row.id, row.status);
    ElMessage.success(`状态已更新为「${row.status}」`);
  } catch (err) {
    loadTasks();
  }
}

/** 删除任务 */
async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确定要删除任务「${row.title}」吗？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '确定删除',
      cancelButtonText: '取消'
    });
    await deleteTaskAPI(row.id);
    ElMessage.success('任务已删除');
    loadTasks();
  } catch (err) {
    // 用户取消
  }
}

/** 状态标签颜色 */
function statusTagType(status) {
  const map = { 待办: 'warning', 进行中: 'primary', 已完成: 'success' };
  return map[status] || undefined;
}

/** 优先级标签颜色 */
function priorityTagType(priority) {
  const map = { 高: 'danger', 中: 'warning', 低: 'info' };
  return map[priority] || undefined;
}

/** 是否逾期 */
function isOverdue(row) {
  if (!row.due_date || row.status === '已完成') return false;
  return new Date(row.due_date) < new Date().setHours(0, 0, 0, 0);
}

/** 格式化日期 */
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('zh-CN');
}

/** 格式化日期时间 */
function formatDateTime(dateStr) {
  const d = new Date(dateStr);
  return (
    d.toLocaleDateString('zh-CN') +
    ' ' +
    d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  );
}

onMounted(loadTasks);
</script>

<style scoped>
.task-list-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 页面头部 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.task-count {
  font-size: 13px;
  color: var(--text-tertiary);
}

.add-btn {
  height: 40px;
  padding: 0 20px;
  border-radius: var(--radius-md);
}

/* 筛选标签页 */
.filter-bar {
  background: #fff;
  border-radius: var(--radius-lg);
  padding: 6px;
  border: 1px solid var(--border-light);
}

.filter-tabs {
  display: flex;
  gap: 4px;
}

.filter-tab {
  flex: 1;
  max-width: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.filter-tab:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.filter-tab.active {
  color: #fff;
  background: linear-gradient(135deg, #0d9488, #0891b2);
  box-shadow: 0 4px 12px rgba(13, 148, 136, 0.3);
}

.filter-tab.active .tab-count {
  background: rgba(255, 255, 255, 0.25);
  color: #fff;
}

.tab-count {
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 11px;
  background: var(--bg-hover);
  color: var(--text-tertiary);
  font-size: 12px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* 表格 */
.table-wrapper {
  background: #fff;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-light);
  overflow: hidden;
}

.table-wrapper :deep(.el-table) {
  --el-table-border-color: var(--border-light);
  --el-table-header-bg-color: transparent;
}

.table-wrapper :deep(.el-table th.el-table__cell) {
  background: var(--bg-hover) !important;
  font-weight: 600;
  color: var(--text-primary);
  font-size: 13px;
}

.table-wrapper :deep(.el-table td.el-table__cell) {
  font-size: 14px;
  padding: 14px 0;
}

.task-title-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.title-text {
  font-weight: 600;
  color: var(--text-primary);
}

.task-desc {
  color: var(--text-tertiary);
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.due-date {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--text-secondary);
  font-size: 13px;
}

.due-date.overdue {
  color: var(--danger);
  font-weight: 600;
}

.no-date {
  color: var(--text-placeholder);
}

.created-at {
  color: var(--text-tertiary);
  font-size: 13px;
}

.status-select {
  width: 100px;
}

.table-wrapper :deep(.el-table .cell) {
  padding-left: 16px;
  padding-right: 16px;
}

.table-wrapper :deep(.el-table__row) {
  transition: background var(--dur-fast) var(--ease-out);
}

.table-wrapper :deep(.el-table__row:hover) {
  transform: scale(1.005);
}

.task-title-cell {
  transition: transform var(--dur-normal) var(--ease-out);
}

.task-title-cell:hover {
  transform: translateX(2px);
}
</style>
