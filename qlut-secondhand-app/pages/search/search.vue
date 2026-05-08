<template>
  <view class="search-container">
    <view class="nav-bar" :style="{ paddingTop: navBarPaddingTop + 'px', paddingRight: navBarRightPadding + 'px' }">
      <view class="nav-back" @click="goBack">
        <uni-icons type="back" size="22" color="#333"></uni-icons>
      </view>
      <view class="search-input-box">
        <uni-icons type="search" size="18" color="#999"></uni-icons>
        <input
          class="search-input"
          v-model="keyword"
          placeholder="搜索想要的闲置物品..."
          confirm-type="search"
          :focus="true"
          @confirm="doSearch"
        />
        <view class="clear-btn" v-if="keyword" @click="clearKeyword">
          <uni-icons type="closeempty" size="16" color="#999"></uni-icons>
        </view>
      </view>
      <view class="search-btn" @click="doSearch">
        <text>搜索</text>
      </view>
    </view>

    <scroll-view
      class="result-list"
      scroll-y
      v-if="hasSearched"
      @scrolltolower="loadMore"
      refresher-enabled
      :refresher-triggered="isRefresherTriggered"
      @refresherrefresh="onRefresh"
      @refresherrestore="onRestore"
    >
      <view class="grid" v-if="resultItems.length > 0">
        <view
          class="item-card"
          v-for="item in resultItems"
          :key="item.id"
          @click="goToDetail(item.id)"
        >
          <image :src="getItemCover(item)" mode="aspectFill" class="item-img" />
          <view class="item-info">
            <text class="item-title">{{ item.title || '未命名' }}</text>
            <text class="item-price">¥{{ item.price || '0.00' }}</text>
          </view>
        </view>
      </view>

      <view v-if="resultItems.length === 0 && !loading" class="empty-state">
        <uni-icons type="search" size="80" color="#ccc"></uni-icons>
        <text class="empty-text">未找到相关宝贝</text>
      </view>

      <view v-if="loading" class="loading-state">
        <text>搜索中...</text>
      </view>
    </scroll-view>

    <view class="history-section" v-else>
      <view class="history-header" v-if="historyList.length > 0">
        <text class="history-title">历史搜索</text>
        <view class="history-clear" @click="clearHistory">
          <uni-icons type="trash" size="16" color="#999"></uni-icons>
        </view>
      </view>

      <view class="history-tags" v-if="historyList.length > 0">
        <view
          class="history-tag"
          v-for="(tag, idx) in historyList"
          :key="idx"
          @click="searchByTag(tag)"
        >
          <text>{{ tag }}</text>
        </view>
      </view>

      <view class="empty-state" v-if="historyList.length === 0">
        <uni-icons type="search" size="80" color="#ccc"></uni-icons>
        <text class="empty-text">输入关键词搜索闲置物品</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { getItems, type Item } from '../../api/item';
import { IMAGE_BASE_URL } from '../../config';

const HISTORY_KEY = 'searchHistory';
const PAGE_SIZE = 20;

const systemInfo = uni.getSystemInfoSync();
const statusBarHeight = systemInfo.statusBarHeight || 20;
let capsuleRight = 0;
let navHeight = 44;

try {
  const capsule = uni.getMenuButtonBoundingClientRect();
  capsuleRight = capsule.right;
  navHeight = capsule.bottom + 4;
} catch {
  capsuleRight = 95;
  navHeight = 44;
}
const navBarPaddingTop = navHeight;
const navBarRightPadding = (systemInfo.windowWidth || 375) - capsuleRight + 16;

const keyword = ref('');
const page = ref(1);
const resultItems = ref<Item[]>([]);
const loading = ref(false);
const hasSearched = ref(false);
const noMore = ref(false);
const historyList = ref<string[]>([]);
const isRefresherTriggered = ref(false);

const loadHistory = () => {
  try {
    const raw = uni.getStorageSync(HISTORY_KEY);
    historyList.value = raw ? JSON.parse(raw) : [];
  } catch {
    historyList.value = [];
  }
};

const saveHistory = (kw: string) => {
  const arr = historyList.value.filter(h => h !== kw);
  arr.unshift(kw);
  if (arr.length > 10) arr.pop();
  historyList.value = arr;
  uni.setStorageSync(HISTORY_KEY, JSON.stringify(arr));
};

const parseImages = (raw: any): string[] => {
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === 'string') {
    const text = raw.trim();
    if (!text) return [];
    if (text.startsWith('[')) {
      try { return JSON.parse(text).filter(Boolean); } catch { return []; }
    }
    return [text];
  }
  return [];
};

const getItemCover = (item: Item) => {
  const images = parseImages(item.images);
  const first = images[0];
  if (!first) return '/static/default.png';
  if (first.startsWith('http')) return first;
  if (first.startsWith('/uploads')) return IMAGE_BASE_URL + first;
  return IMAGE_BASE_URL + '/' + first;
};

