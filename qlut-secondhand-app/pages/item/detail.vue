<template>
  <view class="detail-container" v-if="item">
    <swiper class="swiper" circular indicator-dots autoplay :interval="3000" :duration="500">
      <swiper-item v-for="(img, index) in formattedImages" :key="index">
        <image :src="img" mode="aspectFill" class="swiper-image" @click="previewImage(index)" />
      </swiper-item>
      <swiper-item v-if="!formattedImages.length">
        <image src="/static/empty.png" mode="aspectFill" class="swiper-image" />
      </swiper-item>
    </swiper>

    <view class="info-section">
      <view class="price-row">
        <text class="price-symbol">¥</text>
        <text class="price-value">{{ itemPrice }}</text>
        <view class="status-tag" :class="'status-' + itemStatus">
          {{ getStatusText(itemStatus) }}
        </view>
      </view>
      <view class="title-row">
        <text class="item-title">{{ itemTitle }}</text>
      </view>
      <view class="meta-row">
        <text class="publish-time">发布于：{{ formatTime(itemTime) }}</text>
      </view>
    </view>

    <view class="desc-section">
      <view class="section-title">物品描述</view>
      <text class="item-desc">{{ itemContent }}</text>
    </view>

    <view class="bottom-bar">
      <view class="fav-btn" v-if="!isSelf" @click="toggleFavorite">
        <uni-icons :type="isFavorited ? 'heart-filled' : 'heart'" size="24" :color="isFavorited ? '#ff4d4f' : '#ccc'"></uni-icons>
      </view>
      <view class="action-btn-group">
        <button v-if="!isSelf" class="chat-btn" @click="goToChat">
          <uni-icons type="chat" size="22" color="#fff"></uni-icons>
          <text class="chat-btn-text">私聊卖家</text>
        </button>
        <button v-if="!isSelf && itemStatus === 'OnSale'" class="reserve-btn" @click="onReserve" :loading="reserving">
          立即发起预约
        </button>
        <button v-else-if="!isSelf && itemStatus === 'Pending'" class="pending-btn" disabled>
          预约交接中...
        </button>
        <button v-else-if="!isSelf" class="completed-btn" disabled>
          物品已交接完成
        </button>
        <button v-else class="pending-btn" disabled>
          这是您发布的物品
        </button>
      </view>
    </view>
  </view>

  <view class="loading-state" v-else>
    <text>正在加载详情信息...</text>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { getItemDetail, createAppointment, favoriteItem, unfavoriteItem, type Item, type ItemDetailResponse } from '../../api/item';
import { conversationStore } from '../../store/conversation';
import { formatImageUrl, parseImages } from '../../utils/image';

type DetailItem = Item & { nickname?: string };

const item = ref<DetailItem | null>(null);
const reserving = ref(false);
const isFavorited = ref(false);
const favoriting = ref(false);

const itemId = computed(() => item.value?.id || 0);
const itemTitle = computed(() => item.value?.title || '未命名物品');
const itemPrice = computed(() => item.value?.price ?? '0.00');
const itemStatus = computed(() => item.value?.status || 'OnSale');
const itemContent = computed(() => item.value?.content || '暂无详细描述');
const itemTime = computed(() => item.value?.createdAt || new Date());

const publisherId = computed(() => item.value?.publisherId ?? 0);
const publisherNickname = computed(() => item.value?.nickname || '卖家');

const isSelf = computed(() => {
  const myId = conversationStore.getMyUserId();
  return myId > 0 && myId === Number(publisherId.value);
});

const formattedImages = computed(() => {
  const raw = item.value?.images;
  const images = parseImages(raw);
  return images.map((img) => formatImageUrl(img));
});

const onLoadHandler = async (options: any) => {
  const id = Number(options.id);
  if (!id) {
    uni.showToast({ title: '参数错误', icon: 'none' });
    setTimeout(() => uni.navigateBack(), 1000);
    return;
  }

  try {
    const res = await getItemDetail(id);
    const raw = res.data as Item | ItemDetailResponse;
    if ((raw as ItemDetailResponse)?.item) {
      item.value = (raw as ItemDetailResponse).item as DetailItem;
      isFavorited.value = Boolean((raw as ItemDetailResponse).isFavorite);
    } else {
      item.value = raw as DetailItem;
      isFavorited.value = false;
    }
  } catch (error) {
    console.error('获取详情失败:', error);
  }
};

onLoad(onLoadHandler);

const onReserve = async () => {
  if (!item.value) return;

  uni.showModal({
    title: '确认预约',
    content: '您确定要预约该物品吗？预约后请尽快线下交接。',
    confirmColor: '#007aff',
    success: async (res) => {
      if (res.confirm) {
        await handleReserve();
      }
    }
  });
};

