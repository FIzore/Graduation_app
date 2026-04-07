import { request } from '../utils/request';

/**
 * 登录鉴权接口
 */
export const login = (data: { student_id: string; password: string }) => {
  console.log('Sending Auth Params (Login):', data);
  return request<{ token: string; user: any }>('/auth/login', 'POST', data);
};

/**
 * 用户注册接口
 */
export const register = (data: { student_id: string; password: string }) => {
  console.log('Sending Auth Params (Register):', data);
  return request('/auth/register', 'POST', data);
};

/**
 * 微信账号绑定接口 (预留)
 */
export const bindWeChat = (code: string) => {
  return request('/auth/bind-wechat', 'POST', { code });
};
