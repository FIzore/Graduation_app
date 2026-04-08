<template>
  <view class="auth-container">
    <view class="header-section">
      <view class="logo-placeholder"></view>
      <text class="slogan">让校园闲置流动起来</text>
      <text class="sub-slogan">极简 · 高效 · 校园信息撮合</text>
    </view>

    <view class="form-card">
      <view class="tab-header">
        <text class="tab-item" :class="{ active: isLogin }" @click="isLogin = true">登录</text>
        <text class="tab-item" :class="{ active: !isLogin }" @click="isLogin = false">注册</text>
      </view>

      <view class="input-group">
        <view class="input-item">
          <uni-icons type="person" size="20" color="#999"></uni-icons>
          <input
            type="text"
            v-model="formData.student_id"
            placeholder="请输入学号（10-12位）"
            placeholder-class="placeholder"
          />
        </view>
        <view class="input-item">
          <uni-icons type="locked" size="20" color="#999"></uni-icons>
          <input
            :password="!showPassword"
            v-model="formData.password"
            placeholder="请输入密码（至少6位）"
            placeholder-class="placeholder"
          />
          <uni-icons
            :type="showPassword ? 'eye-filled' : 'eye-slash-filled'"
            size="20"
            color="#ccc"
            @click="showPassword = !showPassword"
          ></uni-icons>
        </view>
      </view>

      <button class="submit-btn" :loading="loading" @click="handleSubmit">
        {{ isLogin ? '进入平台' : '立即注册' }}
      </button>

      <view class="agreement-row" v-if="!isLogin">
        <checkbox :value="agreed" @click="agreed = !agreed" color="#007aff" style="transform:scale(0.7)"/>
        <text class="agreement-text">同意《校园平台服务协议》</text>
      </view>
    </view>

    <view class="footer-section">
      <view class="divider">
        <view class="line"></view>
        <text class="divider-text">其他进入方式</text>
        <view class="line"></view>
      </view>
      <view class="oauth-group">
        <view class="oauth-item" @click="handleWeChatAuth">
          <view class="icon-wrapper">
            <uni-icons type="weixin" size="32" color="#07c160"></uni-icons>
          </view>
          <text class="oauth-name">微信一键进入</text>
        </view>
      </view>
    </view>

    <view class="back-home" @click="goHome">
      <text>返回首页</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { login, register, bindWeChat } from '../../api/user';

const isLogin = ref(true);
const loading = ref(false);
const showPassword = ref(false);
const agreed = ref(false);

const formData = reactive({
  student_id: '',
  password: ''
});

const handleSubmit = async () => {
  if (!formData.student_id || !formData.password) {
    return uni.showToast({ title: '请填写完整信息', icon: 'none' });
  }

  if (!isLogin.value && !agreed.value) {
    return uni.showToast({ title: '请阅读并同意协议', icon: 'none' });
  }

  loading.value = true;
  try {
    if (isLogin.value) {
      const res = await login(formData);
      uni.setStorageSync('token', res.data.token);
      if (res.data.user) {
        uni.setStorageSync('userInfo', res.data.user);
      }

      uni.showToast({ title: '欢迎回来', icon: 'success' });
      uni.$emit('loginSuccess');

      setTimeout(() => {
        uni.reLaunch({ url: '/pages/index/index' });
      }, 1000);
    } else {
      await register(formData);
      uni.showToast({ title: '注册成功，请登录', icon: 'success' });
      isLogin.value = true;
    }
  } catch (err) {
    console.error(err);
  } finally {
    loading.value = false;
  }
};

const handleWeChatAuth = () => {
  uni.login({
    provider: 'weixin',
    success: async (res) => {
      console.log('WeChat login code:', res.code);

      const token = uni.getStorageSync('token');
      if (!token) {
        return uni.showModal({
          title: '绑定提示',
          content: '请先使用账号登录系统，登录成功后即可完成微信绑定',
          showCancel: false,
          confirmText: '去登录'
        });
      }

      try {
        await bindWeChat(res.code);
        uni.showToast({ title: '微信绑定成功', icon: 'success' });
      } catch (err) {
        console.error('绑定失败', err);
      }
    },
    fail: () => {
      uni.showToast({ title: '微信授权失败', icon: 'none' });
    }
  });
};

