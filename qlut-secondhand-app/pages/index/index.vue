<template>
  <view class="container">
    <!-- 顶部搜索栏 -->
    <view class="search-bar" @click="goToSearch">
      <uni-icons type="search" size="18" color="#999"></uni-icons>
      <text class="search-text">搜索自己想要的闲置物品...</text>
    </view>

    <scroll-view
      class="category-tabs"
      scroll-x
      enhanced
      :show-scrollbar="false"
      :scroll-into-view="'tab-' + (activeCategory || 'all')"
    >
      <view class="tab-row">
        <view
          v-for="item in categoryTabs"
          :key="item.key"
          :id="'tab-' + item.key"
          class="tab-item"
          :class="{ active: activeCategory === item.key }"
          @click="selectCategory(item.key)"
        >
          <text class="tab-text">{{ item.label }}</text>
          <view class="tab-underline"></view>
        </view>
      </view>
    </scroll-view>
    
    <view class="waterfall-shell">
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
            <!-- 图片展示：兼容相对路径与外部链接 -->
            <image :src="getCoverImage(item.images || (item as any).Images)" mode="aspectFill" class="item-img" />
            
            <!-- 信息展示：兼容大小写字段 -->
            <view class="item-info">
              <text class="item-title">{{ item.title || (item as any).Title || '未命名物品' }}</text>
              <text class="item-price">¥{{ item.price || (item as any).Price || '0.00' }}</text>
              <text class="item-status" v-if="item.status === 'Pending' || (item as any).Status === 'Pending'">预约交接中</text>
            </view>
          </view>
        </view>
      </scroll-view>

      <view class="loading-mask" v-if="isCategoryLoading">
        <view class="loading-card">
          <uni-icons type="spinner-cycle" size="28" color="#07c160"></uni-icons>
          <text>正在切换分类...</text>
        </view>
      </view>

      <view class="empty-state" v-if="hasLoadedOnce && !loading && !isCategoryLoading && items.length === 0">
        <image src="/static/empty.png" mode="aspectFit" class="empty-img" />
        <text class="empty-text">暂无相关宝贝</text>
      </view>
    </view>
    <!-- TabBar 放在 scroll-view 外，确保 fixed 生效 -->
    <custom-tabbar active="index" :unread-count="conversationStore.unreadTotal" />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { getItems, type Item } from '../../api/item';
import { IMAGE_BASE_URL } from '../../config';
import { conversationStore } from '../../store/conversation';
import CustomTabbar from '../../components/custom-tabbar.vue';

const serverUrl = IMAGE_BASE_URL;
const items = ref<Item[]>([]);
const page = ref(1);
const size = ref(10);
const loading = ref(false);
const noMore = ref(false);
const isRefresherTriggered = ref(false);
const isCategoryLoading = ref(false);
const activeCategory = ref('all');
const hasLoadedOnce = ref(false);

const categoryTabs = [
  { key: 'all', label: '全部' },
  { key: 'book', label: '图书' },
  { key: 'digital', label: '电子产品' },
  { key: 'daily', label: '生活用品' },
  { key: 'sports', label: '体育器材' },
  { key: 'other', label: '其他' }
];

// 拉取列表数据（API + Mock 回退）
const fetchItems = async (isRefresh = false, showCategoryLoading = false) => {
  if (loading.value || (noMore.value && !isRefresh)) return;
  
  loading.value = true;
  if (showCategoryLoading) {
    isCategoryLoading.value = true;
  }
  try {
    // 状态 OnSale 代表在售
    const res = await getItems({
      page: page.value,
      pageSize: size.value,
      status: 'OnSale',
      category: activeCategory.value === 'all' ? '' : activeCategory.value
    });
    
    // 兼容不同返回结构
    let newItems: any[] = [];
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
      console.log('【首页渲染数据检查】', JSON.stringify(items.value[0]));
    }
    
    // 根据返回长度判断是否没有更多
    if (!newItems || newItems.length < size.value) {
      noMore.value = true;
    }
  } catch (error) {
    console.error('获取物品失败，切换到 Mock 数据', error);
    // Mock 数据作为回退，便于 UI 演示与验证
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
    isCategoryLoading.value = false;
    hasLoadedOnce.value = true;
  }
};

const selectCategory = (categoryKey: string) => {
  if (activeCategory.value === categoryKey) return;
  activeCategory.value = categoryKey;
  page.value = 1;
  noMore.value = false;
  items.value = [];
  fetchItems(true, true);
};

const onRefresh = () => {
  isRefresherTriggered.value = true;
  page.value = 1;
  noMore.value = false;
  fetchItems(true, false);
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

const goToSearch = () => {
  uni.navigateTo({
    url: '/pages/search/search'
  });
};

// 解析图片地址：兼容 string[] / JSON 字符串 / 相对路径
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
  
  const first = imgList[0].replace(/"/g, '');
  if (first.startsWith('http')) return first;
  if (first.startsWith('/uploads')) return `${IMAGE_BASE_URL}${first}`;
  return `${serverUrl}${first.startsWith('/') ? '' : '/'}${first}`;
};

onMounted(() => {
  fetchItems(true);
});

onShow(() => {
  uni.hideTabBar();
});
</script>

<style lang="scss" scoped>
.container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f5f5;
}

.search-bar {
  padding: 20rpx 30rpx;
  background-color: #ffffff;
  margin: 20rpx;
  border-radius: 40rpx;
  display: flex;
  align-items: center;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.02);

  &:active {
    background-color: #f5f5f5;
  }
}

.search-text {
  color: #999;
  font-size: 26rpx;
  margin-left: 12rpx;
}

.category-tabs {
  white-space: nowrap;
  padding: 0 20rpx 16rpx;
}

.tab-row {
  display: inline-flex;
  align-items: center;
}

.tab-item {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  margin-right: 20rpx;
  padding: 10rpx 6rpx 8rpx;
  color: #666;
  transition: all 0.2s ease;
}

.tab-text {
  font-size: 26rpx;
  font-weight: 400;
}

.tab-underline {
  width: 28rpx;
  height: 6rpx;
  border-radius: 999rpx;
  background-color: transparent;
  margin-top: 8rpx;
  transition: all 0.2s ease;
}

.tab-item.active {
  color: #07c160;
  font-weight: 700;
}

.tab-item.active .tab-text {
  font-weight: 700;
}

.tab-item.active .tab-underline {
  width: 34rpx;
  background-color: #07c160;
}

.waterfall-shell {
  position: relative;
  flex: 1;
  min-height: 0;
}

.waterfall {
  flex: 1;
  overflow: hidden;
  padding: 0 20rpx;
}

.loading-mask {
  position: absolute;
  inset: 0;
  background: rgba(245, 245, 245, 0.82);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
}

.loading-card {
  min-width: 240rpx;
  padding: 24rpx 28rpx;
  border-radius: 20rpx;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.08);

  text {
    font-size: 26rpx;
    color: #333;
  }
}

.empty-state {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10;
  pointer-events: none;
}

.empty-img {
  width: 280rpx;
  height: 280rpx;
}

.empty-text {
  margin-top: 20rpx;
  font-size: 28rpx;
  color: #999;
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

