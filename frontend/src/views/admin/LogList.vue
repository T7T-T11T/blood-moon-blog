<template>
  <div class="log-list-page animate-fade-in-up">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">操作日志</h2>
        <span class="count-badge">共 {{ total }} 条记录</span>
      </div>
      <div class="header-right">
        <el-button @click="handleReset">
          <el-icon><Refresh /></el-icon>
          <span>重置筛选</span>
        </el-button>
      </div>
    </div>

    <!-- 筛选条件 -->
    <div class="filter-bar">
      <el-select v-model="filterAction" placeholder="操作类型" clearable class="filter-select">
        <el-option
          v-for="item in actionOptions"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>

      <el-select
        v-model="filterResourceType"
        placeholder="资源类型"
        clearable
        class="filter-select"
      >
        <el-option
          v-for="item in resourceOptions"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>

      <el-date-picker
        v-model="filterDateRange"
        type="daterange"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        value-format="YYYY-MM-DD"
        class="filter-date"
      />

      <el-button type="primary" @click="handleSearch">
        <el-icon><Search /></el-icon>
        <span>搜索</span>
      </el-button>
    </div>

    <!-- 日志表格 -->
    <div v-loading="loading" class="table-container">
      <el-table :data="logs" stripe style="width: 100%">
        <!-- 时间列 -->
        <el-table-column prop="created_at" label="时间" width="170">
          <template #default="{ row }">
            <span class="time-text">{{ formatDateTime(row.created_at) }}</span>
          </template>
        </el-table-column>

        <!-- 用户列 -->
        <el-table-column prop="username" label="操作人" width="120">
          <template #default="{ row }">
            <span class="user-text">{{ row.username || '系统' }}</span>
          </template>
        </el-table-column>

        <!-- 操作类型列 -->
        <el-table-column prop="action" label="操作类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getActionTagType(row.action)" effect="light">
              {{ getActionLabel(row.action) }}
            </el-tag>
          </template>
        </el-table-column>

        <!-- 资源类型列 -->
        <el-table-column prop="resource_type" label="资源类型" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.resource_type" type="info" effect="plain">
              {{ getResourceLabel(row.resource_type) }}
            </el-tag>
            <span v-else class="no-data">-</span>
          </template>
        </el-table-column>

        <!-- 详情列 -->
        <el-table-column prop="details" label="详情" min-width="200">
          <template #default="{ row }">
            <span v-if="row.details" class="details-text">
              {{ typeof row.details === 'string' ? row.details : JSON.stringify(row.details) }}
            </span>
            <span v-else class="no-data">-</span>
          </template>
        </el-table-column>

        <!-- IP地址列 -->
        <el-table-column prop="ip_address" label="IP地址" width="140">
          <template #default="{ row }">
            <span v-if="row.ip_address" class="ip-text">{{ row.ip_address }}</span>
            <span v-else class="no-data">-</span>
          </template>
        </el-table-column>
      </el-table>

      <!-- 空状态 -->
      <div v-if="!loading && logs.length === 0" class="empty-state">
        <el-icon :size="64" class="empty-icon"><Document /></el-icon>
        <p class="empty-title">暂无操作日志</p>
        <p class="empty-desc">系统操作记录会在此展示</p>
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
 * @file LogList.vue
 * @description 操作日志页面组件
 * 作用：展示系统操作日志，支持按操作类型、资源类型和日期筛选
 */

import { ref, onMounted } from 'vue';
import { Refresh, Search, Document } from '@element-plus/icons-vue';
import { getLogs } from '../../api/logs';

/** 日志列表 */
const logs = ref([]);

/** 加载状态 */
const loading = ref(false);

/** 当前页码 */
const currentPage = ref(1);

/** 每页数量 */
const pageSize = 20;

/** 日志总数 */
const total = ref(0);

/** 操作类型筛选 */
const filterAction = ref('');

/** 资源类型筛选 */
const filterResourceType = ref('');

/** 日期范围筛选 */
const filterDateRange = ref([]);

/**
 * 操作类型选项
 */
