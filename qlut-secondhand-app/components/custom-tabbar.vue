<template>
  <view class="tabbar-container">
    <view class="tabbar-placeholder"></view>
    <view class="tabbar-content">
      <!-- 首页 -->
      <view class="tab-item" :class="{ active: active === 'index' }" @click="switchTab('index')">
        <uni-icons :type="active === 'index' ? 'home-filled' : 'home'" size="24" :color="active === 'index' ? '#07c160' : '#999'"></uni-icons>
        <text class="tab-text">首页</text>
      </view>
      
      <!-- 消息 -->
      <view class="tab-item" :class="{ active: active === 'message' }" @click="switchTab('message')">
        <uni-icons :type="active === 'message' ? 'chat-filled' : 'chat'" size="24" :color="active === 'message' ? '#07c160' : '#999'"></uni-icons>
        <text class="tab-text">消息</text>
      </view>
      
      <!-- 发布 -->
      <view class="tab-item" :class="{ active: active === 'post' }" @click="switchTab('post')">
        <uni-icons :type="active === 'post' ? 'plusempty' : 'plusempty'" size="24" :color="active === 'post' ? '#07c160' : '#999'"></uni-icons>
        <text class="tab-text">发布</text>
      </view>
      
      <!-- 我的 -->
      <view class="tab-item" :class="{ active: active === 'me' }" @click="switchTab('me')">
        <uni-icons :type="active === 'me' ? 'person-filled' : 'person'" size="24" :color="active === 'me' ? '#07c160' : '#999'"></uni-icons>
        <text class="tab-text">我的</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 自定义底部导航栏组件
 * @property {string} active 当前激活页面的标识符 ('index' | 'message' | 'post' | 'me')
 */
const props = defineProps<{
  active: 'index' | 'message' | 'post' | 'me'
}>();

const switchTab = (tab: string) => {
  if (tab === props.active) return;
  
  const urls: Record<string, string> = {
    index: '/pages/index/index',
    message: '/pages/message/message',
    post: '/pages/item/post',
    me: '/pages/profile/profile'
  };
  
  uni.switchTab({
    url: urls[tab]
  });
};
</script>

<style lang="scss" scoped>
.tabbar-container {
  .tabbar-placeholder {
    height: calc(110rpx + env(safe-area-inset-bottom));
  }
  
  .tabbar-content {
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    height: calc(110rpx + env(safe-area-inset-bottom));
    background-color: #ffffff;
    display: flex;
    align-items: flex-start;
    padding-bottom: env(safe-area-inset-bottom);
    box-shadow: 0 -2rpx 20rpx rgba(0, 0, 0, 0.05);
    z-index: 999;
  }
  
  .tab-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 110rpx;
    padding-top: 10rpx;
    
    .tab-text {
      font-size: 20rpx;
      color: #999;
      margin-top: 4rpx;
      transition: color 0.3s;
    }
    
    &.active {
      .tab-text {
        color: #07c160;
        font-weight: bold;
      }
    }
  }
}
</style>
