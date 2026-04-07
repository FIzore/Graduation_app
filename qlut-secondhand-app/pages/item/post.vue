<template>
  <view class="post-container">
    <!-- 自定义导航栏 -->
    <view class="custom-nav">
      <view class="nav-back" @click="handleCancel">
        <text class="nav-cancel">取消</text>
      </view>
      <text class="nav-title">发布闲置</text>
      <!-- 右侧占位，确保标题绝对居中 -->
      <view class="nav-placeholder"></view>
    </view>

    <scroll-view scroll-y class="post-content">
      <!-- 图片上传区 -->
      <view class="image-section">
        <view class="image-grid">
          <view class="image-item" v-for="(img, index) in formData.images" :key="index">
            <image :src="img" mode="aspectFill" class="img-preview" @click="previewImage(index)"></image>
            <view class="del-badge" @click="removeImage(index)">
              <uni-icons type="closeempty" size="14" color="#fff"></uni-icons>
            </view>
          </view>
          <view class="upload-btn" v-if="formData.images.length < 6" @click="chooseImg">
            <uni-icons type="plusempty" size="40" color="#ccc"></uni-icons>
            <text class="upload-tip">添加图片</text>
          </view>
        </view>
      </view>

      <!-- 文字内容区 -->
      <view class="content-section">
        <input 
          class="title-input" 
          v-model="formData.title" 
          placeholder="给物品起个响亮的标题吧" 
          placeholder-style="color: #ccc;"
        />
        <view class="divider"></view>
        <textarea 
          class="desc-textarea" 
          v-model="formData.content" 
          placeholder="详细描述下物品的成色、来源以及转手原因吧..." 
          placeholder-style="color: #ccc;"
          auto-height
        />
      </view>

      <!-- 底部属性区 -->
      <view class="attribute-section">
        <uni-list :border="false">
          <uni-list-item 
            title="价格" 
            show-extra-icon 
            :extra-icon="{ type: 'wallet-filled', size: '20', color: '#ff4d4f' }"
            :border="false"
          >
            <template v-slot:footer>
              <view class="price-input-wrapper">
                <text class="currency">￥</text>
                <input 
                  type="digit" 
                  class="price-input" 
                  v-model="formData.price" 
                  placeholder="0.00"
                />
              </view>
            </template>
          </uni-list-item>
        </uni-list>
      </view>
      
      <view class="safe-bottom"></view>
    </scroll-view>

    <!-- FAB 悬浮发布按鈕 -->
    <view class="fab-publish-btn" @click="handlePublish">
      <text v-if="!isPublishing">发布</text>
      <text v-else>发布中...</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { uploadImage, createItem } from '../../api/item';

onShow(() => {
  uni.hideTabBar();
});

const isPublishing = ref(false);
const formData = reactive({
  title: '',
  content: '',
  price: '',
  images: [] as string[]
});

const handleCancel = () => {
  uni.switchTab({ url: '/pages/index/index' });
};

const chooseImg = () => {
  uni.chooseImage({
    count: 6 - formData.images.length,
    sizeType: ['compressed'],
    success: async (res) => {
      uni.showLoading({ title: '上传图片中...' });
      try {
        const paths = (res.tempFilePaths as string[]);
        const uploadPromises = paths.map((path: string) => uploadImage(path));
        const urls = await Promise.all(uploadPromises);
        formData.images.push(...urls);
      } catch (e) {
        console.error('上传失败', e);
      } finally {
        uni.hideLoading();
      }
    }
  });
};

const removeImage = (index: number) => {
  formData.images.splice(index, 1);
};

const previewImage = (index: number) => {
  uni.previewImage({
    current: index,
    urls: formData.images
  });
};

