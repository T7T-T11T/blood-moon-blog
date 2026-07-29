<template>
  <div v-loading="loading" class="statistics-page">
    <div class="page-header animate-fade-in-down">
      <h2 class="page-title">数据统计</h2>
      <span class="page-desc">了解你的效率数据</span>
    </div>

    <!-- 第一行：饼图 + 关键指标 -->
    <div class="stats-row">
      <div class="stat-card animate-fade-in-up delay-300">
        <div class="card-header">
          <div class="card-title">
            <span class="title-bar bar-warning"></span>
            <span>任务状态分布</span>
          </div>
        </div>
        <div ref="taskStatusRef" class="chart-box"></div>
      </div>

      <div class="stat-card animate-fade-in-up delay-300">
        <div class="card-header">
          <div class="card-title">
            <span class="title-bar bar-success"></span>
            <span>文章状态分布</span>
          </div>
        </div>
        <div ref="articleStatusRef" class="chart-box"></div>
      </div>

      <div class="stat-card metrics-card">
        <div class="card-header">
          <div class="card-title">
            <span class="title-bar bar-primary"></span>
            <span>关键指标</span>
          </div>
        </div>
        <div class="metrics-grid">
          <div class="metric-item">
            <div class="metric-icon metric-purple">
              <el-icon><CircleCheck /></el-icon>
            </div>
            <div class="metric-content">
              <div class="metric-value">{{ completionRate }}%</div>
              <div class="metric-label">任务完成率</div>
            </div>
          </div>
          <div class="metric-item">
            <div class="metric-icon metric-blue">
              <el-icon><Timer /></el-icon>
            </div>
            <div class="metric-content">
              <div class="metric-value">{{ totalFocus }}</div>
              <div class="metric-label">总专注（分钟）</div>
            </div>
          </div>
          <div class="metric-item">
            <div class="metric-icon metric-pink">
              <el-icon><View /></el-icon>
            </div>
            <div class="metric-content">
              <div class="metric-value">{{ totalViews }}</div>
              <div class="metric-label">文章总浏览</div>
            </div>
          </div>
          <div class="metric-item">
            <div class="metric-icon metric-green">
              <el-icon><Document /></el-icon>
            </div>
            <div class="metric-content">
              <div class="metric-value">{{ articles.length }}</div>
              <div class="metric-label">文章数量</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 第二行：趋势图 -->
    <div class="charts-row">
      <div class="chart-card animate-fade-in-up delay-400">
        <div class="card-header">
          <div class="card-title">
            <span class="title-bar bar-success"></span>
            <span>近7天任务完成趋势</span>
          </div>
        </div>
        <div ref="taskTrendRef" class="chart-box"></div>
      </div>

      <div class="chart-card animate-fade-in-up delay-400">
        <div class="card-header">
          <div class="card-title">
            <span class="title-bar bar-primary"></span>
            <span>近7天专注时长趋势</span>
          </div>
        </div>
        <div ref="focusTrendRef" class="chart-box"></div>
      </div>
    </div>

    <!-- 第三行：文章排行 -->
    <div class="rank-card animate-fade-in-up delay-500">
      <div class="card-header">
        <div class="card-title">
          <span class="title-bar bar-pink"></span>
          <span>文章浏览排行 TOP5</span>
        </div>
      </div>
      <el-table v-if="topArticles.length" :data="topArticles" size="small" style="width: 100%">
        <el-table-column label="排名" width="80">
          <template #default="{ $index }">
            <span class="rank-badge" :class="`rank-${$index + 1}`">{{ $index + 1 }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="文章标题" min-width="300">
          <template #default="{ row }">
            <span class="article-title">{{ row.title }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="view_count" label="浏览量" width="120" sortable>
          <template #default="{ row }">
            <span class="view-count">{{ row.view_count }} 次</span>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-else description="暂无文章数据" :image-size="60" />
    </div>
  </div>
</template>

<script setup>
/**
 * 数据统计页面
 * 展示任务状态分布、文章状态分布、关键指标、趋势图表和文章排行
 */
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue';
import { getDashboardStatsAPI } from '../api/dashboard';
import { getArticlesAPI } from '../api/articles';
import { getPomodoroAPI } from '../api/pomodoro';
import { CircleCheck, Timer, View, Document } from '@element-plus/icons-vue';
import * as echarts from 'echarts';

const loading = ref(false);
const stats = ref({});
const articles = ref([]);
const pomodoros = ref([]);

const taskStatusRef = ref(null);
const articleStatusRef = ref(null);
const taskTrendRef = ref(null);
const focusTrendRef = ref(null);

let taskStatusChart = null;
let articleStatusChart = null;
let taskTrendChart = null;
let focusTrendChart = null;

/** 文章浏览量 TOP5 */
const topArticles = computed(() =>
  [...articles.value].sort((a, b) => b.view_count - a.view_count).slice(0, 5)
);

/** 任务完成率 */
const completionRate = computed(() => {
  const t = stats.value.taskStats?.total || 0;
  const c = stats.value.taskStats?.completed || 0;
  return t > 0 ? Math.round((c / t) * 100) : 0;
});

/** 总专注时长 */
const totalFocus = computed(() =>
  pomodoros.value.filter((s) => s.completed).reduce((sum, s) => sum + s.duration, 0)
);

/** 文章总浏览量 */
const totalViews = computed(() => articles.value.reduce((sum, a) => sum + a.view_count, 0));

/** 加载所有统计数据 */
async function loadData() {
  loading.value = true;
  try {
    const [s, a, p] = await Promise.all([
      getDashboardStatsAPI(),
      getArticlesAPI(),
      getPomodoroAPI({ limit: 100 })
    ]);
    stats.value = s.data;
    articles.value = a.data;
    pomodoros.value = p.data;
    nextTick(() => renderAll());
  } catch (e) {
    console.error('加载统计数据失败：', e);
  } finally {
    loading.value = false;
  }
}

/** 获取最近7天日期数组 */
function getLast7Days() {
  const d = [];
  for (let i = 6; i >= 0; i--) {
    const dt = new Date();
    dt.setDate(dt.getDate() - i);
    d.push(dt.toISOString().split('T')[0]);
  }
  return d;
}

/** 销毁图表实例 */
function disposeCharts() {
  taskStatusChart?.dispose();
  articleStatusChart?.dispose();
  taskTrendChart?.dispose();
  focusTrendChart?.dispose();
  taskStatusChart = null;
  articleStatusChart = null;
  taskTrendChart = null;
  focusTrendChart = null;
}

/** 渲染所有图表 */
function renderAll() {
  disposeCharts();

  if (taskStatusRef.value) {
    taskStatusChart = echarts.init(taskStatusRef.value);
    taskStatusChart.setOption({
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(15,23,42,0.9)',
        borderWidth: 0,
        textStyle: { color: '#fff', fontSize: 12 }
      },
      series: [
        {
          type: 'pie',
          radius: ['45%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
          label: { show: false },
          data: [
            {
              value: stats.value.taskStats?.todo || 0,
              name: '待办',
              itemStyle: { color: '#f59e0b' }
            },
            {
              value: stats.value.taskStats?.in_progress || 0,
              name: '进行中',
              itemStyle: { color: '#3b82f6' }
            },
            {
              value: stats.value.taskStats?.completed || 0,
              name: '已完成',
              itemStyle: { color: '#10b981' }
            }
          ]
        }
      ]
    });
  }

  if (articleStatusRef.value) {
    articleStatusChart = echarts.init(articleStatusRef.value);
    const pub = articles.value.filter((a) => a.status === '已发布').length;
    const draft = articles.value.filter((a) => a.status === '草稿').length;
    articleStatusChart.setOption({
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(15,23,42,0.9)',
        borderWidth: 0,
        textStyle: { color: '#fff', fontSize: 12 }
      },
      series: [
        {
          type: 'pie',
          radius: ['45%', '70%'],
          itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
          label: { show: false },
          data: [
            { value: pub, name: '已发布', itemStyle: { color: '#10b981' } },
            { value: draft, name: '草稿', itemStyle: { color: '#94a3b8' } }
          ]
        }
      ]
    });
  }

  if (taskTrendRef.value) {
    taskTrendChart = echarts.init(taskTrendRef.value);
    const t = stats.value.taskTrend || [];
    const dates = getLast7Days();
    taskTrendChart.setOption({
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15,23,42,0.9)',
        borderWidth: 0,
        textStyle: { color: '#fff', fontSize: 12 }
      },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
      xAxis: {
        type: 'category',
        data: dates.map((d) => d.slice(5)),
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisLabel: { color: '#64748b', fontSize: 12 },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#94a3b8', fontSize: 12 },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } }
      },
      series: [
        {
          data: dates.map((d) => {
            const f = t.find((x) => x.date === d);
            return f ? f.completed_count : 0;
          }),
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { width: 3, color: '#10b981' },
          itemStyle: { color: '#10b981', borderColor: '#fff', borderWidth: 2 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(16,185,129,0.3)' },
              { offset: 1, color: 'rgba(16,185,129,0.02)' }
            ])
          }
        }
      ]
    });
  }

  if (focusTrendRef.value) {
    focusTrendChart = echarts.init(focusTrendRef.value);
    const t = stats.value.focusTrend || [];
    const dates = getLast7Days();
    focusTrendChart.setOption({
      tooltip: {
        trigger: 'axis',
        formatter: '{b}: {c}分钟',
        backgroundColor: 'rgba(15,23,42,0.9)',
        borderWidth: 0,
        textStyle: { color: '#fff', fontSize: 12 }
      },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
      xAxis: {
        type: 'category',
        data: dates.map((d) => d.slice(5)),
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisLabel: { color: '#64748b', fontSize: 12 },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        name: '分钟',
        nameTextStyle: { color: '#94a3b8', fontSize: 12 },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#94a3b8', fontSize: 12 },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } }
      },
      series: [
        {
          data: dates.map((d) => {
            const f = t.find((x) => x.date === d);
            return f ? f.total_duration : 0;
          }),
          type: 'bar',
          barWidth: '45%',
          itemStyle: {
            borderRadius: [8, 8, 0, 0],
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#0d9488' },
              { offset: 1, color: '#0891b2' }
            ])
          }
        }
      ]
    });
  }
}

