import type { ApiResponse, DashboardError, DashboardStats, RiskEventItem, SensitiveRuleItem } from '../types/dashboard';

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

const parseBody = async <T>(res: Response): Promise<ApiResponse<T> | undefined> => {
  try {
    return await res.json();
  } catch {
    return undefined;
  }
};

export const loginAdmin = async (studentId: string, password: string): Promise<string> => {
  const res = await fetch(`${API_BASE_URL}/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId, password }),
  });

  const body = await parseBody<{ token?: string }>(res);
  const code = Number(body?.code || res.status || 500);
  const token = body?.data?.token;
  if (code === 200 && token) return token;
  throw createDashboardError(code, body?.msg || '管理员登录失败');
};

export const fetchDashboardStats = async (token: string): Promise<DashboardStats> => {
  const res = await fetch(`${API_BASE_URL}/admin/dashboard/stats`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

  const body = await parseBody<DashboardStats>(res);
  const code = Number(body?.code || res.status || 500);
  if (code === 200) return normalizeStats(body?.data);
  throw createDashboardError(code, body?.msg || '管理大屏数据获取失败');
};

export const fetchRiskEvents = async (token: string): Promise<RiskEventItem[]> => {
  const res = await fetch(`${API_BASE_URL}/admin/risk-events?limit=100`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

  const body = await parseBody<{ items?: RiskEventItem[] }>(res);
  const code = Number(body?.code || res.status || 500);
  if (code === 200) return Array.isArray(body?.data?.items) ? body.data.items : [];
  throw createDashboardError(code, body?.msg || '拦截记录获取失败');
};

export const fetchSensitiveRules = async (token: string): Promise<SensitiveRuleItem[]> => {
  const res = await fetch(`${API_BASE_URL}/admin/sensitive-rules`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

  const body = await parseBody<{ items?: SensitiveRuleItem[] }>(res);
  const code = Number(body?.code || res.status || 500);
  if (code === 200) return Array.isArray(body?.data?.items) ? body.data.items : [];
  throw createDashboardError(code, body?.msg || '敏感词规则获取失败');
};
