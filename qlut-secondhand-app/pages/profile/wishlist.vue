<template>
  <view class="container">
    <view class="header" :style="{ paddingTop: navMetrics.paddingTop + 'px', paddingRight: navMetrics.paddingRight + 'px' }">
      <view class="back-box" @click="goBack">
        <uni-icons type="back" size="24" color="#333"></uni-icons>
      </view>
      <text class="title">我想要的</text>
      <view class="placeholder"></view>
    </view>

    <scroll-view
      class="content"
      scroll-y
      refresher-enabled
      :refresher-triggered="refresherTriggered"
      @refresherrefresh="onRefresh"
      @refresherrestore="onRestore"
    >
      <view v-if="wishlistItems.length > 0" class="list-wrapper">
        <view
          class="item-card"
          v-for="item in wishlistItems"
          :key="item.id"
          @click="goToDetail(item.id)"
        >
          <image class="card-img" :src="getItemCover(item)" mode="aspectFill"></image>
          <view class="card-info">
            <text class="card-title">{{ item.title || '未命名物品' }}</text>
            <view class="card-bottom">
              <text class="card-price">¥ {{ item.price || '0.00' }}</text>
              <text class="card-status" :class="'status-' + item.status">
                {{ formatStatus(item.status) }}
              </text>
            </view>
          </view>
        </view>
      </view>

      <view v-if="wishlistItems.length === 0" class="empty-state">
        <image src="/static/empty.png" mode="aspectFit" class="empty-img"></image>
        <text class="empty-text">暂无想要的物品</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { getFirstImageUrl } from '../../utils/image';
import { getCustomNavMetrics } from '../../utils/navigation';

interface WishlistItem {
  id: number;
  title: string;
  price: number | string;
  images: unknown;
  status?: string;
}

const navMetrics = getCustomNavMetrics();
const wishlistItems = ref<WishlistItem[]>([]);
const refresherTriggered = ref(false);

const goBack = () => {
  uni.navigateBack();
};

const goToDetail = (id: number | string | undefined) => {
  if (!id) return;
  uni.navigateTo({ url: `/pages/item/detail?id=${id}` });
};

const getItemCover = (item: WishlistItem) => {
  return getFirstImageUrl(item.images);
};

const formatStatus = (status: string | undefined) => {
  const s = String(status || '').toLowerCase();
  if (s === 'onsale') return '在售';
  if (s === 'pending') return '锁定中';
  if (s === 'completed') return '已交接';
  return '已收藏';
};

const loadWishlist = () => {
  try {
    const storageInfo = uni.getStorageInfoSync();
    const items = storageInfo.keys
      .filter((key) => key.startsWith('fav_'))
      .map((key) => {
        const id = Number(key.replace('fav_', ''));
        const raw = uni.getStorageSync(key);
        if (typeof raw === 'string' && raw.startsWith('{')) {
          try {
            const parsed = JSON.parse(raw);
            return {
              id: Number(parsed?.id || id),
              title: String(parsed?.title || '已收藏物品'),
              price: parsed?.price ?? '0.00',
              images: parsed?.images || [],
              status: parsed?.status,
            };
          } catch {
            return { id, title: '已收藏物品', price: '0.00', images: [] };
          }
        }
        return { id, title: '已收藏物品', price: '0.00', images: [] };
      })
      .filter((item) => item.id > 0);

    wishlistItems.value = items;
  } catch {
    wishlistItems.value = [];
  } finally {
    refresherTriggered.value = false;
    uni.stopPullDownRefresh();
  }
};

const onRefresh = () => {
  refresherTriggered.value = true;
  loadWishlist();
};

const onRestore = () => {
  refresherTriggered.value = false;
};

onShow(() => {
  loadWishlist();
});
</script>

<style lang="scss" scoped>
.container {
  height: 100vh;
  background-color: #f7f8fa;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 30rpx 20rpx;
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
  flex: 1;
  min-height: 0;
  padding: 20rpx;
  box-sizing: border-box;
}

.item-card {
  display: flex;
  background-color: #fff;
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
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
