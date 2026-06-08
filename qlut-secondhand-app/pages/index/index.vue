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
      <view class="recommend-banner" v-if="recommendBannerText">
        <text class="recommend-banner-text">{{ recommendBannerText }}</text>
      </view>

      <!-- 物品瀑布流 -->
      <scroll-view 
        scroll-y 
        class="waterfall" 
        @scrolltolower="loadMore"
        refresher-enabled
        :refresher-triggered="isRefresherTriggered"
        @refresherrefresh="onRefresh"
        @refresherrestore="onRestore"
      >
        <view class="grid">
          <view 
            class="item-card" 
            v-for="item in items" 
            :key="item.id" 
            @click="goToDetail(item.id)"
          >
            <!-- 图片展示：兼容相对路径与外部链接 -->
            <image :src="getCoverImage(item.images)" mode="aspectFill" class="item-img" />
            
            <view class="item-info">
              <text class="item-title">{{ item.title || '未命名物品' }}</text>
              <text class="item-price">¥{{ item.price || '0.00' }}</text>
              <text class="item-status" v-if="item.status === 'Pending'">预约交接中</text>
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
        <text class="empty-text">{{ emptyStateText }}</text>
      </view>
    </view>
    <!-- TabBar 放在 scroll-view 外，确保 fixed 生效 -->
    <custom-tabbar active="index" :unread-count="conversationStore.unreadTotal" />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { getItems, getIndexRecommend, type Item, type RecommendListResponse } from '../../api/item';
import { conversationStore } from '../../store/conversation';
import { getFirstImageUrl } from '../../utils/image';
import CustomTabbar from '../../components/custom-tabbar.vue';

type ItemListResponse = Item[] | { items?: Item[]; total?: number };

const items = ref<Item[]>([]);
const page = ref(1);
const size = ref(10);
const loading = ref(false);
const noMore = ref(false);
const isRefresherTriggered = ref(false);
const isCategoryLoading = ref(false);
const activeCategory = ref('all');
const hasLoadedOnce = ref(false);
const isLoggedIn = ref(false);
const isRecommendMode = ref(true);
const recommendLoadFailed = ref(false);
const fallbackHint = ref('');
const isFallbackBaseMode = ref(false);

const categoryTabs = [
  { key: 'all', label: '全部' },
  { key: 'book', label: '图书' },
  { key: 'digital', label: '电子产品' },
  { key: 'daily', label: '生活用品' },
  { key: 'sports', label: '体育器材' },
  { key: 'other', label: '其他' }
];

const getRecommendHint = () => {
  return isLoggedIn.value
    ? '✨ 根据你的浏览与想要记录为你推荐'
    : '当前为最新上架，登录后可体验个性化推荐';
};

const recommendBannerText = ref(getRecommendHint());

const emptyStateText = ref('暂无相关宝贝');

const updateRecommendMode = () => {
  isRecommendMode.value = activeCategory.value === 'all';
};

const updateBannerText = () => {
  if (fallbackHint.value) {
    recommendBannerText.value = fallbackHint.value;
    return;
  }

  if (isRecommendMode.value) {
    recommendBannerText.value = getRecommendHint();
    return;
  }

  const currentLabel = categoryTabs.find((item) => item.key === activeCategory.value)?.label || '全部';
  recommendBannerText.value = `当前查看${currentLabel}分类`;
};

const extractItems = (raw: ItemListResponse | RecommendListResponse | undefined): Item[] => {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.items)) return raw.items;
  return [];
};

const syncLoginState = () => {
  isLoggedIn.value = Boolean(uni.getStorageSync('token'));
};

const setDefaultRecommendHint = () => {
  fallbackHint.value = '';
  isFallbackBaseMode.value = false;
  updateBannerText();
};

const fetchRecommendItems = async (): Promise<Item[]> => {
  const res = await getIndexRecommend();
  recommendLoadFailed.value = false;
  fallbackHint.value = '';
  isFallbackBaseMode.value = false;
  if (res.data?.source === 'personalized') {
    fallbackHint.value = '已根据你的浏览、搜索和想要记录生成推荐';
  } else if (res.data?.source === 'latest') {
    fallbackHint.value = isLoggedIn.value
      ? '暂无个性化推荐，当前展示最新在售'
      : '当前为最新上架，登录后可体验个性化推荐';
  }
  return extractItems(res.data);
};

const fetchBaseItems = async (): Promise<Item[]> => {
  const res = await getItems({
    page: page.value,
    pageSize: size.value,
    status: 'OnSale',
    category: activeCategory.value === 'all' ? '' : activeCategory.value
  });

  return extractItems(res.data);
};

