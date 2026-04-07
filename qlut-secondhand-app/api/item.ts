import { request, BASE_URL } from '../utils/request';

// 物品状态: 'OnSale'-待售, 'Pending'-交接中, 'Completed'-已完成
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
export const getItems = (params: { page: number; size: number; status?: ItemStatus }) => {
  return request<{ items: Item[], total: number }>('/items', 'GET', params);
};

/**
 * 获取单个物品详情
 */
export const getItemDetail = (id: number) => {
  return request<Item>(`/items/${id}`, 'GET');
};

/**
 * 发布闲置物品 (Create New Item)
 */
export const createItem = (data: { title: string; content: string; price: number; images: string[] }) => {
  return request('/items', 'POST', data);
};

/**
 * 发起预约 (Handover Appointment)
 */
export const createAppointment = (itemId: number) => {
  return request('/appointments', 'POST', { item_id: itemId });
};

/**
 * 单图上传
 * 采用原生 uni.uploadFile 并封装 Promise
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
          const res = JSON.parse(uploadFileRes.data);
          if (res.code === 200) {
            // 返回服务端成功提供的图片地址
            resolve(res.data.url || res.data);
          } else {
            uni.showToast({ title: res.msg || '单图上传失败', icon: 'none' });
            reject(new Error(res.msg));
          }
        } catch (e) {
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