const handlePublish = async () => {
  // 防守逻辑：检查图片
  if (formData.images.length === 0) {
    return uni.showToast({ title: '请至少上传一张图片', icon: 'none' });
  }

  if (!formData.title || !formData.content || !formData.price) {
    return uni.showToast({ title: '请完善物品信息', icon: 'none' });
  }

  isPublishing.value = true;
  try {
    const payload = {
      title: formData.title,
      content: formData.content,
      price: parseFloat(formData.price),
      images: formData.images
    };
    
    await createItem(payload);
    uni.showToast({ title: '发布成功', icon: 'success' });
    
    // 延时返回首页
    setTimeout(() => {
      uni.reLaunch({
        url: '/pages/index/index'
      });
    }, 1500);
  } catch (err) {
    console.error('发布失败', err);
  } finally {
    isPublishing.value = false;
  }
};
</script>

<style lang="scss" scoped>
.post-container {
  min-height: 100vh;
  background-color: #f7f8fa;
  display: flex;
  flex-direction: column;
}

.custom-nav {
  height: 88rpx;
  padding-top: var(--status-bar-height);
  background-color: #fff;
  display: flex;
  align-items: center;
  padding-left: 30rpx;
  padding-right: 30rpx;
  
  .nav-back {
    width: 100rpx; // 和右侧占位宽度对称
    
    .nav-cancel {
      font-size: 28rpx;
      color: #666;
    }
  }
  
  .nav-title {
    flex: 1;
    text-align: center;
    font-size: 32rpx;
    font-weight: bold;
    color: #333;
  }
  
  .nav-placeholder {
    width: 100rpx; // 与左侧宽度对称，确保标题绝对居中
  }
}

.post-content {
  flex: 1;
  overflow: hidden;
}

.image-section {
  background-color: #fff;
  padding: 30rpx;
  
  .image-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 20rpx;
  }
  
  .image-item {
    position: relative;
    width: calc((100% - 40rpx) / 3);
    height: 200rpx;
    
    .img-preview {
      width: 100%;
      height: 100%;
      border-radius: 12rpx;
    }
    
    .del-badge {
      position: absolute;
      top: -10rpx;
      right: -10rpx;
      width: 36rpx;
      height: 36rpx;
      background-color: rgba(0, 0, 0, 0.5);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
  
  .upload-btn {
    width: calc((100% - 40rpx) / 3);
    height: 200rpx;
    border: 2rpx dashed #ddd;
    border-radius: 12rpx;
    background-color: #fafafa;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    
    .upload-tip {
      font-size: 22rpx;
      color: #999;
      margin-top: 10rpx;
    }
  }
}

.content-section {
  background-color: #fff;
  padding: 0 30rpx 30rpx;
  margin-top: 2rpx;
  
  .title-input {
    height: 100rpx;
    font-size: 36rpx;
    font-weight: bold;
    color: #333;
  }
  
  .divider {
    height: 1rpx;
    background-color: #f5f5f5;
    margin-bottom: 20rpx;
  }
  
  .desc-textarea {
    width: 100%;
    min-height: 200rpx;
    font-size: 30rpx;
    line-height: 1.6;
    color: #333;
  }
}

.attribute-section {
  margin-top: 20rpx;
  background-color: #fff;
  
  :deep(.uni-list-item__container) {
    padding: 30rpx;
  }
  
  .price-input-wrapper {
    display: flex;
    align-items: center;
    
    .currency {
      color: #ff4d4f;
      font-size: 32rpx;
      font-weight: bold;
    }
    
    .price-input {
      width: 150rpx;
      text-align: right;
      color: #ff4d4f;
      font-size: 32rpx;
      font-weight: bold;
    }
  }
}

.safe-bottom {
  height: 200rpx; // 提高底部空白，防止 FAB 递盖内容
}

// FAB 悬浮发布按鈕
.fab-publish-btn {
  position: fixed;
  right: 40rpx;
  bottom: calc(env(safe-area-inset-bottom) + 60rpx);
  width: 160rpx;
  height: 80rpx;
  background-color: #07c160;
  color: #ffffff;
  font-size: 32rpx;
  font-weight: bold;
  border-radius: 40rpx;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 8rpx 16rpx rgba(7, 193, 96, 0.3);
  z-index: 999;
  
  // 点击反馈
  &:active {
    opacity: 0.85;
    transform: scale(0.96);
  }
}
</style>