const actionOptions = [
  { value: '登录', label: '登录' },
  { value: '创建', label: '创建' },
  { value: '更新', label: '更新' },
  { value: '删除', label: '删除' },
  { value: '恢复', label: '恢复' },
  { value: '导出', label: '导出' },
  { value: '审核', label: '审核' }
];

/**
 * 资源类型选项
 */
const resourceOptions = [
  { value: 'article', label: '文章' },
  { value: 'category', label: '分类' },
  { value: 'tag', label: '标签' },
  { value: 'comment', label: '评论' },
  { value: 'link', label: '友链' },
  { value: 'music', label: '音乐' },
  { value: 'user', label: '用户' },
  { value: 'settings', label: '系统设置' }
];

/**
 * 获取操作类型标签样式
 * @param {string} action - 操作类型
 * @returns {string} 标签类型
 */
function getActionTagType(action) {
  const map = {
    登录: '',
    创建: 'success',
    更新: 'warning',
    删除: 'danger',
    恢复: 'info',
    导出: '',
    审核: 'warning'
  };
  return map[action] || '';
}

/**
 * 获取操作类型标签文本
 * @param {string} action - 操作类型
 * @returns {string} 标签文本
 */
function getActionLabel(action) {
  const map = {
    登录: '登录',
    创建: '创建',
    更新: '更新',
    删除: '删除',
    恢复: '恢复',
    导出: '导出',
    审核: '审核'
  };
  return map[action] || action;
}

/**
 * 获取资源类型标签文本
 * @param {string} type - 资源类型
 * @returns {string} 标签文本
 */
function getResourceLabel(type) {
  const map = {
    article: '文章',
    category: '分类',
    tag: '标签',
    comment: '评论',
    link: '友链',
    music: '音乐',
    user: '用户',
    settings: '系统设置'
  };
  return map[type] || type;
}

/**
 * 格式化日期时间
 * @param {string} dateStr - 日期字符串
 * @returns {string} 格式化后的日期时间
 */
function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
}

/**
 * 加载操作日志列表
 * @returns {Promise<void>}
 */
async function loadLogs() {
  loading.value = true;
  try {
    const params = {
      page: currentPage.value,
      page_size: pageSize
    };
    if (filterAction.value) {
      params.action = filterAction.value;
    }
    if (filterResourceType.value) {
      params.resource_type = filterResourceType.value;
    }
    if (filterDateRange.value?.length === 2) {
      params.start_date = filterDateRange.value[0];
      params.end_date = filterDateRange.value[1];
    }

    const res = await getLogs(params);
    if (res.code === 200 && res.data) {
      logs.value = res.data.list || [];
      total.value = res.data.pagination?.total || 0;
    }
  } catch (e) {
    console.error('加载操作日志失败:', e);
    logs.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

/**
 * 搜索
 */
function handleSearch() {
  currentPage.value = 1;
  loadLogs();
}

/**
 * 重置筛选
 */
function handleReset() {
  filterAction.value = '';
  filterResourceType.value = '';
  filterDateRange.value = [];
  currentPage.value = 1;
  loadLogs();
}

/**
 * 分页器页码变化回调
 * @param {number} page - 新页码
 */
function handlePageChange(page) {
  currentPage.value = page;
  loadLogs();
}

onMounted(() => {
  loadLogs();
});
</script>

<style scoped>
/* ========== 页面头部 ========== */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
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

/* ========== 筛选栏 ========== */
.filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.filter-select {
  width: 160px;
}

.filter-date {
  width: 260px;
}

/* ========== 表格容器 ========== */
.table-container {
  background: var(--admin-card);
  border-radius: 8px;
  overflow: hidden;
}

.time-text {
  color: var(--admin-text-secondary);
  font-variant-numeric: tabular-nums;
  font-size: 13px;
}

.user-text {
  color: var(--admin-text);
  font-weight: 500;
}

.details-text {
  color: var(--admin-text-secondary);
  font-size: 13px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.ip-text {
  color: var(--admin-text-tertiary);
  font-variant-numeric: tabular-nums;
  font-size: 13px;
}

.no-data {
  color: var(--admin-text-tertiary);
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