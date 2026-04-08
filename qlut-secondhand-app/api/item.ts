import { request, BASE_URL } from '../utils/request';

// 物品状态
export type ItemStatus = 'OnSale' | 'Pending' | 'Completed';

export interface Item {
  id: number;
  publisher_id: number;
  title: string;
  content: string;
  price: number;
  images: string[];
  status: ItemStatus;
  created_at?: string;
}

/**
 * 分页获取物品列表
 */
export const getItems = (params: { page: number; pageSize: number; status?: ItemStatus }) => {
  return request<{ items: Item[]; total: number }>('/items', 'GET', params);
};

/**
 * 获取单个物品详情
 */
export const getItemDetail = (id: number) => {
  return request<Item>(`/items/${id}`, 'GET');
};

/**
 * 发布闲置物品
 */
export const createItem = (data: { title: string; content: string; price: number; images: string[] }) => {
  return request('/items', 'POST', data);
};

/**
 * 发起预约交接
 */
export const createAppointment = (itemId: number) => {
  return request('/appointments', 'POST', { item_id: itemId });
};

/**
 * 获取我的预约记录（包含买卖双方身份）
 */
export const getMyAppointments = () => {
  return request<any[]>('/user/appointments', 'GET');
};

/**
 * 单图上传
 * 使用原生 uni.uploadFile，并封装为 Promise
 */
export const uploadImage = (filePath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const token = uni.getStorageSync('token');
    uni.uploadFile({
      url: `${BASE_URL}/upload`,
      filePath,
      name: 'file',
      header: {
        Authorization: `Bearer ${token}`
      },
      success: (uploadFileRes) => {
        try {
          const res = typeof uploadFileRes.data === 'string'
            ? JSON.parse(uploadFileRes.data)
            : uploadFileRes.data;

          if (res.code === 200) {
            const url = res.data?.url || res.data;
            resolve(url);
          } else {
            uni.showToast({ title: res.msg || '图片上传失败', icon: 'none' });
            reject(new Error(res.msg));
          }
        } catch (e) {
          console.error('解析上传响应失败', e);
          reject(e);
        }
      },
      fail: (err) => {
        uni.showToast({ title: '网络上传异常', icon: 'none' });
        reject(err);
      }
    });
  });
};
