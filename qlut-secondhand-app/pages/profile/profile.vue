<template>
  <view class="profile-container">
    <view class="header-section">
      <view class="user-info">
        <image class="avatar" :src="displayAvatar" mode="aspectFill"></image>
        <view class="name-box">
          <text class="username">{{ displayName }}</text>
          <view class="tag">学籍认证已通过</view>
        </view>
      </view>
    </view>

    <view class="stats-section">
      <view class="stat-item">
        <text class="count">{{ publishedCount }}</text>
        <text class="label">我发布的</text>
      </view>
      <view class="stat-item">
        <text class="count">{{ appointmentCount }}</text>
        <text class="label">预约交接</text>
      </view>
      <view class="stat-item">
        <text class="count">0</text>
        <text class="label">想要的</text>
      </view>
    </view>

    <view class="menu-section">
      <uni-list :border="false">
        <uni-list-item
          title="我发布的"
          showArrow
          clickable
          link="navigateTo"
          to="/pages/profile/published"
          :border="false"
        ></uni-list-item>
        <uni-list-item
          title="我的预约"
          showArrow
          clickable
          link="navigateTo"
          to="/pages/profile/appointments"
          :border="false"
        ></uni-list-item>
        <view class="divider"></view>
        <uni-list-item
          title="设置"
          showArrow
          link="navigateTo"
          to="/pages/settings/settings"
          :border="false"
        ></uni-list-item>
      </uni-list>
    </view>

    <view class="logout-btn-row" v-if="isLogin">
      <view class="logout-btn" @click="handleLogout">退出登录</view>
    </view>
    <view class="logout-btn-row" v-else>
      <view class="logout-btn login-btn" @click="goLogin">去登录</view>
    </view>

    <custom-tabbar active="me" />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import CustomTabbar from '../../components/custom-tabbar.vue';
import { getItems, getMyAppointments } from '../../api/item';
import { BASE_URL } from '../../utils/request';

const userInfo = ref<any>(null);
const isLogin = ref(false);
const currentUserId = ref('');
const publishedCount = ref(0);
const appointmentCount = ref(0);
const serverRoot = BASE_URL.replace('/api/v1', '');
const defaultAvatar = `${serverRoot}/uploads/profile_picture.png`;

// 预留后续接入微信昵称
const displayName = computed(() => {
  const info = userInfo.value;
  if (!info) return '未登录用户';

  return (
    info.displayName ||
    info.DisplayName ||
    info.nickname ||
    info.Nickname ||
    info.student_id ||
    info.StudentID ||
    info.account ||
    info.Account ||
    '未登录用户'
  );
});

// 预留后续接入微信头像
const displayAvatar = computed(() => {
  const info = userInfo.value;
  const avatar =
    info?.displayAvatar ||
    info?.DisplayAvatar ||
    info?.avatar ||
    info?.Avatar ||
    info?.avatar_url ||
    info?.AvatarURL ||
    '';

  if (!avatar) return defaultAvatar;
  if (String(avatar).startsWith('http')) return avatar;
  if (String(avatar).startsWith('/')) return `${serverRoot}${avatar}`;
  return `${serverRoot}/${avatar}`;
});

const extractList = (raw: any): any[] => {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.items)) return raw.items;
  if (Array.isArray(raw?.list)) return raw.list;
  if (Array.isArray(raw?.appointments)) return raw.appointments;
  if (Array.isArray(raw?.data)) return raw.data;
  return [];
};

const decodeBase64Url = (input: string): string => {
  try {
    const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
    const pad = '='.repeat((4 - (base64.length % 4)) % 4);
    const normalized = base64 + pad;
    if (typeof atob === 'function') {
      return atob(normalized);
    }
    const arr = uni.base64ToArrayBuffer(normalized);
    return new TextDecoder().decode(arr);
  } catch {
    return '';
  }
};

const getUserIdFromToken = (): string => {
  const token = uni.getStorageSync('token');
  if (!token || typeof token !== 'string') return '';
  const parts = token.split('.');
  if (parts.length < 2) return '';

  try {
    const payload = decodeBase64Url(parts[1]);
    const data = JSON.parse(payload);
    return String(data.user_id || data.id || data.uid || data.sub || '');
  } catch {
    return '';
  }
};

