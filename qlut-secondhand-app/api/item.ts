import { request, BASE_URL } from '../utils/request';

// 物品状态码: 1-待售 (OnSale), 2-交接中 (Pending), 3-已完成 (Completed)
export interface Item {
  ID: number;
  PublisherID: number;
  Title: string;
  Content: string;
  Price: number;
  Images: string[];
  Status: 1 | 2 | 3;
}

/**
 * 分页获取物品列表
 */
export const getItems = (params: { page: number; size: number; status?: number }) => {
  return request<{ items: Item[], total: number }>('/items', 'GET', params);
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
