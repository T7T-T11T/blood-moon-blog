<template>
  <div class="statistics-page">
    <!-- 关键指标行 -->
    <div class="metrics-row">
      <div
        v-for="(metric, index) in metrics"
        :key="metric.label"
        class="metric-card animate-fade-in-up hover-lift"
        :class="'delay-' + (index + 1) * 100"
      >
        <div class="metric-icon" :class="metric.theme">
          <el-icon :size="20"><component :is="metric.icon" /></el-icon>
        </div>
        <div class="metric-info">
          <span class="metric-value">{{ metric.value }}</span>
          <span class="metric-label">{{ metric.label }}</span>
        </div>
      </div>
    </div>

    <!-- 图表区域 -->
    <div class="charts-row">
      <!-- 文章状态分布（饼图） -->
      <section class="chart-card animate-fade-in-up delay-200">
        <h3 class="chart-title">文章状态分布</h3>
        <div ref="pieChartRef" class="chart-canvas"></div>
      </section>

      <!-- 7天发布趋势（折线图） -->
      <section class="chart-card animate-fade-in-up delay-300">
        <h3 class="chart-title">7 天发布趋势</h3>
        <div ref="lineChartRef" class="chart-canvas"></div>
      </section>
    </div>

    <!-- 文章阅读量 Top5（柱状图） -->
    <section class="chart-card full animate-fade-in-up delay-300">
      <h3 class="chart-title">文章阅读量 Top 5</h3>
      <div ref="barChartRef" class="chart-canvas bar"></div>
    </section>
  </div>
</template>

<script setup>
/**
 * @file Statistics.vue
 * @description 博客数据统计页面（管理端）
 * 作用：展示文章相关统计数据，包括关键指标、文章状态分布饼图、
 *       7 天发布趋势折线图、阅读量 Top5 柱状图。仅展示文章维度数据。
 * 依赖 API：getDashboardStatsAPI / getArticles
 * 依赖库：echarts
 */
import { ref, onMounted, onBeforeUnmount, nextTick, markRaw } from 'vue';
import { Document, View, Folder, PriceTag, ChatDotRound } from '@element-plus/icons-vue';
import { getDashboardStatsAPI } from '@/api/dashboard';
import { getArticles } from '@/api/articles';

/** 统计数据 */
const statsData = ref(null);

/** 图表 DOM 引用 */
const pieChartRef = ref(null);
const lineChartRef = ref(null);
const barChartRef = ref(null);

/** echarts 实例（用于销毁时释放） */
let pieChart = null;
let lineChart = null;
let barChart = null;

/** echarts 模块引用（路由级懒加载） */
let echarts = null;

/** 关键指标配置（根据统计数据计算得出） */
const metrics = ref([
  { label: '文章总数', value: 0, icon: markRaw(Document), theme: 'teal' },
  { label: '总阅读量', value: 0, icon: markRaw(View), theme: 'blue' },
  { label: '分类数', value: 0, icon: markRaw(Folder), theme: 'amber' },
  { label: '标签数', value: 0, icon: markRaw(PriceTag), theme: 'violet' },
  { label: '评论数', value: 0, icon: markRaw(ChatDotRound), theme: 'rose' }
]);

/**
 * 加载统计数据
 * 并行请求仪表盘统计接口与文章列表接口
 */
async function loadStats() {
  try {
    const [statsRes, articlesRes] = await Promise.allSettled([
      getDashboardStatsAPI(),
      getArticles()
    ]);

    const stats = {
      articleStats: { total: 0, published: 0, draft: 0, total_views: 0 },
      categoryCount: 0,
      tagCount: 0,
      commentCount: 0,
      publishTrend: [],
      topArticles: []
    };

    // 解析仪表盘统计
    if (statsRes.status === 'fulfilled' && statsRes.value.code === 200) {
      const data = statsRes.value.data || {};
      stats.articleStats = data.articleStats || stats.articleStats;
      stats.categoryCount = data.categoryCount || 0;
      stats.tagCount = data.tagCount || 0;
      stats.commentCount = data.commentCount || 0;
      stats.publishTrend = data.publishTrend || [];
      stats.topArticles = data.latestArticles || [];
    }

    // 解析文章列表用于 Top5 阅读量
    let topArticles = stats.topArticles;
    if (articlesRes.status === 'fulfilled' && articlesRes.value.code === 200) {
      const list = Array.isArray(articlesRes.value.data)
        ? articlesRes.value.data
        : articlesRes.value.data?.list || [];
      // 按阅读量降序取前5
      topArticles = [...list].sort((a, b) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 5);
    }

    statsData.value = stats;

    // 更新关键指标
    metrics.value[0].value = stats.articleStats.total || 0;
    metrics.value[1].value = stats.articleStats.total_views || 0;
    metrics.value[2].value = stats.categoryCount;
    metrics.value[3].value = stats.tagCount;
    metrics.value[4].value = stats.commentCount;

    // 等待 DOM 渲染后初始化图表
    await nextTick();
    // 路由级懒加载 echarts，仅首次使用时加载
    if (!echarts) {
      echarts = await import('echarts');
    }
    initPieChart(stats.articleStats);
    initLineChart(stats.publishTrend);
    initBarChart(topArticles);
  } catch (e) {
    console.error('加载统计数据失败:', e);
  }
}

