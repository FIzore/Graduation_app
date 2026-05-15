<template>
  <div class="app-container">
    <aside class="sidebar">
      <div class="logo">智循校园</div>
      <ul class="menu">
        <li>仪表盘</li>
        <li>用户管理</li>
        <li>闲置物品管理</li>
        <li class="active">安全态势感知</li>
        <li>系统设置</li>
      </ul>
    </aside>

    <main class="main">
      <header class="header">
        <div class="breadcrumb">首页 / 管理后台 / <b>安全态势感知</b></div>
        <div class="user-info">
          <span class="status-dot" :class="{ fallback: usingFallback }"></span>
          <span>{{ usingFallback ? '演示数据' : '实时数据' }}</span>
          <div class="avatar">A</div>
          <span>Admin</span>
          <button class="text-btn" type="button" @click="logout">退出</button>
        </div>
      </header>

      <section v-if="!adminToken" class="access-panel">
        <div class="access-card">
          <h1>管理大屏访问验证</h1>
          <p>请输入管理员 JWT。后端 v0.35 会校验登录态和管理员角色。</p>
          <input
            v-model="tokenInput"
            class="token-input"
            type="password"
            placeholder="Bearer Token"
            @keyup.enter="saveToken"
          />
          <button class="primary-btn" type="button" @click="saveToken">进入大屏</button>
        </div>
      </section>

      <section v-else class="content">
        <div v-if="errorMessage" class="alert" :class="{ danger: isUnauthorized || isForbidden }">
          <span>{{ errorMessage }}</span>
          <button v-if="isUnauthorized" class="text-btn" type="button" @click="logout">重新输入 Token</button>
        </div>

        <div class="toolbar">
          <div>
            <h1>平台运营与安全管理系统</h1>
            <p>围绕发布风控、预约并发与接口触发趋势进行可视化观测。</p>
          </div>
          <button class="primary-btn" type="button" :disabled="loading" @click="loadStats">
            {{ loading ? '刷新中...' : '刷新数据' }}
          </button>
        </div>

        <div class="stat-row">
          <div class="stat-card">
            <div class="stat-title">今日核心网关拦截总数</div>
            <div class="stat-value">{{ stats.todayInterceptCount }}</div>
            <div class="stat-footer">覆盖敏感词、AI 风控与预约并发冲突</div>
          </div>
          <div class="stat-card">
            <div class="stat-title">AI 风控服务健康度</div>
            <div class="stat-value success">99.8%</div>
            <div class="stat-footer">后端未提供时展示固定观测值</div>
          </div>
          <div class="stat-card">
            <div class="stat-title">风险类型数量</div>
            <div class="stat-value">{{ stats.riskTypePie.length }}</div>
            <div class="stat-footer">当前纳入图表统计的类型数</div>
          </div>
          <div class="stat-card">
            <div class="stat-title">接口排行样本数</div>
            <div class="stat-value">{{ stats.highRiskApiRanking.length }}</div>
            <div class="stat-footer">按触发次数倒序展示 Top 数据</div>
          </div>
        </div>

        <div class="chart-row">
          <div class="chart-card">
            <h3 class="chart-card-title">24小时攻击与拦截趋势</h3>
            <div ref="lineRef" class="chart-container"></div>
          </div>
          <div class="chart-card">
            <h3 class="chart-card-title">风控拦截类型占比</h3>
            <div ref="pieRef" class="chart-container"></div>
          </div>
        </div>

        <div class="chart-row-half">
          <div class="chart-card">
            <h3 class="chart-card-title">高危接口触发排行</h3>
            <div ref="barRef" class="chart-container"></div>
          </div>
          <div class="chart-card">
            <h3 class="chart-card-title">实时风控拦截日志</h3>
            <table class="log-table">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>触发用户ID</th>
                  <th>拦截类型</th>
                  <th>动作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="stats.recentRiskLogs.length === 0">
                  <td colspan="4" class="empty-cell">暂无风控事件</td>
                </tr>
                <tr v-for="log in stats.recentRiskLogs" :key="`${log.time}-${log.userId}-${log.type}`">
                  <td>{{ log.time }}</td>
                  <td>{{ maskUserId(log.userId) }}</td>
                  <td><span class="tag" :class="tagClass(log.type)">{{ log.type }}</span></td>
                  <td>{{ log.action }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as echarts from 'echarts';
import type { ECharts, EChartsOption } from 'echarts';
import { fetchDashboardStats } from './api/dashboard';
import { fallbackStats } from './mock/dashboard';
import type { DashboardError, DashboardStats } from './types/dashboard';

const TOKEN_KEY = 'adminToken';

const adminToken = ref(localStorage.getItem(TOKEN_KEY) || '');
const tokenInput = ref('');
const stats = ref<DashboardStats>(fallbackStats);
const loading = ref(false);
const usingFallback = ref(true);
const errorMessage = ref('');
const isUnauthorized = ref(false);
const isForbidden = ref(false);

const lineRef = ref<HTMLDivElement | null>(null);
const pieRef = ref<HTMLDivElement | null>(null);
const barRef = ref<HTMLDivElement | null>(null);

let lineChart: ECharts | null = null;
let pieChart: ECharts | null = null;
let barChart: ECharts | null = null;

const hasCharts = computed(() => lineChart && pieChart && barChart);

const saveToken = () => {
  const token = tokenInput.value.trim();
  if (!token) {
    errorMessage.value = '请先输入管理员 JWT';
    return;
  }
  localStorage.setItem(TOKEN_KEY, token);
  adminToken.value = token;
  tokenInput.value = '';
  loadStats();
};

const logout = () => {
  localStorage.removeItem(TOKEN_KEY);
  adminToken.value = '';
  tokenInput.value = '';
  errorMessage.value = '';
  isUnauthorized.value = false;
  isForbidden.value = false;
  usingFallback.value = true;
  stats.value = fallbackStats;
  renderCharts();
};

const loadStats = async () => {
  if (!adminToken.value) return;

  loading.value = true;
  errorMessage.value = '';
  isUnauthorized.value = false;
  isForbidden.value = false;

  try {
    stats.value = await fetchDashboardStats(adminToken.value);
    usingFallback.value = false;
  } catch (err) {
    const dashboardError = err as DashboardError;
    if (dashboardError.code === 401) {
      isUnauthorized.value = true;
      errorMessage.value = dashboardError.message || '登录状态已失效，请重新输入管理员 Token';
      localStorage.removeItem(TOKEN_KEY);
      adminToken.value = '';
    } else if (dashboardError.code === 403) {
      isForbidden.value = true;
      errorMessage.value = dashboardError.message || '无管理员权限';
      stats.value = fallbackStats;
      usingFallback.value = true;
    } else {
      errorMessage.value = '后端暂不可用，已切换为演示数据';
      stats.value = fallbackStats;
      usingFallback.value = true;
    }
  } finally {
    loading.value = false;
    await nextTick();
    renderCharts();
  }
};

const renderCharts = () => {
  if (!hasCharts.value) return;

  const data = stats.value;
  const lineOption: EChartsOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: data.attackTrendLine.xAxis },
    yAxis: { type: 'value' },
    series: [
      {
        name: '拦截次数',
        type: 'line',
        smooth: true,
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(24,144,255,0.3)' },
            { offset: 1, color: 'rgba(24,144,255,0.05)' },
          ]),
        },
        itemStyle: { color: '#1890ff' },
        data: data.attackTrendLine.series,
      },
    ],
  };

  const pieOption: EChartsOption = {
    tooltip: { trigger: 'item' },
    legend: { bottom: '0%', left: 'center', itemWidth: 10, itemHeight: 10 },
    series: [
      {
        name: '拦截类型',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['50%', '40%'],
        itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
        label: { show: false, position: 'center' },
        emphasis: { label: { show: true, fontSize: 18, fontWeight: 'bold' } },
        labelLine: { show: false },
        data: data.riskTypePie,
      },
    ],
  };

  const ranking = [...data.highRiskApiRanking].reverse();
  const barOption: EChartsOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'value' },
    yAxis: { type: 'category', data: ranking.map((item) => item.api) },
    series: [
      {
        name: '触发次数',
        type: 'bar',
        barWidth: '50%',
        itemStyle: { color: '#1890ff', borderRadius: [0, 4, 4, 0] },
        data: ranking.map((item) => item.count),
      },
    ],
  };

  lineChart?.setOption(lineOption);
  pieChart?.setOption(pieOption);
  barChart?.setOption(barOption);
};