/** 窗口大小变化时重新调整图表 */
function handleResize() {
  taskStatusChart?.resize();
  articleStatusChart?.resize();
  taskTrendChart?.resize();
  focusTrendChart?.resize();
}

onMounted(() => {
  loadData();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  disposeCharts();
});
</script>

<style scoped>
.statistics-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.page-header {
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

.page-desc {
  font-size: 13px;
  color: var(--text-tertiary);
}

/* 第一行：饼图 + 指标 */
.stats-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1.2fr;
  gap: 20px;
}

.stat-card {
  background: #fff;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-light);
  padding: 20px 24px;
}

.card-header {
  margin-bottom: 16px;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.title-bar {
  width: 4px;
  height: 16px;
  border-radius: 2px;
}

.bar-primary {
  background: linear-gradient(180deg, #0d9488, #0891b2);
}
.bar-success {
  background: linear-gradient(180deg, #10b981, #34d399);
}
.bar-warning {
  background: linear-gradient(180deg, #f59e0b, #fbbf24);
}
.bar-pink {
  background: linear-gradient(180deg, #ec4899, #f472b6);
}

.chart-box {
  height: 240px;
  width: 100%;
}

/* 关键指标 */
.metrics-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.metric-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border-radius: var(--radius-md);
  background: var(--bg-hover);
  transition: all 0.2s ease;
}

.metric-item:hover {
  background: var(--primary-bg);
}

.metric-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.metric-purple {
  background: linear-gradient(135deg, #0d9488, #0891b2);
}
.metric-blue {
  background: linear-gradient(135deg, #3b82f6, #60a5fa);
}
.metric-pink {
  background: linear-gradient(135deg, #ec4899, #f472b6);
}
.metric-green {
  background: linear-gradient(135deg, #10b981, #34d399);
}

.metric-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
}

.metric-label {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 2px;
}

/* 趋势图行 */
.charts-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.chart-card {
  background: #fff;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-light);
  padding: 20px 24px;
}

/* 排行卡片 */
.rank-card {
  background: #fff;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-light);
  padding: 20px 24px;
}

.rank-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
  background: var(--bg-hover);
  color: var(--text-secondary);
}

.rank-badge.rank-1 {
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  color: #fff;
}

.rank-badge.rank-2 {
  background: linear-gradient(135deg, #94a3b8, #64748b);
  color: #fff;
}

.rank-badge.rank-3 {
  background: linear-gradient(135deg, #f97316, #ea580c);
  color: #fff;
}

.article-title {
  font-weight: 500;
  color: var(--text-primary);
}

.view-count {
  font-weight: 600;
  color: var(--text-primary);
}

/* 响应式 */
@media (max-width: 1024px) {
  .stats-row {
    grid-template-columns: 1fr;
  }
  .charts-row {
    grid-template-columns: 1fr;
  }
}
</style>
