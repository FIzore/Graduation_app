export const BASE_URL = 'http://127.0.0.1:8080/api/v1';

export interface HttpResponse<T = any> {
  code: number;
  msg: string;
  data: T;
}

/**
 * 封装 uni.request
 * 自动拦截 token 并按规范处理响应
 */
export const request = <T = any>(
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  data?: any,
  header: any = {}
): Promise<HttpResponse<T>> => {
  return new Promise((resolve, reject) => {
    // 自动携带 token
    const token = uni.getStorageSync('token');
    if (token) {
      header['Authorization'] = `Bearer ${token}`;
    }

    uni.request({
      url: `${BASE_URL}${url}`,
      method,
      data,
      header,
      success: (res: any) => {
        const responseData = res.data as HttpResponse<T>;
        
        if (responseData.code === 200) {
          resolve(responseData);
        } else if (responseData.code === 401) {
          // 状态401：Token 无效或过期，清理并返回登录
          uni.removeStorageSync('token');
          uni.showToast({ title: '认证过期，请重新登录', icon: 'none' });
          setTimeout(() => {
            // 假设登录页使用 uni.reLaunch 重定向
            uni.reLaunch({ url: '/pages/login/login' });
          }, 1500);
          reject(new Error(responseData.msg || 'Unauthorized'));
        } else {
          // 其他业务错误
          uni.showToast({ title: responseData.msg || '交互失败', icon: 'none' });
          reject(new Error(responseData.msg || 'Request failed'));
        }
      },
      fail: (err) => {
        uni.showToast({ title: '网络通信错误', icon: 'none' });
        reject(err);
      }
    });
  });
};
