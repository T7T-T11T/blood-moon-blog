<template>
  <div class="article-list-page animate-fade-in-up">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">文章管理</h2>
        <span class="count-badge">{{ total }} 篇</span>
      </div>
      <div class="header-right">
        <!-- 状态筛选标签 -->
        <div class="filter-tabs">
          <div
            v-for="tab in tabs"
            :key="tab.value"
            class="filter-tab"
            :class="{ active: filterStatus === tab.value }"
            @click="filterByStatus(tab.value)"
          >
            <span>{{ tab.label }}</span>
          </div>
        </div>
        <!-- 搜索框 -->
        <el-input
          v-model="searchKeyword"
          placeholder="搜索文章..."
          class="search-input"
          clearable
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <!-- 导出按钮 -->
        <el-button @click="handleExportArticles">
          <el-icon><Download /></el-icon>
          <span>导出文章</span>
        </el-button>
        <!-- 写文章按钮 -->
        <el-button type="primary" @click="goToAdd">
          <el-icon><Plus /></el-icon>
          <span>写文章</span>
        </el-button>
      </div>
    </div>

    <!-- 文章表格 -->
    <div v-loading="loading" class="table-container">
      <el-table :data="articles" stripe style="width: 100%">
        <!-- 文章标题列 -->
        <el-table-column label="文章" min-width="280">
          <template #default="{ row }">
            <div class="article-cell" @click="goToEdit(row.id)">
              <h4 class="article-title">
                <el-tag v-if="row.is_top" type="danger" size="small" effect="dark" class="top-tag">置顶</el-tag>
                {{ row.title }}
              </h4>
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

        <!-- 标签列 -->
        <el-table-column label="标签" width="180">
          <template #default="{ row }">
            <div v-if="row.tags?.length" class="tags-cell">
              <el-tag v-for="tag in row.tags.slice(0, 2)" :key="tag.id" size="small" effect="plain">
                {{ tag.name }}
              </el-tag>
              <el-tag v-if="row.tags.length > 2" size="small" effect="plain" type="info">
                +{{ row.tags.length - 2 }}
              </el-tag>
            </div>
            <span v-else class="no-data">-</span>
          </template>
        </el-table-column>

        <!-- 状态列 -->
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === '已发布' ? 'success' : 'warning'" effect="light">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>

        <!-- 阅读量列 -->
        <el-table-column label="阅读" width="80" align="center">
          <template #default="{ row }">
            <span class="view-count">{{ row.view_count || 0 }}</span>
          </template>
        </el-table-column>

        <!-- 创建时间列 -->
        <el-table-column label="创建时间" width="160">
          <template #default="{ row }">
            <span class="date-text">{{ formatDate(row.created_at) }}</span>
          </template>
        </el-table-column>

        <!-- 操作列 -->
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" text @click="goToEdit(row.id)">编辑</el-button>
            <el-button
              :type="row.is_top ? 'warning' : 'info'"
              size="small"
              text
              @click="handleToggleTop(row)"
            >
              {{ row.is_top ? '取消置顶' : '置顶' }}
            </el-button>
            <el-dropdown trigger="click" @command="(cmd) => handleExportSingle(row.id, cmd)">
              <el-button type="success" size="small" text>
                <el-icon><Download /></el-icon>
                导出
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="markdown">Markdown (.md)</el-dropdown-item>
                  <el-dropdown-item command="html">HTML (.html)</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-button type="danger" size="small" text @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 空状态 -->
      <div v-if="!loading && articles.length === 0" class="empty-state">
        <el-icon :size="56" color="var(--text-tertiary)"><Document /></el-icon>
        <p class="empty-text">暂无文章</p>
        <el-button type="primary" @click="goToAdd">立即创建</el-button>
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
          @current-change="loadArticles"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * @file ArticleList.vue
 * @description 文章管理列表页（管理端）
 * 作用：展示文章列表，支持状态筛选、关键词搜索、分页、编辑跳转、删除确认。
 * 依赖 API：getArticles / deleteArticle
 */
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search, Plus, Document, Download } from '@element-plus/icons-vue';
import { getArticles, deleteArticle, exportArticle, toggleTop } from '@/api/articles';

const router = useRouter();

/** 文章列表数据 */
const articles = ref([]);

/** 加载状态 */
const loading = ref(false);

/** 当前页码 */
const page = ref(1);

/** 每页数量 */
const pageSize = ref(10);

/** 总条数 */
const total = ref(0);

/** 状态筛选值 */
const filterStatus = ref('全部');

/** 搜索关键词 */
const searchKeyword = ref('');

/** 状态筛选选项 */
const tabs = [
  { value: '全部', label: '全部' },
  { value: '已发布', label: '已发布' },
  { value: '草稿', label: '草稿' }
];

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
 * 按状态筛选文章
 * @param {string} status - 状态值（全部/已发布/草稿）
 */
function filterByStatus(status) {
  filterStatus.value = status;
  page.value = 1;
  loadArticles();
}

/** 执行搜索 */
function handleSearch() {
  page.value = 1;
  loadArticles();
}

/** 每页数量变化 */
function handleSizeChange() {
  page.value = 1;
  loadArticles();
}

