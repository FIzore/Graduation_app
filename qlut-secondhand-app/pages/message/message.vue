<template>
  <view class="container">
    <view class="header">
      <text class="title">消息</text>
    </view>

    <scroll-view scroll-y class="conv-list" v-if="sortedList.length > 0">
      <view
        class="conv-item"
        v-for="conv in sortedList"
        :key="conv.userId"
        @click="goToChat(conv)"
      >
        <view class="avatar-box">
          <image
            class="avatar"
            :src="conv.avatar || '/static/default-avatar.png'"
            mode="aspectFill"
          ></image>
          <view class="badge" v-if="conv.unreadCount > 0">
            <text v-if="conv.unreadCount <= 99">{{ conv.unreadCount }}</text>
            <text v-else>99+</text>
          </view>
        </view>

        <view class="conv-body">
          <view class="conv-top">
            <text class="nickname">{{ conv.nickname || '用户' + conv.userId }}</text>
            <text class="time">{{ formatConvTime(conv.lastTime) }}</text>
          </view>
          <view class="conv-bottom">
            <text class="last-msg">{{ conv.lastMsg }}</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <view v-else class="empty-state">
      <uni-icons type="chat" size="80" color="#ccc"></uni-icons>
      <text class="empty-text">暂无会话消息</text>
    </view>

    <custom-tabbar active="message" :unread-count="store.unreadTotal" />
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { conversationStore } from '../../store/conversation';
import CustomTabbar from '../../components/custom-tabbar.vue';

const store = conversationStore;

const sortedList = computed(() => {
  return Object.values(store.conversations).sort((a, b) => {
    return new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime();
  });
});

const formatConvTime = (timeStr: string) => {
  if (!timeStr) return '';
  const d = new Date(timeStr.replace(/-/g, '/'));
  if (Number.isNaN(d.getTime())) return timeStr;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (msgDay.getTime() === today.getTime()) {
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  if (msgDay.getTime() === yesterday.getTime()) {
    return '昨天';
  }
  return (d.getMonth() + 1) + '-' + d.getDate();
};

const goToChat = (conv: { userId: number; nickname: string }) => {
  store.markRead(conv.userId);
  uni.navigateTo({
    url: '/pages/chat/room?userId=' + conv.userId + '&nickname=' + encodeURIComponent(conv.nickname)
  });
};

onShow(() => {
  uni.hideTabBar();
});
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  background-color: #f7f8fa;
  display: flex;
  flex-direction: column;
}

.header {
  padding: calc(var(--status-bar-height) + 20rpx) 30rpx 20rpx;
  background-color: #fff;
  border-bottom: 1rpx solid #eee;

  .title {
    font-size: 36rpx;
    font-weight: bold;
    color: #333;
  }
}

.conv-list {
  flex: 1;
  overflow: hidden;
}

.conv-item {
  display: flex;
  align-items: center;
  padding: 24rpx 30rpx;
  background-color: #fff;
  border-bottom: 1rpx solid #f5f5f5;

  &:active {
    background-color: #f5f5f5;
  }
}

.avatar-box {
  position: relative;
  flex-shrink: 0;

  .avatar {
    width: 96rpx;
    height: 96rpx;
    border-radius: 50%;
    background-color: #eee;
  }

  .badge {
    position: absolute;
    top: -8rpx;
    right: -8rpx;
    min-width: 36rpx;
    height: 36rpx;
    background-color: #ff3b30;
    border-radius: 18rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 8rpx;

    text {
      font-size: 20rpx;
      color: #fff;
      font-weight: bold;
    }
  }
}

.conv-body {
  flex: 1;
  margin-left: 20rpx;
  overflow: hidden;

  .conv-top {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .nickname {
      font-size: 30rpx;
      color: #333;
      font-weight: 500;
      max-width: 400rpx;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .time {
      font-size: 24rpx;
      color: #999;
      flex-shrink: 0;
    }
  }

  .conv-bottom {
    margin-top: 8rpx;

    .last-msg {
      font-size: 26rpx;
      color: #999;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 1;
      overflow: hidden;
    }
  }
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-bottom: 200rpx;

  .empty-text {
    margin-top: 30rpx;
    font-size: 28rpx;
    color: #999;
  }
}
</style>
