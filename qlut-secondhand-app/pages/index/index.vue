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
          :key="item.id || (item as any).ID" 
          @click="goToDetail(item.id || (item as any).ID)"
        >
          <!-- 图片展示: 兼容相对路径与外部链接 -->
          <image :src="getCoverImage(item.images || (item as any).Images)" mode="aspectFill" class="item-img" />
          
          <!-- 信息展示: 容错大写字段 -->
          <view class="item-info">
            <text class="item-title">{{ item.title || (item as any).Title || '未命名物品' }}</text>
            <text class="item-price">￥{{ item.price || (item as any).Price || '0.00' }}</text>
            <text class="item-status" v-if="item.status === 'Pending' || (item as any).Status === 'Pending'">预约交接中</text>
          </view>
        </view>
      </view>
      
      <!-- 底部 Tabbar -->
      <custom-tabbar active="index" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { getItems, type Item } from '../../api/item';
import { BASE_URL } from '../../utils/request';
import CustomTabbar from '../../components/custom-tabbar.vue';

const serverUrl = BASE_URL.replace('/api/v1', '');
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
    // 状态 'OnSale' 代表待售
    const res = await getItems({ page: page.value, size: size.value, status: 'OnSale' });
    
    // 兼容可能不同的返回结构包裹
    let newItems = [];
    const responseData = res.data as any;
    if (Array.isArray(responseData)) {
      newItems = responseData;
    } else if (responseData && Array.isArray(responseData.items)) {
      newItems = responseData.items;
    } else if (responseData && responseData.data && Array.isArray(responseData.data)) {
      newItems = responseData.data;
    }
    
    if (isRefresh) {
      items.value = newItems;
    } else {
      items.value.push(...newItems);
    }
    
    // Debug 检查数据层级
    if (items.value.length > 0) {
      console.log('【首页渲染数据检查】:', JSON.stringify(items.value[0]));
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
        { id: 1, publisher_id: 101, title: '九成新高数课本，笔记清晰', content: '保护得很好', price: 15.0, images: [''], status: 'OnSale' },
        { id: 2, publisher_id: 102, title: '全新未拆封蓝牙耳机', content: '未拆封', price: 80.0, images: [''], status: 'Pending' },
        { id: 3, publisher_id: 103, title: '考研政治核心考案', content: '附赠资料', price: 30.0, images: [''], status: 'OnSale' }
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

// 解析图片地址：健壮地处理 JSON 字符串
const getCoverImage = (imagesStr: any) => {
  if (!imagesStr) return '/static/default.png';
  
  let imgList: string[] = [];
  try {
    if (Array.isArray(imagesStr)) {
      imgList = imagesStr;
    } else if (typeof imagesStr === 'string') {
      if (imagesStr.trim().startsWith('[')) {
        imgList = JSON.parse(imagesStr);
      } else {
        imgList = [imagesStr];
      }
    }
  } catch (e) {
    console.error('Image JSON parse error:', e);
    imgList = typeof imagesStr === 'string' ? [imagesStr] : [];
  }

  if (!imgList || imgList.length === 0 || !imgList[0]) {
    return '/static/default.png';
  }
  
  const first = imgList[0].replace(/"/g, ''); // 移除可能残留的引号
  return first.startsWith('http') ? first : serverUrl + first;
};

onMounted(() => {
  fetchItems(true);
});

onShow(() => {
  uni.hideTabBar();
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