// 拉取列表数据（推荐流 / 分类流 / 明确降级）
const fetchItems = async (isRefresh = false, showCategoryLoading = false) => {
  if (loading.value) {
    isRefresherTriggered.value = false;
    return;
  }

  if (noMore.value && !isRefresh) return;
  
  loading.value = true;
  if (showCategoryLoading) {
    isCategoryLoading.value = true;
  }
  try {
    let newItems: Item[] = [];

    if (isRecommendMode.value) {
      try {
        newItems = await fetchRecommendItems();
        emptyStateText.value = '暂无推荐内容';
        noMore.value = true;
      } catch (recommendError) {
        console.error('获取推荐流失败，回退基础内容', recommendError);
        recommendLoadFailed.value = true;
        fallbackHint.value = '推荐引擎正在升级中，先为你展示基础内容';
        isFallbackBaseMode.value = true;
        newItems = await fetchBaseItems();
        emptyStateText.value = '暂无基础内容';
      }
    } else {
      recommendLoadFailed.value = false;
      fallbackHint.value = '';
      isFallbackBaseMode.value = false;
      newItems = await fetchBaseItems();
      emptyStateText.value = '暂无相关宝贝';
    }

    updateBannerText();
    
    if (isRefresh) {
      items.value = newItems;
    } else {
      items.value.push(...newItems);
    }
    
    // 根据返回长度判断是否没有更多
    if (isFallbackBaseMode.value || !isRecommendMode.value) {
      noMore.value = !newItems || newItems.length < size.value;
    } else if (!newItems || newItems.length < size.value) {
      noMore.value = true;
    }
  } catch (error) {
    console.error('首页数据加载失败，切换到本地兜底', error);
    if (items.value.length === 0) {
      fallbackHint.value = isRecommendMode.value
        ? '推荐引擎正在升级中，当前展示本地兜底内容'
        : '列表服务暂时不可用，当前展示本地兜底内容';
      recommendLoadFailed.value = isRecommendMode.value;
      isFallbackBaseMode.value = false;
      updateBannerText();
      emptyStateText.value = '推荐引擎正在升级中，请稍后再试';
      items.value = [
        { id: 1, publisherId: 101, title: '九成新高数课本，笔记清晰', content: '保护得很好', price: 15.0, images: ['/static/empty.png'], status: 'OnSale' },
        { id: 2, publisherId: 102, title: '全新未拆封蓝牙耳机', content: '未拆封', price: 80.0, images: ['/static/empty.png'], status: 'Pending' },
        { id: 3, publisherId: 103, title: '考研政治核心考案', content: '附赠资料', price: 30.0, images: ['/static/empty.png'], status: 'OnSale' }
      ];
      noMore.value = true;
    }
  } finally {
    loading.value = false;
    isCategoryLoading.value = false;
    hasLoadedOnce.value = true;
    setTimeout(() => {
      isRefresherTriggered.value = false;
    }, 300);
    uni.stopPullDownRefresh();
  }
};

const selectCategory = (categoryKey: string) => {
  if (activeCategory.value === categoryKey) return;
  activeCategory.value = categoryKey;
  updateRecommendMode();
  if (isRecommendMode.value) {
    setDefaultRecommendHint();
  } else {
    fallbackHint.value = '';
    recommendLoadFailed.value = false;
    isFallbackBaseMode.value = false;
    updateBannerText();
  }
  page.value = 1;
  noMore.value = false;
  items.value = [];
  hasLoadedOnce.value = false;
  fetchItems(true, true);
};

const onRefresh = () => {
  syncLoginState();
  if (isRecommendMode.value && !fallbackHint.value) {
    updateBannerText();
  }
  isRefresherTriggered.value = true;
  page.value = 1;
  noMore.value = false;
  fetchItems(true, false);
};

const onRestore = () => {
  isRefresherTriggered.value = false;
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

const getCoverImage = (images: unknown) => getFirstImageUrl(images);

onMounted(() => {
  syncLoginState();
  updateRecommendMode();
  updateBannerText();
  fetchItems(true);
});

onShow(() => {
  syncLoginState();
  updateRecommendMode();
  if (!fallbackHint.value) {
    updateBannerText();
  }
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
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.recommend-banner {
  margin: 0 20rpx 16rpx;
  padding: 18rpx 22rpx;
  border-radius: 20rpx;
  background: linear-gradient(135deg, rgba(7, 193, 96, 0.12), rgba(7, 193, 96, 0.04));
  border: 1rpx solid rgba(7, 193, 96, 0.15);
}

.recommend-banner-text {
  font-size: 24rpx;
  color: #2f6b3f;
  line-height: 1.5;
}

.waterfall {
  flex: 1;
  height: 100%;
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
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.08);

  text {
    margin-left: 16rpx;
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

