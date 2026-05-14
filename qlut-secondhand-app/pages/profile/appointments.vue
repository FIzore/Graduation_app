<template>
  <view class="container">
    <view class="header" :style="{ paddingTop: navMetrics.paddingTop + 'px', paddingRight: navMetrics.paddingRight + 'px' }">
      <view class="back-box" @click="goBack">
        <uni-icons type="back" size="24" color="#333"></uni-icons>
      </view>
      <text class="title">我的预约项目</text>
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
      <view v-if="list.length > 0" class="list-wrapper">
        <view
          class="appointment-card"
          v-for="(app, idx) in list"
          :key="idx"
          @click="goToDetail(getItemId(app))"
        >
          <view class="card-header">
            <text class="time">交接时间: {{ formatTime(app.createdAt) }}</text>
            <text class="status" :class="'status-' + app.status">
              {{ statusMap(app.status) }}
            </text>
          </view>

          <view class="card-body">
            <image class="card-img" :src="getAppointmentCover(app)" mode="aspectFill"></image>
            <view class="card-info">
              <text class="card-title">{{ getItemEntity(app).title || '未命名物品' }}</text>
              <text class="card-price">¥ {{ getItemEntity(app).price || '0.00' }}</text>
            </view>
          </view>

          <view class="card-footer" v-if="app.status === 1" @click.stop="">
            <view class="cancel-btn" @click.stop.prevent="handleCancelAppointment(app)">
              <text>取消预约</text>
            </view>
            <view class="confirm-btn" @click.stop.prevent="handleConfirm(app)">
              <text>确认交接</text>
            </view>
          </view>
        </view>
      </view>

      <view v-if="list.length === 0" class="empty-state">
        <image src="/static/empty.png" mode="aspectFit" class="empty-img"></image>
        <text class="empty-text">暂无预约记录</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { getMyAppointments, confirmAppointment, cancelAppointment } from '../../api/item';
import { getFirstImageUrl } from '../../utils/image';
import { getCustomNavMetrics } from '../../utils/navigation';

const navMetrics = getCustomNavMetrics();

interface AppointmentItem {
  id: number;
  title: string;
  price: number;
  images: string[];
}

interface AppointmentRecord {
  id: number;
  createdAt: string;
  itemId: number;
  item: AppointmentItem;
  status: number;
}

const list = ref<AppointmentRecord[]>([]);
const loading = ref(false);
const confirming = ref(false);
const cancelling = ref(false);
const refresherTriggered = ref(false);

const goBack = () => {
  uni.navigateBack();
};

const goToDetail = (id: number | string | undefined) => {
  if (!id) return;
  uni.navigateTo({ url: `/pages/item/detail?id=${id}` });
};

const getItemEntity = (app: AppointmentRecord) => {
  return app.item;
};

const getItemId = (app: AppointmentRecord) => {
  const item = getItemEntity(app);
  return item.id;
};

const getAppointmentId = (app: AppointmentRecord) => {
  return app.id;
};

const getAppointmentCover = (app: AppointmentRecord) => {
  const item = getItemEntity(app);
  return getFirstImageUrl(item.images);
};

const formatTime = (timeStr: string | undefined) => {
  if (!timeStr) return '待定或尽快交接';
  const d = new Date(timeStr.replace(/-/g, '/'));
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

const extractAppointments = (raw: AppointmentRecord[] | { appointments?: AppointmentRecord[] } | undefined): AppointmentRecord[] => {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.appointments)) return raw.appointments;
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
    refresherTriggered.value = false;
    uni.stopPullDownRefresh();
  }
};

const handleConfirm = (app: AppointmentRecord) => {
  const id = getAppointmentId(app);
  if (!id || confirming.value) return;

  uni.showModal({
    title: '确认交接',
    content: '确认已完成线下交接？',
    success: async (res) => {
      if (res.confirm) {
        confirming.value = true;
        try {
          await confirmAppointment(id);
          uni.showToast({ title: '交接确认成功', icon: 'none' });
          await loadAppointments();
        } catch (e) {
          console.error('确认交接失败', e);
        } finally {
          confirming.value = false;
        }
      }
    }
  });
};

const handleCancelAppointment = (app: AppointmentRecord) => {
  const id = getAppointmentId(app);
  if (!id || cancelling.value) return;

  uni.showModal({
    title: '取消预约',
    content: '确认取消这次预约交接？',
    confirmColor: '#ff4d4f',
    success: async (res) => {
      if (res.confirm) {
        cancelling.value = true;
        try {
          await cancelAppointment(id);
          uni.showToast({ title: '已取消预约', icon: 'none' });
          await loadAppointments();
        } catch (e) {
          console.error('取消预约失败', e);
        } finally {
          cancelling.value = false;
        }
      }
    }
  });
};

const onRefresh = () => {
  refresherTriggered.value = true;
  loadAppointments();
};

const onRestore = () => {
  refresherTriggered.value = false;
};

onShow(() => {
  loadAppointments();
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

.appointment-card {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
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

  .card-footer {
    margin-top: 20rpx;
    padding-top: 16rpx;
    border-top: 1rpx solid #f5f5f5;
    display: flex;
    justify-content: flex-end;

    .confirm-btn {
      padding: 12rpx 40rpx;
      background-color: #07c160;
      border-radius: 8rpx;
      font-size: 26rpx;
      color: #fff;
      font-weight: bold;

      &:active {
        opacity: 0.85;
      }
    }

    .cancel-btn {
      padding: 12rpx 32rpx;
      margin-right: 18rpx;
      background-color: #f5f5f5;
      border-radius: 8rpx;
      font-size: 26rpx;
      color: #666;
      font-weight: bold;

      &:active {
        opacity: 0.85;
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
