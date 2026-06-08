<template>
  <div class="app-container">
    <aside class="sidebar">
      <div class="logo">智循校园</div>
      <ul class="menu">
        <li
          v-for="item in menuItems"
          :key="item.key"
          :class="{ active: activeView === item.key }"
          @click="switchView(item.key)"
        >
          {{ item.label }}
        </li>
      </ul>
    </aside>

    <main class="main">
      <header class="header">
        <div class="breadcrumb">首页 / 管理后台 / <b>{{ activeTitle }}</b></div>
        <div class="user-info">
          <span class="status-dot" :class="{ fallback: usingFallback }"></span>
          <span>{{ usingFallback ? '演示数据' : '实时数据' }}</span>
          <div class="avatar">A</div>
          <span>{{ adminToken ? 'Admin' : '未登录' }}</span>
          <button v-if="adminToken" class="text-btn" type="button" @click="logout">退出</button>
        </div>
      </header>

      <section v-if="!adminToken" class="access-panel">
        <form class="access-card" @submit.prevent="login">
          <h1>管理员账号登录</h1>
          <p>请输入管理员账号和密码。普通用户无法进入后台管理系统。</p>
          <input v-model.trim="loginForm.studentId" class="form-input" autocomplete="username" placeholder="管理员账号" />
          <input v-model="loginForm.password" class="form-input" autocomplete="current-password" type="password" placeholder="密码" />
          <div v-if="errorMessage" class="login-error">{{ errorMessage }}</div>
          <button class="primary-btn full" type="submit" :disabled="loading">
            {{ loading ? '登录中...' : '登录并进入后台' }}
          </button>
        </form>
      </section>

      <section v-else class="content">
        <div v-if="errorMessage" class="alert" :class="{ danger: isUnauthorized || isForbidden }">
          <span>{{ errorMessage }}</span>
          <button v-if="isUnauthorized" class="text-btn" type="button" @click="logout">重新登录</button>
        </div>

        <template v-if="activeView === 'dashboard'">
          <div class="toolbar">
            <div>
              <h1>平台风控态势大屏</h1>
              <p>聚焦发布风控、预约并发和接口拦截趋势，不扩展为完整电商后台。</p>
            </div>
            <button class="primary-btn" type="button" :disabled="loading" @click="loadStats">
              {{ loading ? '刷新中...' : '刷新数据' }}
            </button>
          </div>

          <div class="stat-row">
            <div class="stat-card">
              <div class="stat-title">今日风控拦截总数</div>
              <div class="stat-value">{{ stats.todayInterceptCount }}</div>
              <div class="stat-footer">覆盖敏感词、AI 风控、限频和预约并发冲突</div>
            </div>
            <div class="stat-card">
              <div class="stat-title">风险类型数量</div>
              <div class="stat-value">{{ stats.riskTypePie.length }}</div>
              <div class="stat-footer">当前纳入图表统计的风险类型</div>
            </div>
            <div class="stat-card">
              <div class="stat-title">高危接口样本数</div>
              <div class="stat-value">{{ stats.highRiskApiRanking.length }}</div>
              <div class="stat-footer">按触发次数倒序展示 Top 数据</div>
            </div>
            <div class="stat-card">
              <div class="stat-title">最近风险日志</div>
              <div class="stat-value success">{{ stats.recentRiskLogs.length }}</div>
              <div class="stat-footer">最近拦截记录条数</div>
            </div>
          </div>

          <div class="chart-row">
            <div class="chart-card">
              <h3 class="chart-card-title">24 小时拦截趋势</h3>
              <div ref="lineRef" class="chart-container"></div>
              <div class="chart-summary">
                <span v-for="(label, index) in stats.attackTrendLine.xAxis" :key="label">
                  {{ label }}：{{ stats.attackTrendLine.series[index] || 0 }}
                </span>
              </div>
            </div>
            <div class="chart-card">
              <h3 class="chart-card-title">风控拦截类型占比</h3>
              <div ref="pieRef" class="chart-container"></div>
              <div class="chart-summary">
                <span v-for="item in stats.riskTypePie" :key="item.name">{{ item.name }}：{{ item.value }}</span>
              </div>
            </div>
          </div>

          <div class="chart-row-half">
            <div class="chart-card">
              <h3 class="chart-card-title">高危接口触发排行</h3>
              <div ref="barRef" class="chart-container"></div>
              <div class="chart-summary">
                <span v-for="item in stats.highRiskApiRanking" :key="item.api">{{ item.api }}：{{ item.count }}</span>
              </div>
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
        </template>

        <template v-else-if="activeView === 'risk-events'">
          <div class="toolbar">
            <div>
              <h1>拦截记录查看</h1>
              <p>展示平台最近的风控拦截记录，用于追踪发布审核、限频和预约冲突事件。</p>
            </div>
            <button class="primary-btn" type="button" :disabled="loadingRiskEvents" @click="loadRiskEvents">
              {{ loadingRiskEvents ? '刷新中...' : '刷新记录' }}
            </button>
          </div>

          <div class="chart-card">
            <table class="log-table wide">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>用户ID</th>
                  <th>拦截类型</th>
                  <th>接口</th>
                  <th>说明</th>
                  <th>动作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="riskEvents.length === 0">
                  <td colspan="6" class="empty-cell">暂无拦截记录</td>
                </tr>
                <tr v-for="event in riskEvents" :key="event.id">
                  <td>{{ event.time }}</td>
                  <td>{{ maskUserId(event.userId) }}</td>
                  <td><span class="tag" :class="tagClass(event.type)">{{ event.type }}</span></td>
                  <td><code>{{ event.apiPath }}</code></td>
                  <td>{{ event.description }}</td>
                  <td>{{ event.action }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>

        <template v-else>
          <div class="toolbar">
            <div>
              <h1>敏感词规则概览</h1>
              <p>展示当前发布风控使用的敏感词规则，只读查看，不在后台扩展在线编辑。</p>
            </div>
            <button class="primary-btn" type="button" :disabled="loadingRules" @click="loadSensitiveRules">
              {{ loadingRules ? '刷新中...' : '刷新规则' }}
            </button>
          </div>

          <div class="rule-grid">
            <div v-if="sensitiveRules.length === 0" class="chart-card empty-cell">暂无敏感词规则</div>
            <div v-for="rule in sensitiveRules" :key="rule.word" class="rule-card">
              <div class="rule-word">{{ rule.word }}</div>
              <div class="rule-meta">
                <span class="tag tag-blue">{{ rule.category }}</span>
                <span class="tag tag-red">{{ rule.action }}</span>
              </div>
              <p>{{ rule.description }}</p>
            </div>
          </div>
        </template>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import * as echarts from 'echarts';
import type { ECharts, EChartsOption } from 'echarts';
import { fetchDashboardStats, fetchRiskEvents, fetchSensitiveRules, loginAdmin } from './api/dashboard';
import { fallbackStats } from './mock/dashboard';
import type { DashboardError, DashboardStats, RiskEventItem, SensitiveRuleItem } from './types/dashboard';

type ViewKey = 'dashboard' | 'risk-events' | 'sensitive-rules';

const TOKEN_KEY = 'adminToken';
const menuItems: Array<{ key: ViewKey; label: string }> = [
  { key: 'dashboard', label: '安全态势感知' },
  { key: 'risk-events', label: '拦截记录查看' },
  { key: 'sensitive-rules', label: '敏感词规则概览' },
];

const adminToken = ref(localStorage.getItem(TOKEN_KEY) || '');
const activeView = ref<ViewKey>('dashboard');
const loginForm = reactive({ studentId: '', password: '' });
const stats = ref<DashboardStats>(fallbackStats);
const riskEvents = ref<RiskEventItem[]>([]);
const sensitiveRules = ref<SensitiveRuleItem[]>([]);
const loading = ref(false);
const loadingRiskEvents = ref(false);
const loadingRules = ref(false);
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

const activeTitle = computed(() => menuItems.find((item) => item.key === activeView.value)?.label || '');

const switchView = async (key: ViewKey) => {
  activeView.value = key;
  errorMessage.value = '';
  await nextTick();
  if (key === 'dashboard') renderCharts();
  if (key === 'risk-events' && riskEvents.value.length === 0) await loadRiskEvents();
  if (key === 'sensitive-rules' && sensitiveRules.value.length === 0) await loadSensitiveRules();
};

const login = async () => {
  if (!loginForm.studentId || !loginForm.password) {
    errorMessage.value = '请输入管理员账号和密码';
    return;
  }
  loading.value = true;
  errorMessage.value = '';
  try {
    const token = await loginAdmin(loginForm.studentId, loginForm.password);
    localStorage.setItem(TOKEN_KEY, token);
    adminToken.value = token;
    loginForm.password = '';
    await loadStats();
  } catch (err) {
    const dashboardError = err as DashboardError;
    errorMessage.value = dashboardError.message || '管理员登录失败';
  } finally {
    loading.value = false;
  }
};

const logout = () => {
  localStorage.removeItem(TOKEN_KEY);
  adminToken.value = '';
  loginForm.password = '';
  errorMessage.value = '';
  isUnauthorized.value = false;
  isForbidden.value = false;
  usingFallback.value = true;
  activeView.value = 'dashboard';
  stats.value = fallbackStats;
  riskEvents.value = [];
  sensitiveRules.value = [];
  disposeCharts();
};

const handleDashboardError = (err: unknown, fallbackMessage: string) => {
  const dashboardError = err as DashboardError;
  if (dashboardError.code === 401) {
    isUnauthorized.value = true;
    errorMessage.value = dashboardError.message || '登录状态已失效，请重新登录';
    localStorage.removeItem(TOKEN_KEY);
    adminToken.value = '';
  } else if (dashboardError.code === 403) {
    isForbidden.value = true;
    errorMessage.value = dashboardError.message || '当前账号不是管理员，无法访问后台';
  } else {
    errorMessage.value = fallbackMessage;
  }
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
    handleDashboardError(err, '后端暂不可用，已切换为演示数据');
    stats.value = fallbackStats;
    usingFallback.value = true;
  } finally {
    loading.value = false;
    await nextTick();
    renderCharts();
  }
};