const handleReserve = async () => {
  if (!item.value) return;

  reserving.value = true;
  try {
    await createAppointment(itemId.value);
    uni.showToast({ title: '预约成功', icon: 'none' });
    item.value.status = 'Pending';
  } catch (error: any) {
    console.error('预约失败:', error);
  } finally {
    reserving.value = false;
  }
};

const toggleFavorite = async () => {
  if (!item.value || favoriting.value) return;
  favoriting.value = true;
  try {
    const iid = itemId.value;
    const newState = !isFavorited.value;
    isFavorited.value = newState;
    if (newState) {
      await favoriteItem(iid);
    } else {
      await unfavoriteItem(iid);
    }
  } catch (e) {
    console.error('收藏上报失败:', e);
  } finally {
    favoriting.value = false;
  }
};

const goToChat = () => {
  const pid = publisherId.value;
  const nick = publisherNickname.value;
  if (!pid) return;
  const iid = itemId.value;
  const iTitle = itemTitle.value;
  const iCover = formattedImages.value[0] || '';
  const iPrice = String(itemPrice.value ?? '');
  uni.navigateTo({
    url: `/pages/chat/room?userId=${pid}&nickname=${encodeURIComponent(nick)}&itemId=${iid}&itemTitle=${encodeURIComponent(iTitle)}&itemCover=${encodeURIComponent(iCover)}&itemPrice=${encodeURIComponent(iPrice)}`
  });
};

const previewImage = (current: number) => {
  uni.previewImage({
    urls: formattedImages.value,
    current
  });
};

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    OnSale: '在售',
    Pending: '交接中',
    Completed: '已交接'
  };
  return map[status] || '未知状态';
};

const formatTime = (time: any) => {
  if (!time) return '未知时间';

  let d = new Date(time);

  // iOS 对 "YYYY-MM-DD HH:mm:ss" 兼容较差，但 ISO 8601（含 T / Z）不应做替换。
  if (Number.isNaN(d.getTime()) && typeof time === 'string' && !time.includes('T')) {
    d = new Date(time.replace(/-/g, '/'));
  }

  if (Number.isNaN(d.getTime())) return '未知时间';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
</script>

<style scoped>
.detail-container {
  padding-bottom: 120rpx;
  background-color: #f8f8f8;
  min-height: 100vh;
}

.swiper {
  width: 750rpx;
  height: 600rpx;
}

.swiper-image {
  width: 100%;
  height: 100%;
}

.info-section {
  background-color: #fff;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.price-row {
  display: flex;
  align-items: baseline;
  margin-bottom: 20rpx;
}

.price-symbol {
  font-size: 32rpx;
  color: #ff4d4f;
  font-weight: bold;
}

.price-value {
  font-size: 56rpx;
  color: #ff4d4f;
  font-weight: bold;
  margin-right: 20rpx;
}

.status-tag {
  font-size: 24rpx;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
}

.status-OnSale {
  background-color: #e6f7ff;
  color: #1890ff;
}

.status-Pending {
  background-color: #fff7e6;
  color: #fa8c16;
}

.status-Completed {
  background-color: #f5f5f5;
  color: #8c8c8c;
}

.item-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}

.meta-row {
  margin-top: 20rpx;
}

.publish-time {
  font-size: 24rpx;
  color: #999;
}

.desc-section {
  background-color: #fff;
  padding: 30rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  margin-bottom: 20rpx;
  color: #333;
  border-left: 8rpx solid #007aff;
  padding-left: 20rpx;
}

.item-desc {
  font-size: 28rpx;
  color: #666;
  line-height: 1.6;
}

.fav-btn {
  margin-right: 20rpx;
  padding: 10rpx;
}

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 110rpx;
  background-color: #fff;
  display: flex;
  align-items: center;
  padding: 0 30rpx;
  box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.05);
  z-index: 100;
}

.action-btn-group {
  flex: 1;
  display: flex;
}

.action-btn-group > button + button {
  margin-left: 20rpx;
}

.reserve-btn {
  background: linear-gradient(to right, #00c6ff, #0072ff);
  color: #fff;
  border-radius: 50rpx;
  font-size: 32rpx;
  border: none;
  flex: 1;
}

.chat-btn {
  background: #07c160;
  color: #fff;
  border-radius: 50rpx;
  font-size: 28rpx;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 30rpx;
}

.chat-btn-text {
  margin-left: 8rpx;
}

.pending-btn,
.completed-btn {
  background-color: #f5f5f5;
  color: #bfbfbf;
  border-radius: 50rpx;
  font-size: 32rpx;
}

.loading-state {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
}
</style>
