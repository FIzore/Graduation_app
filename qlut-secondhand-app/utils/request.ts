export const BASE_URL = 'http://127.0.0.1:8080/api/v1';

export interface HttpResponse<T = any> {
  code: number;
  msg: string;
  data: T;
}

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

        if (responseData.code === 200) {
          resolve(responseData);
          return;
        }

        if (responseData.code === 401) {
          // Token 无效或过期，清理登录态并跳回登录页
          uni.removeStorageSync('token');
          uni.showToast({ title: '认证过期，请重新登录', icon: 'none' });
          setTimeout(() => {
            uni.reLaunch({ url: '/pages/auth/login' });
          }, 1500);
          reject(new Error(responseData.msg || 'Unauthorized'));
          return;
        }

        uni.showToast({ title: responseData.msg || '请求失败', icon: 'none' });
        reject(new Error(responseData.msg || 'Request failed'));
      },
      fail: (err) => {
        uni.showToast({ title: '网络通信错误', icon: 'none' });
        reject(err);
      }
    });
  });
};
