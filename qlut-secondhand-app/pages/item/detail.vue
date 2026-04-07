<template>
  <view class="detail-container" v-if="item">
    <!-- 图片轮播/展示 -->
    <swiper 
      class="swiper" 
      circular 
      indicator-dots 
      autoplay 
      :interval="3000" 
      :duration="500"
    >
      <swiper-item v-for="(img, index) in formattedImages" :key="index">
        <image :src="img" mode="aspectFill" class="swiper-image" @click="previewImage(index)" />
      </swiper-item>
      <swiper-item v-if="!formattedImages.length">
        <image src="/static/default.png" mode="aspectFill" class="swiper-image" />
      </swiper-item>
    </swiper>

    <!-- 核心信息区 -->
    <view class="info-section">
      <view class="price-row">
        <text class="price-symbol">￥</text>
        <text class="price-value">{{ item.Price }}</text>
        <view class="status-tag" :class="'status-' + item.Status">
          {{ getStatusText(item.Status) }}
        </view>
      </view>
      <view class="title-row">
        <text class="item-title">{{ item.Title }}</text>
      </view>
      <view class="meta-row">
        <text class="publish-time">发布于：{{ formatTime(item.CreatedAt || new Date()) }}</text>
      </view>
    </view>

    <!-- 详情描述 -->
    <view class="desc-section">
      <view class="section-title">物品描述</view>
      <text class="item-desc">{{ item.Content || '暂无详细描述' }}</text>
    </view>

    <!-- 底部操作栏 -->
    <view class="bottom-bar">
      <view class="action-btn-group">
        <button 
          v-if="item.Status === 'OnSale'" 
          class="reserve-btn" 
          @click="onReserve"
          :loading="reserving"
        >
          立即发起预约
        </button>
        <button 
          v-else-if="item.Status === 'Pending'" 
          class="pending-btn" 
          disabled
        >
          预约交接中...
        </button>
        <button 
          v-else 
          class="completed-btn" 
          disabled
        >
          物品已交接完毕
        </button>
      </view>
    </view>
  </view>
  
  <!-- 加载状态 -->
  <view class="loading-state" v-else>
    <text>正在加载详情信息...</text>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { getItemDetail, createAppointment, type Item } from '../../api/item';
import { BASE_URL } from '../../utils/request';

const item = ref<Item | null>(null);
const reserving = ref(false);

// 图片路径拼接逻辑：基于 API 的 BaseURL 获取根地址
const serverUrl = BASE_URL.replace('/api/v1', '');

const formattedImages = computed(() => {
  if (!item.value || !item.value.Images) return [];
  return item.value.Images.map(img => {
    // 如果已经是完整路径则跳过，否则拼接服务器地址
    if (img.startsWith('http')) return img;
    return `${serverUrl}${img.startsWith('/') ? '' : '/'}${img}`;
  });
});

const onLoadHandler = async (options: any) => {
  const id = Number(options.id);
  if (!id) {
    uni.showToast({ title: '参数错误', icon: 'none' });
    setTimeout(() => uni.navigateBack(), 1500);
    return;
  }
  
  try {
    const res = await getItemDetail(id);
    item.value = res.data;
  } catch (error) {
    console.error('获取详情失败:', error);
  }
};

onLoad(onLoadHandler);

// 发起预约逻辑
const onReserve = async () => {
  if (!item.value) return;

  uni.showModal({
    title: '确认预约',
    content: '您确定要预约该物品吗？预约后请尽快与发布者线下交流。',
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
    await createAppointment(item.value.ID);
    uni.showToast({ title: '预约成功', icon: 'success' });
    // 成功后 local 更新状态避免重新请求
    item.value.Status = 'Pending';
  } catch (error: any) {
    // 精度捕获：如果是 429 锁定状态 (通常由后端返回业务 code 或 429 响应头)
    // 根据 PRD, 这里需要给出明确提示
    if (error.message?.includes('429') || error.msg?.includes('锁定')) {
      uni.showToast({ title: '手慢了，该物品已被他人锁定', icon: 'none' });
    } else {
      // 其他错误由 request.ts 统一吐出，详情页只需处理特殊交互
    }
  } finally {
    reserving.value = false;
  }
};

const previewImage = (current: number) => {
  uni.previewImage({
    urls: formattedImages.value,
    current
  });
};

const getStatusText = (status: string) => {
  const map: any = { 'OnSale': '待售', 'Pending': '交接中', 'Completed': '已交接' };
  return map[status] || '未知状态';
};

const formatTime = (time: any) => {
  const d = new Date(time);
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
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

.status-OnSale { background-color: #e6f7ff; color: #1890ff; }
.status-Pending { background-color: #fff7e6; color: #fa8c16; }
.status-Completed { background-color: #f5f5f5; color: #8c8c8c; }

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
  box-shadow: 0 -2rpx 10rpx rgba(0,0,0,0.05);
  z-index: 100;
}

.action-btn-group {
  flex: 1;
}

.reserve-btn {
  background: linear-gradient(to right, #00c6ff, #0072ff);
  color: #fff;
  border-radius: 50rpx;
  font-size: 32rpx;
  border: none;
}

.pending-btn, .completed-btn {
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