const resizeCharts = () => {
  lineChart?.resize();
  pieChart?.resize();
  barChart?.resize();
};

const maskUserId = (userId: number) => {
  const text = String(userId);
  if (text.length <= 4) return text;
  return `${text.slice(0, 3)}***${text.slice(-2)}`;
};

const tagClass = (type: string) => {
  if (type.includes('AI')) return 'tag-red';
  if (type.includes('敏感词')) return 'tag-orange';
  return 'tag-blue';
};

watch(stats, () => {
  nextTick(renderCharts);
});

onMounted(() => {
  if (lineRef.value) lineChart = echarts.init(lineRef.value);
  if (pieRef.value) pieChart = echarts.init(pieRef.value);
  if (barRef.value) barChart = echarts.init(barRef.value);
  window.addEventListener('resize', resizeCharts);
  renderCharts();
  loadStats();
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCharts);
  lineChart?.dispose();
  pieChart?.dispose();
  barChart?.dispose();
});
</script>

<style scoped>
.app-container {
  display: flex;
  height: 100vh;
  min-width: 1180px;
  overflow: hidden;
}

.sidebar {
  width: 256px;
  flex-shrink: 0;
  background: #001529;
  color: #fff;
  display: flex;
  flex-direction: column;
}

.logo {
  height: 64px;
  line-height: 64px;
  text-align: center;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 1px;
  border-bottom: 1px solid #1e2c3c;
  background: #002140;
}

