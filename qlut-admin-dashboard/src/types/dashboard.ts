export interface RiskTypeItem {
  name: string;
  value: number;
}

export interface HighRiskApiItem {
  api: string;
  count: number;
}

export interface AttackTrendLine {
  xAxis: string[];
  series: number[];
}

export interface RiskLogItem {
  time: string;
  userId: number;
  type: string;
  action: string;
}

export interface DashboardStats {
  todayInterceptCount: number;
  riskTypePie: RiskTypeItem[];
  highRiskApiRanking: HighRiskApiItem[];
  attackTrendLine: AttackTrendLine;
  recentRiskLogs: RiskLogItem[];
}

export interface ApiResponse<T> {
  code: number;
  msg: string;
  data?: T;
}

export interface DashboardError extends Error {
  code?: number;
}
