import { request } from '../utils/request';

/**
 * 登录鉴权接口
 */
export const login = (data: { student_id: string; password_hash: string }) => {
  return request('/auth/login', 'POST', data);
};