const loadRiskEvents = async () => {
  if (!adminToken.value) return;
  loadingRiskEvents.value = true;
  errorMessage.value = '';
  try {
    riskEvents.value = await fetchRiskEvents(adminToken.value);
  } catch (err) {
    handleDashboardError(err, '拦截记录获取失败');
  } finally {
    loadingRiskEvents.value = false;
  }
};

const loadSensitiveRules = async () => {
  if (!adminToken.value) return;
  loadingRules.value = true;
  errorMessage.value = '';
  try {
    sensitiveRules.value = await fetchSensitiveRules(adminToken.value);
  } catch (err) {
    handleDashboardError(err, '敏感词规则获取失败');
  } finally {
    loadingRules.value = false;
  }
};

const renderCharts = () => {
  if (activeView.value !== 'dashboard') return;
  if (!lineRef.value || !pieRef.value || !barRef.value) return;

  const data = stats.value;
  disposeCharts();
  lineChart = echarts.init(lineRef.value);
  pieChart = echarts.init(pieRef.value);
  barChart = echarts.init(barRef.value);

  const lineOption: EChartsOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: data.attackTrendLine.xAxis },
    yAxis: { type: 'value' },
    series: [{
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
    }],
  };

  const pieOption: EChartsOption = {
    tooltip: { trigger: 'item' },
    legend: { bottom: '0%', left: 'center', itemWidth: 10, itemHeight: 10 },
    series: [{
      name: '拦截类型',
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['50%', '40%'],
      itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
      label: { show: false, position: 'center' },
      emphasis: { label: { show: true, fontSize: 18, fontWeight: 'bold' } },
      labelLine: { show: false },
      data: data.riskTypePie,
    }],
  };

  const ranking = [...data.highRiskApiRanking].reverse();
  const barOption: EChartsOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'value' },
    yAxis: { type: 'category', data: ranking.map((item) => item.api) },
    series: [{
      name: '触发次数',
      type: 'bar',
      barWidth: '50%',
      itemStyle: { color: '#1890ff', borderRadius: [0, 4, 4, 0] },
      data: ranking.map((item) => item.count),
    }],
  };

  requestAnimationFrame(() => {
    lineChart?.resize();
    pieChart?.resize();
    barChart?.resize();
    lineChart?.setOption(lineOption, true);
    pieChart?.setOption(pieOption, true);
    barChart?.setOption(barOption, true);
  });
};

