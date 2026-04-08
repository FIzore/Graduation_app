<template>
  <view class="container">
    <view class="header">
      <view class="back-box" @click="goBack">
        <uni-icons type="back" size="24" color="#333"></uni-icons>
      </view>
      <text class="title">我的个人发布</text>
      <view class="placeholder"></view>
    </view>

    <view class="content">
      <view v-if="publishedItems.length > 0" class="list-wrapper">
        <view
          class="item-card"
          v-for="(item, idx) in publishedItems"
          :key="idx"
          @click="goToDetail(item.ID || item.id)"
        >
          <image class="card-img" :src="getItemCover(item)" mode="aspectFill"></image>
          <view class="card-info">
            <text class="card-title">{{ item.Title || item.title }}</text>
            <view class="card-bottom">
              <text class="card-price">¥ {{ item.Price || item.price }}</text>
              <text class="card-status" :class="'status-' + (item.Status || item.status)">
                {{ formatStatus(item.Status || item.status) }}
              </text>
            </view>
          </view>
        </view>
      </view>

      <view v-if="publishedItems.length === 0" class="empty-state">
        <image src="/static/empty.png" mode="aspectFit" class="empty-img"></image>
        <text class="empty-text">暂无发布的物品</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { getItems } from '../../api/item';
import { BASE_URL } from '../../utils/request';

const API_HOST = 'http://127.0.0.1:8080';
const SERVER_ROOT = (BASE_URL || `${API_HOST}/api/v1`).replace('/api/v1', '');

const goBack = () => {
  uni.navigateBack();
};

const goToDetail = (id: number | string | undefined) => {
  if (!id) return;
  uni.navigateTo({ url: `/pages/item/detail?id=${id}` });
};

const publishedItems = ref<any[]>([]);
const loading = ref(false);

const decodeBase64Url = (input: string): string => {
  try {
    const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
    const pad = '='.repeat((4 - (base64.length % 4)) % 4);
    const normalized = base64 + pad;
    if (typeof atob === 'function') {
      return atob(normalized);
    }
    const arr = uni.base64ToArrayBuffer(normalized);
    return new TextDecoder().decode(arr);
  } catch {
    return '';
  }
};

const getUserIdFromToken = (): string => {
  const token = uni.getStorageSync('token');
  if (!token || typeof token !== 'string') return '';
  const parts = token.split('.');
  if (parts.length < 2) return '';

  try {
    const payload = decodeBase64Url(parts[1]);
    const data = JSON.parse(payload);
    return String(data.user_id || data.id || data.uid || data.sub || '');
  } catch {
    return '';
  }
};

const formatImage = (url?: string) => {
  if (!url) return '/static/default.png';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/uploads')) return `${API_HOST}${url}`;
  if (url.startsWith('/')) return `${SERVER_ROOT}${url}`;
  return `${SERVER_ROOT}/${url}`;
};

const parseImages = (raw: any): string[] => {
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === 'string') {
    const text = raw.trim();
    if (!text) return [];
    if (text.startsWith('[')) {
      try {
        const parsed = JSON.parse(text);
        return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
      } catch (e) {
        console.error('解析图片数组失败:', e);
        return [];
      }
    }
    return [text];
  }
  return [];
};

const getItemCover = (item: any) => {
  const images = parseImages(item.Images ?? item.images);
  return formatImage(images[0]);
};

const formatStatus = (status: number | string | undefined) => {
  const s = String(status || '').toLowerCase();
  if (s === '1' || s === 'onsale') return '在售';
  if (s === '2' || s === 'pending') return '锁定中';
  if (s === '3' || s === 'completed') return '已交接';
  return '未知';
};

const extractItems = (raw: any): any[] => {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.items)) return raw.items;
  if (Array.isArray(raw?.list)) return raw.list;
  if (Array.isArray(raw?.data)) return raw.data;
  return [];
};

const loadPublishedItems = async () => {
  loading.value = true;
  try {
    const storedInfo = uni.getStorageSync('userInfo');
    let currentUserId = '';
    if (storedInfo) {
      const userInfo = typeof storedInfo === 'string' ? JSON.parse(storedInfo) : storedInfo;
      currentUserId = String(userInfo.ID || userInfo.id || '');
    }
    if (!currentUserId) {
      currentUserId = getUserIdFromToken();
    }

    if (!currentUserId) {
      publishedItems.value = [];
      return;
    }

    const itemsRes = await getItems({ page: 1, pageSize: 500 } as any).catch(() => ({ data: [] as any }));
    const allItems = extractItems(itemsRes.data);

    publishedItems.value = allItems.filter((item: any) => {
      const isMine = String(item.PublisherID || item.publisher_id) === currentUserId;
      return isMine;
    });
  } catch (e) {
    console.error('加载发布物品失败', e);
    publishedItems.value = [];
  } finally {
    loading.value = false;
  }
};

onShow(() => {
  loadPublishedItems();
});
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  background-color: #f7f8fa;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(var(--status-bar-height) + 20rpx) 30rpx 20rpx;
  background-color: #fff;
  border-bottom: 1rpx solid #eee;

  .back-box {
    width: 60rpx;
    height: 60rpx;
    display: flex;
    align-items: center;
  }

  .title {
    font-size: 32rpx;
    font-weight: bold;
    color: #333;
  }

  .placeholder {
    width: 60rpx;
  }
}

.content {
  padding: 20rpx;
}

.list-wrapper {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.item-card {
  display: flex;
  background-color: #fff;
  border-radius: 16rpx;
  padding: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);

  .card-img {
    width: 200rpx;
    height: 200rpx;
    border-radius: 12rpx;
    object-fit: cover;
    flex-shrink: 0;
  }

  .card-info {
    flex: 1;
    margin-left: 20rpx;
    display: flex;
    flex-direction: column;
    justify-content: space-between;

    .card-title {
      font-size: 30rpx;
      color: #333;
      font-weight: bold;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      overflow: hidden;
    }

    .card-bottom {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;

      .card-price {
        color: #ff4d4f;
        font-size: 36rpx;
        font-weight: bold;
      }

      .card-status {
        font-size: 24rpx;
        padding: 4rpx 12rpx;
        border-radius: 8rpx;
        background-color: #f0f0f0;
        color: #666;

        &.status-1,
        &.status-OnSale {
          background-color: #e6f7ff;
          color: #1890ff;
        }

        &.status-2,
        &.status-Pending {
          background-color: #fff7e6;
          color: #fa8c16;
        }

        &.status-3,
        &.status-Completed {
          background-color: #f6ffed;
          color: #52c41a;
        }
      }
    }
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 200rpx;

  .empty-img {
    width: 300rpx;
    height: 300rpx;
    opacity: 0.5;
  }

  .empty-text {
    margin-top: 40rpx;
    font-size: 28rpx;
    color: #999;
  }
}
</style>

