<template>
  <view class="container">
    <text>个人中心开发中...</text>
    <custom-tabbar active="me" />
  </view>
</template>

<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';
import CustomTabbar from '../../components/custom-tabbar.vue';

onShow(() => {
  uni.hideTabBar();
});
</script>

<style scoped>
.container {
  padding: 100rpx;
  text-align: center;
}
</style>
