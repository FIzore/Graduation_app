<template>
  <view class="container">
    <view class="header" :style="{ paddingTop: navMetrics.paddingTop + 'px', paddingRight: navMetrics.paddingRight + 'px' }">
      <view class="back-box" @click="goBack">
        <uni-icons type="back" size="24" color="#333"></uni-icons>
      </view>
      <text class="title">我的个人发布</text>
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
      <view v-if="publishedItems.length > 0" class="list-wrapper">
        <view
          class="item-card"
          v-for="(item, idx) in publishedItems"
          :key="idx"
        >
          <view class="card-main" @click="goToDetail(item.id)">
          <image class="card-img" :src="getItemCover(item)" mode="aspectFill"></image>
          <view class="card-info">
            <text class="card-title">{{ item.title }}</text>
            <view class="card-bottom">
              <text class="card-price">¥ {{ item.price }}</text>
              <text class="card-status" :class="'status-' + item.status">
                {{ formatStatus(item.status) }}
              </text>
            </view>
          </view>
          </view>
          <view class="card-actions">
            <button class="edit-btn" @click.stop="goToEdit(item)">编辑</button>
            <button class="delete-btn" @click.stop="handleDelete(item)">删除</button>
          </view>
        </view>
      </view>

      <view v-if="publishedItems.length === 0" class="empty-state">
        <image src="/static/empty.png" mode="aspectFit" class="empty-img"></image>
        <text class="empty-text">暂无发布的物品</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { deleteItem, getMyItems, type Item, type UserItemListResponse } from '../../api/item';
import { getFirstImageUrl } from '../../utils/image';
import { getCustomNavMetrics } from '../../utils/navigation';

const navMetrics = getCustomNavMetrics();

const goBack = () => {
  uni.navigateBack();
};

const goToDetail = (id: number | string | undefined) => {
  if (!id) return;
  uni.navigateTo({ url: `/pages/item/detail?id=${id}` });
};

const publishedItems = ref<Item[]>([]);
const loading = ref(false);
const refresherTriggered = ref(false);

const getItemCover = (item: Item) => {
  return getFirstImageUrl(item.images);
};

const goToEdit = (item: Item) => {
  if (!item.id) return;
  uni.setStorageSync('editingItemDraft', item);
  uni.switchTab({ url: '/pages/item/post' });
};

const handleDelete = (item: Item) => {
  if (!item.id) return;
  uni.showModal({
    title: '删除物品',
    content: '确认删除这条发布？删除后将不再展示。',
    confirmColor: '#ff4d4f',
    success: async (res) => {
      if (!res.confirm) return;
      try {
        await deleteItem(item.id);
        uni.showToast({ title: '已删除', icon: 'none' });
        await loadPublishedItems();
      } catch (e) {
        console.error('删除发布失败', e);
      }
    },
  });
};

const formatStatus = (status: string | undefined) => {
  const s = String(status || '').toLowerCase();
  if (s === 'onsale') return '在售';
  if (s === 'pending') return '锁定中';
  if (s === 'completed') return '已交接';
  return '未知';
};

const extractItems = (raw: Item[] | UserItemListResponse | undefined): Item[] => {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.items)) return raw.items;
  if (Array.isArray(raw?.list)) return raw.list;
  if (Array.isArray(raw?.data)) return raw.data;
  return [];
};

const loadPublishedItems = async () => {
  loading.value = true;
  try {
    const itemsRes = await getMyItems().catch(() => ({ data: [] as Item[] }));
    publishedItems.value = extractItems(itemsRes.data);
  } catch (e) {
    console.error('加载发布物品失败', e);
    publishedItems.value = [];
  } finally {
    loading.value = false;
    refresherTriggered.value = false;
    uni.stopPullDownRefresh();
  }
};

const onRefresh = () => {
  refresherTriggered.value = true;
  loadPublishedItems();
};

const onRestore = () => {
  refresherTriggered.value = false;
};

onShow(() => {
  loadPublishedItems();
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

.list-wrapper {
  display: flex;
  flex-direction: column;
}

.item-card {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);

  .card-main {
    display: flex;
  }

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

  .card-actions {
    margin-top: 18rpx;
    display: flex;
    justify-content: flex-end;
    gap: 16rpx;

    button {
      margin: 0;
      padding: 0 28rpx;
      height: 56rpx;
      line-height: 56rpx;
      font-size: 24rpx;
      border-radius: 8rpx;
    }

    .edit-btn {
      background: #e6f7ff;
      color: #1890ff;
    }

    .delete-btn {
      background: #fff1f0;
      color: #cf1322;
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