const goHome = () => {
  uni.reLaunch({ url: '/pages/index/index' });
};
</script>

<style lang="scss" scoped>
.auth-container {
  min-height: 100vh;
  background-color: #ffffff;
  padding: 0 60rpx;
  display: flex;
  flex-direction: column;
  position: relative;
}

.header-section {
  padding-top: 160rpx;
  padding-bottom: 80rpx;
  text-align: center;

  .logo-placeholder {
    width: 120rpx;
    height: 120rpx;
    background: linear-gradient(135deg, #007aff, #00c6ff);
    border-radius: 30rpx;
    margin: 0 auto 40rpx;
    box-shadow: 0 10rpx 30rpx rgba(0, 122, 255, 0.2);
  }

  .slogan {
    font-size: 44rpx;
    font-weight: bold;
    color: #333;
    display: block;
    margin-bottom: 12rpx;
    letter-spacing: 2rpx;
  }

  .sub-slogan {
    font-size: 24rpx;
    color: #999;
  }
}

.form-card {
  .tab-header {
    display: flex;
    justify-content: center;
    margin-bottom: 60rpx;

    .tab-item {
      font-size: 32rpx;
      color: #999;
      margin: 0 40rpx;
      position: relative;
      padding-bottom: 10rpx;
      transition: all 0.3s;

      &.active {
        color: #007aff;
        font-weight: bold;

        &::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 40rpx;
          height: 6rpx;
          background-color: #007aff;
          border-radius: 3rpx;
        }
      }
    }
  }

  .input-group {
    background-color: #f7f8fa;
    border-radius: 40rpx;
    padding: 10rpx 30rpx;
    margin-bottom: 40rpx;

    .input-item {
      display: flex;
      align-items: center;
      height: 100rpx;
      padding: 0 10rpx;

      &:first-child {
        border-bottom: 2rpx solid #eee;
      }

      input {
        flex: 1;
        margin-left: 20rpx;
        font-size: 28rpx;
        color: #333;
      }

      .placeholder {
        color: #ccc;
      }
    }
  }

  .submit-btn {
    width: 100%;
    height: 100rpx;
    line-height: 100rpx;
    background: linear-gradient(to right, #007aff, #00a2ff);
    color: #fff;
    font-size: 32rpx;
    font-weight: bold;
    border-radius: 50rpx;
    border: none;
    box-shadow: 0 10rpx 20rpx rgba(0, 122, 255, 0.15);
    margin-top: 40rpx;

    &:active {
      opacity: 0.9;
      transform: scale(0.98);
    }
  }

  .agreement-row {
    margin-top: 30rpx;
    display: flex;
    align-items: center;
    justify-content: center;

    .agreement-text {
      font-size: 24rpx;
      color: #999;
      margin-left: 10rpx;
    }
  }
}

.footer-section {
  margin-top: auto;
  padding-bottom: 100rpx;

  .divider {
    display: flex;
    align-items: center;
    margin-bottom: 40rpx;

    .line {
      flex: 1;
      height: 1rpx;
      background-color: #eee;
    }

    .divider-text {
      font-size: 24rpx;
      color: #ccc;
      margin: 0 30rpx;
    }
  }

  .oauth-group {
    display: flex;
    justify-content: center;

    .oauth-item {
      display: flex;
      flex-direction: column;
      align-items: center;

      .icon-wrapper {
        width: 100rpx;
        height: 100rpx;
        background-color: #f7f8fa;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 16rpx;
        transition: all 0.3s;

        &:active {
          background-color: #ededed;
        }
      }

      .oauth-name {
        font-size: 22rpx;
        color: #999;
      }
    }
  }
}

.back-home {
  position: absolute;
  top: 60rpx;
  right: 40rpx;
  padding: 20rpx;
  font-size: 26rpx;
  color: #999;
}
</style>