/**
 * 加载文章列表
 * 根据当前筛选条件与分页参数请求后端数据
 */
async function loadArticles() {
  loading.value = true;
  try {
    // 组装查询参数：仅携带非空条件
    const params = { page: page.value, page_size: pageSize.value };
    if (filterStatus.value !== '全部') params.status = filterStatus.value;
    if (searchKeyword.value.trim()) params.keyword = searchKeyword.value.trim();

    const res = await getArticles(params);
    if (res.code === 200) {
      // 兼容数组与分页对象两种返回结构
      if (Array.isArray(res.data)) {
        articles.value = res.data;
        total.value = res.data.length;
      } else {
        articles.value = res.data.list || [];
        total.value = res.data.pagination?.total || res.data.total || 0;
      }
    }
  } catch (e) {
    console.error('加载文章失败:', e);
  } finally {
    loading.value = false;
  }
}

/** 跳转到新增文章页 */
function goToAdd() {
  router.push('/admin/articles/add');
}

/**
 * 跳转到编辑文章页
 * @param {number} id - 文章ID
 */
function goToEdit(id) {
  router.push(`/admin/articles/edit/${id}`);
}

/**
 * 删除文章（软删除，移到回收站）
 * @param {Object} article - 当前行文章数据
 */
async function handleDelete(article) {
  try {
    await ElMessageBox.confirm(
      `确定要删除文章"${article.title}"吗？文章将移至回收站，可在30天内恢复。`,
      '删除确认',
      {
        confirmButtonText: '移至回收站',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    await deleteArticle(article.id);
    ElMessage.success('文章已移至回收站');
    // 若当前页删除后为空且非第一页，回退一页
    if (articles.value.length === 1 && page.value > 1) {
      page.value -= 1;
    }
    loadArticles();
  } catch (e) {
    // 用户取消删除时进入此分支，无需处理
    if (e !== 'cancel') {
      console.error('删除文章失败:', e);
    }
  }
}

/**
 * 切换文章置顶状态
 * @param {Object} article - 文章数据
 */
async function handleToggleTop(article) {
  try {
    const res = await toggleTop(article.id);
    if (res.code === 200) {
      ElMessage.success(res.message);
      loadArticles();
    }
  } catch (e) {
    console.error('切换置顶失败:', e);
    ElMessage.error('操作失败，请稍后重试');
  }
}

/**
 * 导出单篇文章为指定格式
 * @param {number} id - 文章ID
 * @param {string} format - 导出格式 (markdown / html)
 */
async function handleExportSingle(id, format = 'markdown') {
  try {
    loading.value = true;
    const res = await exportArticle(id, format);

    // 拦截器已返回 response.data，blob 响应直接就是 Blob 对象
    const blob = res instanceof Blob ? res : new Blob([res]);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const ext = format === 'markdown' ? 'md' : 'html';
    link.download = `article_${id}_${Date.now()}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    ElMessage.success('导出成功');
  } catch (e) {
    console.error('导出文章失败:', e);
    ElMessage.error('导出失败，请稍后重试');
  } finally {
    loading.value = false;
  }
}

/**
 * 批量导出当前页文章为 Markdown 格式
 */
async function handleExportArticles() {
  if (articles.value.length === 0) {
    ElMessage.warning('当前页没有可导出的文章');
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定要导出当前页的 ${articles.value.length} 篇文章为 Markdown 格式吗？`,
      '批量导出确认',
      { confirmButtonText: '确定导出', cancelButtonText: '取消', type: 'info' }
    );

    loading.value = true;
    let exported = 0;
    let failed = 0;

    for (const article of articles.value) {
      try {
        const res = await exportArticle(article.id, 'markdown');
        const blob = res instanceof Blob ? res : new Blob([res]);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${article.title}_${Date.now()}.md`.replace(/[^\w\u4e00-\u9fa5.-]/g, '_');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        exported++;
        // 延迟一下避免浏览器弹窗过快
        await new Promise((_resolve) => setTimeout(_resolve, 300));
      } catch (err) {
        failed++;
      }
    }

    if (failed === 0) {
      ElMessage.success(`成功导出 ${exported} 篇文章`);
    } else {
      ElMessage.warning(`导出完成：成功 ${exported} 篇，失败 ${failed} 篇`);
    }
  } catch (e) {
    if (e !== 'cancel') {
      console.error('批量导出失败:', e);
      ElMessage.error('导出失败，请稍后重试');
    }
  } finally {
    loading.value = false;
  }
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

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
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

.search-input {
  width: 220px;
}

/* ========== 表格容器 ========== */
.table-container {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 16px;
  box-shadow: var(--shadow-sm);
}

.article-cell {
  cursor: pointer;
}

.article-cell:hover .article-title {
  color: var(--primary);
}

.article-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.2s var(--ease-out);
  display: flex;
  align-items: center;
  gap: 6px;
}

.top-tag {
  flex-shrink: 0;
  font-size: 11px;
}

.article-summary {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.no-data {
  font-size: 13px;
  color: var(--text-tertiary);
}

.tags-cell {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.view-count {
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 500;
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
  margin: 12px 0 20px;
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

  .header-right {
    flex-wrap: wrap;
    width: 100%;
  }

  .search-input {
    width: 100%;
  }
}
</style>