/**
 * 初始化文章状态分布饼图
 * @param {Object} articleStats - 文章统计 { published, draft }
 */
function initPieChart(articleStats) {
  if (!pieChartRef.value) return;
  pieChart = echarts.init(pieChartRef.value);
  pieChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0, icon: 'circle', textStyle: { color: '#6b7280' } },
    color: ['#0d9488', '#f59e0b'],
    series: [
      {
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 14, fontWeight: 600 }
        },
        data: [
          { value: articleStats.published || 0, name: '已发布' },
          { value: articleStats.draft || 0, name: '草稿' }
        ]
      }
    ]
  });
}

/**
 * 初始化7天发布趋势折线图
 * @param {Array<{date:string,count:number}>} trend - 趋势数据
 */
function initLineChart(trend) {
  if (!lineChartRef.value) return;
  lineChart = echarts.init(lineChartRef.value);
  const dates = (trend || []).map((t) => t.date);
  const counts = (trend || []).map((t) => t.count);
  lineChart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#9ca3af', fontSize: 11 }
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#9ca3af', fontSize: 11 },
      splitLine: { lineStyle: { color: '#f1f5f9' } }
    },
    series: [
      {
        data: counts,
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 3, color: '#0d9488' },
        itemStyle: { color: '#0d9488' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(13, 148, 136, 0.25)' },
            { offset: 1, color: 'rgba(13, 148, 136, 0.02)' }
          ])
        }
      }
    ]
  });
}

/**
 * 初始化阅读量 Top5 柱状图
 * @param {Array<{title:string,view_count:number}>} articles - 文章列表
 */
function initBarChart(articles) {
  if (!barChartRef.value) return;
  barChart = echarts.init(barChartRef.value);
  // 截断过长标题
  const names = (articles || []).map((a) =>
    a.title?.length > 12 ? a.title.slice(0, 12) + '...' : a.title || '无标题'
  );
  const views = (articles || []).map((a) => a.view_count || 0);
  barChart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 40, right: 30, top: 20, bottom: 40 },
    xAxis: {
      type: 'category',
      data: names,
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#9ca3af', fontSize: 11, interval: 0, rotate: 15 }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#9ca3af', fontSize: 11 },
      splitLine: { lineStyle: { color: '#f1f5f9' } }
    },
    series: [
      {
        data: views,
        type: 'bar',
        barWidth: '45%',
        itemStyle: {
          borderRadius: [6, 6, 0, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#14b8a6' },
            { offset: 1, color: '#0d9488' }
          ])
        }
      }
    ]
  });
}

/** 窗口尺寸变化时重绘图表 */
function handleResize() {
  pieChart?.resize();
  lineChart?.resize();
  barChart?.resize();
}

let resizeObserver = null;

onMounted(() => {
  loadStats();
  window.addEventListener('resize', handleResize);

  // 使用 ResizeObserver 监听图表容器尺寸变化（比 window.resize 更精准）
  if (window.ResizeObserver) {
    resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    const containers = [pieChartRef.value, lineChartRef.value, barChartRef.value];
    containers.forEach((el) => {
      if (el) resizeObserver.observe(el);
    });
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  resizeObserver?.disconnect();
  // 释放 echarts 实例避免内存泄漏
  pieChart?.dispose();
  lineChart?.dispose();
  barChart?.dispose();
});
</script>

<style scoped>
/* ========== 关键指标行 ========== */
.metrics-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.metric-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px 22px;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.metric-icon {
  width: 46px;
  height: 46px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

/* 渐变主题色 */
.metric-icon.teal {
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
}
.metric-icon.blue {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
}
.metric-icon.amber {
  background: linear-gradient(135deg, #f59e0b, #d97706);
}
.metric-icon.violet {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
}
.metric-icon.rose {
  background: linear-gradient(135deg, #f43f5e, #e11d48);
}

.metric-info {
  flex: 1;
  min-width: 0;
}

.metric-value {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
}

.metric-label {
  font-size: 13px;
  color: var(--text-secondary);
}

/* ========== 图表卡片 ========== */
.charts-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 24px;
}

.chart-card {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 24px;
  box-shadow: var(--shadow-sm);
}

.chart-card.full {
  width: 100%;
}

.chart-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 16px;
}

.chart-canvas {
  width: 100%;
  height: 280px;
}

.chart-canvas.bar {
  height: 320px;
}

/* ========== 响应式 ========== */
@media (max-width: 768px) {
  .charts-row {
    grid-template-columns: 1fr;
  }

  .metrics-row {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