onShow(() => {
  uni.hideTabBar();

  const storedInfo = uni.getStorageSync('userInfo');
  if (storedInfo) {
    try {
      const parsedUserInfo = typeof storedInfo === 'string' ? JSON.parse(storedInfo) : storedInfo;
      userInfo.value = parsedUserInfo;
      currentUserId.value = String(parsedUserInfo.ID || parsedUserInfo.id || '');
      isLogin.value = true;
    } catch (e) {
      console.error('解析用户信息失败', e);
      userInfo.value = null;
      currentUserId.value = '';
      isLogin.value = false;
    }
  } else {
    userInfo.value = null;
    currentUserId.value = '';
    isLogin.value = false;
  }

  if (!currentUserId.value) {
    currentUserId.value = getUserIdFromToken();
  }
  if (currentUserId.value) {
    isLogin.value = true;
  }

  fetchStats();
});

const fetchStats = async () => {
  try {
    const appointmentsRes = await getMyAppointments().catch(() => ({ data: [] as any }));
    const appointmentList = extractList(appointmentsRes.data);
    appointmentCount.value = appointmentList.length;

    if (!currentUserId.value) {
      publishedCount.value = 0;
      return;
    }

    const itemsRes = await getItems({ page: 1, pageSize: 500 } as any).catch(() => ({ data: [] as any }));
    const allItems = extractList(itemsRes.data);

    publishedCount.value = allItems.filter((item: any) => {
      const isMine = String(item.PublisherID || item.publisher_id) === currentUserId.value;
      return isMine;
    }).length;
  } catch (err) {
    console.error('获取统计数据失败:', err);
  } finally {
    uni.stopPullDownRefresh();
  }
};

const handleLogout = () => {
  uni.showModal({
    title: '提示',
    content: '确定要退出当前账号吗？',
    confirmColor: '#ff4d4f',
    success: (res) => {
      if (res.confirm) {
        uni.removeStorageSync('token');
        uni.removeStorageSync('userInfo');
        uni.reLaunch({
          url: '/pages/auth/login'
        });
      }
    }
  });
};

const goLogin = () => {
  uni.navigateTo({ url: '/pages/auth/login' });
};
</script>

<style lang="scss" scoped>
.profile-container {
  min-height: 100vh;
  background-color: #f7f8fa;
}

.header-section {
  background: linear-gradient(135deg, #07c160, #00b34d);
  padding: calc(var(--status-bar-height) + 40rpx) 40rpx 80rpx;
  border-bottom-left-radius: 40rpx;
  border-bottom-right-radius: 40rpx;

  .user-info {
    display: flex;
    align-items: center;

    .avatar {
      width: 120rpx;
      height: 120rpx;
      border-radius: 60rpx;
      border: 4rpx solid rgba(255, 255, 255, 0.3);
      background-color: #eee;
    }

    .name-box {
      margin-left: 30rpx;

      .username {
        color: #ffffff;
        font-size: 40rpx;
        font-weight: bold;
      }

      .tag {
        margin-top: 10rpx;
        font-size: 22rpx;
        color: rgba(255, 255, 255, 0.9);
        background: rgba(255, 255, 255, 0.2);
        padding: 4rpx 16rpx;
        border-radius: 20rpx;
        display: inline-block;
      }
    }
  }
}

.stats-section {
  display: flex;
  background-color: #ffffff;
  margin: -40rpx 40rpx 0;
  padding: 30rpx 0;
  border-radius: 24rpx;
  box-shadow: 0 8rpx 20rpx rgba(0, 0, 0, 0.05);
  position: relative;
  z-index: 1;

  .stat-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    border-right: 1rpx solid #f0f0f0;

    &:last-child {
      border-right: none;
    }

    .count {
      font-size: 36rpx;
      font-weight: bold;
      color: #333;
    }

    .label {
      font-size: 24rpx;
      color: #999;
      margin-top: 6rpx;
    }
  }
}

.menu-section {
  margin-top: 30rpx;
  background-color: #ffffff;

  :deep(.uni-list-item__container) {
    padding: 30rpx 40rpx;
  }

  .divider {
    height: 20rpx;
    background-color: #f7f8fa;
  }
}

.logout-btn-row {
  margin-top: 20rpx;
  padding-bottom: 200rpx;

  .logout-btn {
    height: 100rpx;
    background-color: #ffffff;
    display: flex;
    justify-content: center;
    align-items: center;
    color: #ff4d4f;
    font-size: 30rpx;
    font-weight: bold;

    &:active {
      background-color: #fafafa;
    }

    &.login-btn {
      color: #07c160;
    }
  }
}
</style>
