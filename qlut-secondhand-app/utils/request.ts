import { API_BASE_URL } from '../config';

export const BASE_URL = API_BASE_URL;

export interface HttpResponse<T = any> {
  code: number;
  msg: string;
  data: T;
}

export interface RequestError extends Error {
  code?: number;
  msg?: string;
}

const getErrorToastMessage = (code: number, url: string, msg?: string) => {
  switch (code) {
    case 401:
      return '登录状态已失效，请重新登录';
    case 403:
      return msg || (url === '/auth/login' ? '账号已锁定' : '无权操作');
    case 400:
      return msg || '请求失败';
    case 429:
      return msg || '操作太快了，请稍后再试';
    case 500:
      return msg || '服务器开小差了，请稍后重试';
    default:
      return msg || '请求失败';
  }
};

const createRequestError = (code: number, msg: string): RequestError => {
  const error = new Error(msg) as RequestError;
  error.code = code;
  error.msg = msg;
  return error;
};

/**
 * 封装 uni.request
 * 自动注入 token，并按统一响应格式处理错误
 */
export const request = <T = any>(
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  data?: any,
  header: any = {}
): Promise<HttpResponse<T>> => {
  return new Promise((resolve, reject) => {
    const token = uni.getStorageSync('token');
    if (token) {
      header.Authorization = `Bearer ${token}`;
    }

    uni.request({
      url: `${BASE_URL}${url}`,
      method,
      data,
      header,
      timeout: 10000,
      success: (res: any) => {
        const responseData = res.data as HttpResponse<T>;
        const responseCode = Number(responseData.code || res.statusCode || 500);
        const responseMsg = (responseData as any)?.msg || (responseData as any)?.message || '';
        const toastMessage = getErrorToastMessage(responseCode, url, responseMsg);

        if (responseCode === 200 || responseCode === 201) {
          resolve(responseData);
          return;
        }

        if (responseCode === 401) {
          // Token 无效或过期，清理登录态并跳回登录页
          uni.removeStorageSync('token');
          uni.showToast({ title: toastMessage, icon: 'none' });
          setTimeout(() => {
            uni.reLaunch({ url: '/pages/auth/login' });
          }, 1500);
          reject(createRequestError(401, toastMessage));
          return;
        }

        uni.showToast({ title: toastMessage, icon: 'none' });
        reject(createRequestError(responseCode, toastMessage));
      },
      fail: (err) => {
        uni.showToast({ title: '网络通信错误', icon: 'none' });
        reject(err);
      }
    });
  });
};
