<template>
  <view class="container">
    <!-- 顶部搜索栏: 点击跳转搜索或者原地展开 -->
    <view class="search-bar">
      <text class="search-text">搜索自己想要的闲置物品...</text>
    </view>
    
    <!-- 物品瀑布流 -->
    <scroll-view 
      scroll-y 
      class="waterfall" 
      @scrolltolower="loadMore"
      refresher-enabled
      :refresher-triggered="isRefresherTriggered"
      @refresherrefresh="onRefresh"
    >
      <view class="grid">
        <view 
          class="item-card" 
          v-for="item in items" 
          :key="item.ID" 
          @click="goToDetail(item.ID)"
        >
          <!-- 图片展示 -->
          <image :src="item.Images[0] || '/static/default.png'" mode="aspectFill" class="item-img" />
          
          <!-- 信息展示 -->
          <view class="item-info">
            <text class="item-title">{{ item.Title }}</text>
            <text class="item-price">￥{{ item.Price }}</text>
            <text class="item-status" v-if="item.Status === 2">预约交接中</text>
          </view>
        </view>
      </view>
      
      <!-- 加载提示 -->
      <view class="loading" v-if="loading">加载中...</view>
      <view class="no-more" v-if="noMore">暂无更多物品信息</view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getItems, type Item } from '../../api/item';

const items = ref<Item[]>([]);
const page = ref(1);
const size = ref(10);
const loading = ref(false);
const noMore = ref(false);
const isRefresherTriggered = ref(false);

// 拉取列表数据 (Mock 与 API 双轨支持)
const fetchItems = async (isRefresh = false) => {
  if (loading.value || (noMore.value && !isRefresh)) return;
  
  loading.value = true;
  try {
    // 状态 1 代表 OnSale（待售）
    const res = await getItems({ page: page.value, size: size.value, status: 1 });
    
    // 兼容可能不同的返回结构包裹
    const newItems = res.data?.items || res.data || [];
    
    if (isRefresh) {
      items.value = newItems;
    } else {
      items.value.push(...newItems);
    }
    
    // 根据返回长度判断是否没有更多了
    if (!newItems || newItems.length < size.value) {
      noMore.value = true;
    }
  } catch (error) {
    console.error('获取物品失败, 切换到 Mock 数据', error);
    // [Mock 数据作为回退，方便 UI 演示与验证]
    if (items.value.length === 0) {
      items.value = [
        { ID: 1, PublisherID: 101, Title: '九成新高数课本，笔记清晰', Content: '保护得很好', Price: 15.0, Images: [''], Status: 1 },
        { ID: 2, PublisherID: 102, Title: '全新未拆封蓝牙耳机', Content: '未拆封', Price: 80.0, Images: [''], Status: 2 },
        { ID: 3, PublisherID: 103, Title: '考研政治核心考案', Content: '附赠资料', Price: 30.0, Images: [''], Status: 1 }
      ];
      noMore.value = true;
    }
  } finally {
    loading.value = false;
    isRefresherTriggered.value = false;
  }
};

const onRefresh = () => {
  isRefresherTriggered.value = true;
  page.value = 1;
  noMore.value = false;
  fetchItems(true);
};

const loadMore = () => {
  if (!noMore.value) {
    page.value += 1;
    fetchItems();
  }
};

const goToDetail = (id: number) => {
  if (!id) return;
  uni.navigateTo({
    url: `/pages/item/detail?id=${id}`
  });
};

onMounted(() => {
  fetchItems(true);
});
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f5f5;
}

.search-bar {
  padding: 20rpx;
  background-color: #ffffff;
  margin: 20rpx;
  border-radius: 40rpx;
  text-align: center;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.02);
}

.search-text {
  color: #999;
  font-size: 28rpx;
}

.waterfall {
  flex: 1;
  overflow: hidden;
  padding: 0 20rpx;
}

.grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
}

.item-card {
  width: 48%;
  background-color: #fff;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.item-img {
  width: 100%;
  height: 300rpx;
  background-color: #eee;
}

.item-info {
  padding: 16rpx;
}

.item-title {
  font-size: 28rpx;
  color: #333;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  line-height: 1.4;
  height: 78rpx;
}

.item-price {
  font-size: 32rpx;
  color: #ff4d4f;
  margin-top: 10rpx;
  display: block;
  font-weight: bold;
}

.item-status {
  font-size: 20rpx;
  color: #ee0a24;
  background: #fde2e2;
  padding: 4rpx 10rpx;
  border-radius: 8rpx;
  margin-top: 10rpx;
  display: inline-block;
}

.loading, .no-more {
  text-align: center;
  color: #999;
  font-size: 24rpx;
  padding: 20rpx 0;
}
</style>
