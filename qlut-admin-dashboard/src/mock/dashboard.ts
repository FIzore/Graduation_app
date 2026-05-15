import type { DashboardStats } from '../types/dashboard';

export const fallbackStats: DashboardStats = {
  todayInterceptCount: 186,
  riskTypePie: [
    { name: '敏感词匹配', value: 85 },
    { name: 'AI视觉高风险', value: 48 },
    { name: '发布限频防刷', value: 32 },
    { name: '预约并发超卖', value: 21 },
  ],
  highRiskApiRanking: [
    { api: 'POST /items', count: 133 },
    { api: 'POST /appointments', count: 21 },
    { api: 'POST /auth/login', count: 18 },
    { api: 'POST /upload', count: 9 },
    { api: 'GET /chat/history', count: 5 },
  ],
  attackTrendLine: {
    xAxis: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'],
    series: [12, 5, 45, 89, 56, 120, 30],
  },
  recentRiskLogs: [
    { time: '14:23:05', userId: 20210012, type: 'AI视觉高风险', action: '阻断发布' },
    { time: '14:15:32', userId: 20220045, type: '敏感词匹配', action: '阻断发布' },
    { time: '14:02:11', userId: 20230089, type: '发布限频防刷', action: '限流重试' },
    { time: '13:45:22', userId: 20210066, type: '敏感词匹配', action: '阻断发布' },
    { time: '13:10:05', userId: 20240001, type: '预约并发超卖', action: '限流重试' },
  ],
};