.menu {
  list-style: none;
  padding: 0;
  margin: 0;
}

.menu li {
  padding: 15px 24px;
  color: #a6adb4;
  font-size: 14px;
}

.menu li.active {
  background: #1890ff;
  color: #fff;
}

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.header {
  height: 64px;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  display: flex;
  align-items: center;
  padding: 0 24px;
  justify-content: space-between;
  z-index: 10;
}

.breadcrumb {
  color: #8c8c8c;
  font-size: 14px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #1890ff;
  color: #fff;
  text-align: center;
  line-height: 32px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #52c41a;
}

.status-dot.fallback {
  background: #faad14;
}

.content {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.access-panel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.access-card {
  width: 520px;
  background: #fff;
  border-radius: 8px;
  padding: 32px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
}

.access-card h1,
.toolbar h1 {
  margin: 0 0 8px;
  color: #262626;
  font-size: 22px;
}

.access-card p,
.toolbar p {
  margin: 0;
  color: #8c8c8c;
  font-size: 14px;
}

.token-input {
  width: 100%;
  height: 42px;
  margin: 24px 0 16px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  padding: 0 12px;
  outline: none;
}

.token-input:focus {
  border-color: #1890ff;
}

.primary-btn,
.text-btn {
  border: none;
  cursor: pointer;
}

.primary-btn {
  height: 38px;
  padding: 0 18px;
  color: #fff;
  background: #1890ff;
  border-radius: 6px;
}

.primary-btn:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.text-btn {
  color: #1890ff;
  background: transparent;
}

.toolbar,
.alert {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 2px -2px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.08);
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.alert {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #ad6800;
  background: #fffbe6;
  border: 1px solid #ffe58f;
}

.alert.danger {
  color: #a8071a;
  background: #fff1f0;
  border-color: #ffa39e;
}

.stat-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}

.stat-card,
.chart-card {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 2px -2px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.08);
}

.stat-title {
  color: #8c8c8c;
  font-size: 14px;
  margin-bottom: 8px;
}

.stat-value {
  color: #262626;
  font-size: 30px;
  font-weight: 500;
}

.stat-value.success {
  color: #3f8600;
}

.stat-footer {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #f0f0f0;
  font-size: 12px;
  color: #8c8c8c;
}

.chart-row {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
}

.chart-row-half {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.chart-card-title {
  font-size: 16px;
  font-weight: 500;
  margin: 0 0 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #f0f0f0;
}

.chart-container {
  height: 300px;
  width: 100%;
}

.log-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 13px;
}

.log-table th {
  background: #fafafa;
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
  font-weight: 500;
  color: #262626;
}

.log-table td {
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
  color: #595959;
}

.empty-cell {
  text-align: center;
  color: #8c8c8c;
}

.tag {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.tag-red {
  background: #fff1f0;
  color: #cf1322;
  border: 1px solid #ffa39e;
}

.tag-orange {
  background: #fff7e6;
  color: #d46b08;
  border: 1px solid #ffd591;
}

.tag-blue {
  background: #e6f7ff;
  color: #096dd9;
  border: 1px solid #91d5ff;
}
</style>
