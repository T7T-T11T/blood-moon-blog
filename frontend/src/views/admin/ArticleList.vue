<template>
  <div class="article-list-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">文章管理</h2>
        <span class="article-count">共 {{ articles.length }} 篇</span>
      </div>
      <div class="header-right">
        <div class="filter-tabs">
          <div
            v-for="tab in tabs"
            :key="tab.value"
            class="filter-tab"
            :class="{ active: filterStatus === tab.value }"
            @click="filterByStatus(tab.value)"
          >
            <el-icon><component :is="tab.icon" /></el-icon>
            <span>{{ tab.label }}</span>
          </div>
        </div>
        <el-input v-model="searchKeyword" placeholder="搜索文章..." class="search-input" clearable>
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-button type="primary" @click="goToAdd">
          <el-icon><Plus /></el-icon>
          <span>写文章</span>
        </el-button>
      </div>
    </div>

    <!-- 文章表格 -->
    <div v-loading="loading" class="table-container">
      <el-table :data="filteredArticles" stripe style="width: 100%">
        <el-table-column label="文章" min-width="300">
          <template #default="{ row }">
            <div class="article-cell" @click="goToEdit(row.id)">
              <div class="article-info">
                <h4 class="article-title">{{ row.title }}</h4>
                <p v-if="row.summary" class="article-summary">{{ row.summary }}</p>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="分类" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.category_name" type="info" effect="plain">
              {{ row.category_name }}
            </el-tag>
            <span v-else class="no-category">未分类</span>
          </template>
        </el-table-column>

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
          </template>
        </el-table-column>

        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === '已发布' ? 'success' : 'warning'" effect="dark">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="阅读" width="80" align="center">
          <template #default="{ row }">
            <span class="view-count">{{ row.view_count }}</span>
          </template>
        </el-table-column>

        <el-table-column label="创建时间" width="160">
          <template #default="{ row }">
            <span class="date">{{ formatDate(row.created_at) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" text @click="goToEdit(row.id)"> 编辑 </el-button>
            <el-button type="danger" size="small" text @click="handleDelete(row)"> 删除 </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 空状态 -->
    <div v-if="!loading && filteredArticles.length === 0" class="empty-state">
      <el-icon :size="64" color="#94a3b8"><Document /></el-icon>
      <p class="empty-text">暂无文章</p>
      <el-button type="primary" @click="goToAdd">立即创建</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, markRaw } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search, Plus, Document, View } from '@element-plus/icons-vue';

const router = useRouter();

/** 文章列表 */
const articles = ref([]);

/** 加载状态 */
const loading = ref(false);

/** 状态筛选 */
const filterStatus = ref('全部');

/** 搜索关键词 */
const searchKeyword = ref('');

/** 状态选项 */
const tabs = [
  { value: '全部', label: '全部', icon: markRaw(View) },
  { value: '已发布', label: '已发布', icon: markRaw(View) },
  { value: '草稿', label: '草稿', icon: markRaw(Document) }
];

/** 筛选后的文章列表 */
const filteredArticles = computed(() => {
  let result = articles.value;

  if (filterStatus.value !== '全部') {
    result = result.filter((a) => a.status === filterStatus.value);
  }

  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.toLowerCase();
    result = result.filter(
      (a) => a.title.toLowerCase().includes(keyword) || a.summary?.toLowerCase().includes(keyword)
    );
  }

  return result;
});

/** 格式化日期 */
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/** 按状态筛选 */
function filterByStatus(status) {
  filterStatus.value = status;
}

/** 跳转到新增页面 */
function goToAdd() {
  router.push('/admin/articles/add');
}

/** 跳转到编辑页面 */
function goToEdit(id) {
  router.push(`/admin/articles/edit/${id}`);
}

/** 删除文章 */
async function handleDelete(article) {
  try {
    await ElMessageBox.confirm(`确定要删除文章"${article.title}"吗？此操作不可恢复。`, '确认删除', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning'
    });

    const res = await fetch(`/api/articles/${article.id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    const json = await res.json();

    if (json.code === 200) {
      ElMessage.success('删除成功');
      loadArticles();
    }
  } catch (e) {
    // 用户取消删除
  }
}

/** 加载文章列表 */
async function loadArticles() {
  loading.value = true;
  try {
    const res = await fetch('/api/articles', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    const json = await res.json();
    if (json.code === 200) {
      articles.value = json.data;
    }
  } catch (e) {
    console.error('加载文章失败:', e);
    ElMessage.error('加载文章失败');
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadArticles();
});
</script>

<style scoped>
.article-list-page {
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

.article-count {
  font-size: 14px;
  color: #64748b;
  background: #f1f5f9;
  padding: 4px 12px;
  border-radius: 16px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.filter-tabs {
  display: flex;
  gap: 8px;
}

.filter-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #f1f5f9;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  color: #64748b;
  transition: all 0.2s ease;
}

.filter-tab:hover {
  color: #0d9488;
}

.filter-tab.active {
  background: #0d9488;
  color: #fff;
}

.search-input {
  width: 240px;
}

.search-input :deep(.el-input__wrapper) {
  border-radius: 20px;
}

/* 表格 */
.table-container {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.article-cell {
  cursor: pointer;
}

.article-cell:hover .article-title {
  color: #0d9488;
}

.article-title {
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
  margin: 0 0 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.article-summary {
  font-size: 13px;
  color: #64748b;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.no-category {
  font-size: 13px;
  color: #94a3b8;
}

.tags-cell {
  display: flex;
  gap: 4px;
}

.view-count {
  font-size: 14px;
  color: #475569;
  font-weight: 500;
}

.date {
  font-size: 13px;
  color: #64748b;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 80px 0;
}

.empty-text {
  font-size: 16px;
  color: #64748b;
  margin: 16px 0 24px;
}

/* 响应式 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-right {
    flex-wrap: wrap;
  }

  .search-input {
    width: 100%;
  }
}
</style>