const resizeCharts = () => {
  lineChart?.resize();
  pieChart?.resize();
  barChart?.resize();
};

const disposeCharts = () => {
  lineChart?.dispose();
  pieChart?.dispose();
  barChart?.dispose();
  lineChart = null;
  pieChart = null;
  barChart = null;
};

const maskUserId = (userId: number) => {
  const text = String(userId);
  if (text.length <= 4) return text;
  return `${text.slice(0, 3)}***${text.slice(-2)}`;
};

const tagClass = (type: string) => {
  if (type.includes('AI')) return 'tag-red';
  if (type.includes('敏感词')) return 'tag-orange';
  if (type.includes('预约')) return 'tag-purple';
  return 'tag-blue';
};

watch(stats, () => {
  nextTick(renderCharts);
});

onMounted(() => {
  window.addEventListener('resize', resizeCharts);
  if (adminToken.value) loadStats();
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCharts);
  disposeCharts();
});
</script>

<style scoped>
.app-container { display: flex; height: 100vh; min-width: 1180px; overflow: hidden; }
.sidebar { width: 256px; flex-shrink: 0; background: #001529; color: #fff; display: flex; flex-direction: column; }
.logo { height: 64px; line-height: 64px; text-align: center; font-size: 18px; font-weight: 700; letter-spacing: 1px; border-bottom: 1px solid #1e2c3c; background: #002140; }
.menu { list-style: none; padding: 0; margin: 0; }
.menu li { padding: 15px 24px; color: #a6adb4; font-size: 14px; cursor: pointer; user-select: none; }
.menu li:hover { color: #fff; background: #0b2238; }
.menu li.active { background: #1890ff; color: #fff; }
.main { flex: 1; display: flex; flex-direction: column; overflow-y: auto; background: #f0f2f5; }
.header { height: 64px; background: #fff; box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08); display: flex; align-items: center; padding: 0 24px; justify-content: space-between; z-index: 10; }
.breadcrumb { color: #8c8c8c; font-size: 14px; }
.user-info { display: flex; align-items: center; gap: 10px; font-size: 14px; }
.avatar { width: 32px; height: 32px; border-radius: 50%; background: #1890ff; color: #fff; text-align: center; line-height: 32px; }
.status-dot { width: 8px; height: 8px; border-radius: 50%; background: #52c41a; }
.status-dot.fallback { background: #faad14; }
.content { padding: 24px; display: flex; flex-direction: column; gap: 24px; }
.access-panel { flex: 1; display: flex; align-items: center; justify-content: center; padding: 24px; }
.access-card { width: 520px; background: #fff; border-radius: 8px; padding: 32px; box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08); }
.access-card h1, .toolbar h1 { margin: 0 0 8px; color: #262626; font-size: 22px; }
.access-card p, .toolbar p { margin: 0; color: #8c8c8c; font-size: 14px; }
.form-input { width: 100%; height: 42px; margin-top: 16px; border: 1px solid #d9d9d9; border-radius: 6px; padding: 0 12px; outline: none; box-sizing: border-box; }
.form-input:focus { border-color: #1890ff; }
.login-error { margin-top: 12px; color: #cf1322; font-size: 13px; }
.primary-btn, .text-btn { border: none; cursor: pointer; }
.primary-btn { height: 38px; padding: 0 18px; color: #fff; background: #1890ff; border-radius: 6px; }
.primary-btn.full { width: 100%; margin-top: 18px; }
.primary-btn:disabled { cursor: not-allowed; opacity: 0.65; }
.text-btn { color: #1890ff; background: transparent; }
.toolbar, .alert { background: #fff; border-radius: 8px; padding: 20px; box-shadow: 0 1px 2px -2px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.08); }
.toolbar { display: flex; align-items: center; justify-content: space-between; }
.alert { display: flex; align-items: center; justify-content: space-between; color: #ad6800; background: #fffbe6; border: 1px solid #ffe58f; }
.alert.danger { color: #a8071a; background: #fff1f0; border-color: #ffa39e; }
.stat-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; }
.stat-card, .chart-card, .rule-card { background: #fff; border-radius: 8px; padding: 20px; box-shadow: 0 1px 2px -2px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.08); }
.stat-title { color: #8c8c8c; font-size: 14px; margin-bottom: 8px; }
.stat-value { color: #262626; font-size: 30px; font-weight: 500; }
.stat-value.success { color: #3f8600; }
.stat-footer { margin-top: 10px; padding-top: 10px; border-top: 1px solid #f0f0f0; font-size: 12px; color: #8c8c8c; }
.chart-row { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; }
.chart-row-half { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.chart-card-title { font-size: 16px; font-weight: 500; margin: 0 0 20px; padding-bottom: 15px; border-bottom: 1px solid #f0f0f0; }
.chart-container { height: 300px; width: 100%; }
.log-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
.log-table.wide { table-layout: fixed; }
.log-table th { background: #fafafa; padding: 12px; border-bottom: 1px solid #f0f0f0; font-weight: 500; color: #262626; }
.log-table td { padding: 12px; border-bottom: 1px solid #f0f0f0; color: #595959; vertical-align: top; word-break: break-word; }
.empty-cell { text-align: center; color: #8c8c8c; }
.tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; white-space: nowrap; }
.tag-red { background: #fff1f0; color: #cf1322; border: 1px solid #ffa39e; }
.tag-orange { background: #fff7e6; color: #d46b08; border: 1px solid #ffd591; }
.tag-blue { background: #e6f7ff; color: #096dd9; border: 1px solid #91d5ff; }
.tag-purple { background: #f9f0ff; color: #722ed1; border: 1px solid #d3adf7; }
.rule-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
.rule-word { color: #262626; font-size: 22px; font-weight: 600; margin-bottom: 12px; }
.rule-meta { display: flex; gap: 8px; margin-bottom: 12px; }
.rule-card p { margin: 0; color: #595959; font-size: 14px; line-height: 1.7; }
</style>
