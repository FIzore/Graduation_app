import type { ApiResponse, DashboardError, DashboardStats } from '../types/dashboard';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080/api/v1';

const normalizeStats = (raw?: Partial<DashboardStats>): DashboardStats => {
  return {
    todayInterceptCount: Number(raw?.todayInterceptCount || 0),
    riskTypePie: Array.isArray(raw?.riskTypePie) ? raw.riskTypePie : [],
    highRiskApiRanking: Array.isArray(raw?.highRiskApiRanking) ? raw.highRiskApiRanking : [],
    attackTrendLine: {
      xAxis: Array.isArray(raw?.attackTrendLine?.xAxis)
        ? raw.attackTrendLine.xAxis
        : ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'],
      series: Array.isArray(raw?.attackTrendLine?.series)
        ? raw.attackTrendLine.series
        : [0, 0, 0, 0, 0, 0, 0],
    },
    recentRiskLogs: Array.isArray(raw?.recentRiskLogs) ? raw.recentRiskLogs : [],
  };
};

const createDashboardError = (code: number, message: string): DashboardError => {
  const error = new Error(message) as DashboardError;
  error.code = code;
  return error;
};

export const fetchDashboardStats = async (token: string): Promise<DashboardStats> => {
  const res = await fetch(`${API_BASE_URL}/admin/dashboard/stats`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  let body: ApiResponse<DashboardStats> | undefined;
  try {
    body = await res.json();
  } catch {
    body = undefined;
  }

  const code = Number(body?.code || res.status || 500);
  if (code === 200) {
    return normalizeStats(body?.data);
  }

  throw createDashboardError(code, body?.msg || '管理大屏数据获取失败');
};