const doSearch = () => {
  const kw = keyword.value.trim();
  if (!kw) return;
  saveHistory(kw);
  page.value = 1;
  noMore.value = false;
  hasSearched.value = true;
  fetchResults(true);
};

const searchByTag = (tag: string) => {
  keyword.value = tag;
  doSearch();
};

const clearKeyword = () => {
  keyword.value = '';
  hasSearched.value = false;
  resultItems.value = [];
  noMore.value = false;
  isRefresherTriggered.value = false;
};

const clearHistory = () => {
  historyList.value = [];
  uni.removeStorageSync(HISTORY_KEY);
};

const goToDetail = (id: number) => {
  if (!id) return;
  uni.navigateTo({ url: '/pages/item/detail?id=' + id });
};

const goBack = () => {
  uni.navigateBack();
};

const extractItems = (raw: Item[] | { items?: Item[] } | undefined): Item[] => {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.items)) return raw.items;
  return [];
};

const fetchResults = async (reset = false) => {
  if (loading.value) {
    isRefresherTriggered.value = false;
    return;
  }

  if (noMore.value) return;

  loading.value = true;
  try {
    const res = await getItems({
      page: page.value,
      pageSize: PAGE_SIZE,
      keyword: keyword.value.trim(),
    });
    const items = extractItems(res.data);
    if (reset) {
      resultItems.value = items;
    } else {
      resultItems.value = [...resultItems.value, ...items];
    }
    if (items.length < PAGE_SIZE) noMore.value = true;
  } catch (e) {
    console.error('搜索失败:', e);
  } finally {
    loading.value = false;
    setTimeout(() => {
      isRefresherTriggered.value = false;
    }, 300);
    uni.stopPullDownRefresh();
  }
};

const onRefresh = () => {
  if (!hasSearched.value) {
    isRefresherTriggered.value = false;
    uni.stopPullDownRefresh();
    return;
  }
  isRefresherTriggered.value = true;
  page.value = 1;
  noMore.value = false;
  fetchResults(true);
};

const onRestore = () => {
  isRefresherTriggered.value = false;
};

const loadMore = () => {
  if (!noMore.value) {
    page.value++;
    fetchResults();
  }
};

onShow(() => {
  loadHistory();
});
</script>

<style lang="scss" scoped>
.search-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f7f8fa;
}

.nav-bar {
  display: flex;
  align-items: center;
  padding: 16rpx 20rpx;
  background-color: #fff;
  border-bottom: 1rpx solid #eee;

  .nav-back {
    width: 60rpx;
    height: 60rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
}

.search-input-box {
  flex: 1;
  display: flex;
  align-items: center;
  height: 64rpx;
  background-color: #f5f5f5;
  border-radius: 32rpx;
  padding: 0 20rpx;

  .search-input {
    flex: 1;
    font-size: 28rpx;
    margin-left: 10rpx;
    height: 100%;
  }

  .clear-btn {
    margin-left: 8rpx;
    padding: 4rpx;
  }
}

.search-btn {
  margin-left: 20rpx;
  padding: 12rpx 24rpx;
  background-color: #07c160;
  border-radius: 8rpx;
  flex-shrink: 0;

  text {
    font-size: 28rpx;
    color: #fff;
    font-weight: bold;
  }
}

.result-list {
  flex: 1;
  height: 100%;
  overflow: hidden;
  padding: 20rpx;
}

.grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
}

.item-card {
  width: calc(50% - 10rpx);
  margin-bottom: 20rpx;
  background-color: #fff;
  border-radius: 12rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.04);

  .item-img {
    width: 100%;
    height: 320rpx;
    object-fit: cover;
  }

  .item-info {
    padding: 16rpx 20rpx 20rpx;

    .item-title {
      font-size: 26rpx;
      color: #333;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      overflow: hidden;
      line-height: 1.4;
    }

    .item-price {
      font-size: 30rpx;
      color: #ff4d4f;
      font-weight: bold;
      margin-top: 8rpx;
      display: block;
    }
  }
}

.history-section {
  flex: 1;
  padding: 30rpx;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;

  .history-title {
    font-size: 30rpx;
    font-weight: bold;
    color: #333;
  }
}

.history-tags {
  display: flex;
  flex-wrap: wrap;
}

.history-tag {
  margin-right: 16rpx;
  margin-bottom: 16rpx;
  padding: 12rpx 28rpx;
  background-color: #fff;
  border-radius: 32rpx;
  font-size: 26rpx;
  color: #666;
  border: 1rpx solid #eee;

  &:active {
    background-color: #f5f5f5;
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 200rpx;

  .empty-text {
    margin-top: 30rpx;
    font-size: 28rpx;
    color: #999;
  }
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 40rpx 0;
  color: #999;
}
</style>
