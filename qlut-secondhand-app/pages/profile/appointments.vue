<template>
  <view class="container">
    <view class="header">
      <view class="back-box" @click="goBack">
        <uni-icons type="back" size="24" color="#333"></uni-icons>
      </view>
      <text class="title">我的预约项目</text>
      <view class="placeholder"></view>
    </view>

    <view class="content">
      <view v-if="list.length > 0" class="list-wrapper">
        <view
          class="appointment-card"
          v-for="(app, idx) in list"
          :key="idx"
          @click="goToDetail(getItemId(app))"
        >
          <view class="card-header">
            <text class="time">交接时间: {{ formatTime(app.AppointmentTime || app.appointment_time || app.CreatedAt || app.created_at) }}</text>
            <text class="status" :class="'status-' + (app.Status || app.status)">
              {{ statusMap(app.Status ?? app.status) }}
            </text>
          </view>

          <view class="card-body">
            <image class="card-img" :src="getAppointmentCover(app)" mode="aspectFill"></image>
            <view class="card-info">
              <text class="card-title">{{ getItemEntity(app).Title || getItemEntity(app).title || '未命名物品' }}</text>
              <text class="card-price">¥ {{ getItemEntity(app).Price || getItemEntity(app).price || '0.00' }}</text>
            </view>
          </view>
        </view>
      </view>

      <view v-if="list.length === 0" class="empty-state">
        <image src="/static/empty.png" mode="aspectFit" class="empty-img"></image>
        <text class="empty-text">暂无预约记录</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { getMyAppointments } from '../../api/item';
import { BASE_URL } from '../../utils/request';

const API_HOST = 'http://127.0.0.1:8080';
const SERVER_ROOT = (BASE_URL || `${API_HOST}/api/v1`).replace('/api/v1', '');

const list = ref<any[]>([]);
const loading = ref(false);

const goBack = () => {
  uni.navigateBack();
};

const goToDetail = (id: number | string | undefined) => {
  if (!id) return;
  uni.navigateTo({ url: `/pages/item/detail?id=${id}` });
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

const getItemEntity = (app: any) => {
  return app?.item || app?.Item || {};
};

const getItemId = (app: any) => {
  const item = getItemEntity(app);
  return item.ID || item.id;
};

const getAppointmentCover = (app: any) => {
  const item = getItemEntity(app);
  const images = parseImages(item.Images ?? item.images);
  return formatImage(images[0]);
};

const formatTime = (timeStr: string | undefined) => {
  if (!timeStr) return '待定或尽快交接';
  const d = new Date(timeStr);
  if (Number.isNaN(d.getTime())) return timeStr;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const statusMap = (status: number | string | undefined): string => {
  switch (String(status)) {
    case '1':
      return '待交接';
    case '2':
      return '已完成';
    case '3':
      return '已取消';
    default:
      return '未知状态';
  }
};

const extractAppointments = (raw: any): any[] => {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.appointments)) return raw.appointments;
  if (Array.isArray(raw?.list)) return raw.list;
  if (Array.isArray(raw?.data)) return raw.data;
  return [];
};

const loadAppointments = async () => {
  loading.value = true;
  try {
    const res = await getMyAppointments().catch(() => ({ data: [] as any }));
    const parsed = extractAppointments(res.data);
    list.value = parsed;
  } catch (e) {
    console.error('加载预约记录失败', e);
    list.value = [];
  } finally {
    loading.value = false;
  }
};

onShow(() => {
  loadAppointments();
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

.appointment-card {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20rpx;
    padding-bottom: 16rpx;
    border-bottom: 1rpx solid #f5f5f5;

    .time {
      font-size: 26rpx;
      color: #666;
    }

    .status {
      font-size: 26rpx;
      font-weight: bold;

      &.status-1 {
        color: #1890ff;
      }

      &.status-2 {
        color: #52c41a;
      }

      &.status-3 {
        color: #999;
      }
    }
  }

  .card-body {
    display: flex;
    align-items: center;

    .card-img {
      width: 140rpx;
      height: 140rpx;
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
      height: 140rpx;

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

      .card-price {
        color: #ff4d4f;
        font-size: 32rpx;
        font-weight: bold;
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
