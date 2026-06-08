<template>
  <view class="post-container">
    <view class="custom-nav" :style="{ paddingTop: navMetrics.paddingTop + 'px', paddingRight: navMetrics.paddingRight + 'px' }">
      <view class="nav-back" @click="handleCancel">
        <text class="nav-cancel">取消</text>
      </view>
      <text class="nav-title">{{ isEditMode ? '编辑闲置' : '发布闲置' }}</text>
      <view class="nav-placeholder"></view>
    </view>

    <scroll-view scroll-y class="post-content">
      <view class="image-section">
        <view class="image-grid">
          <view class="image-item" v-for="(img, index) in formData.images" :key="`${img}-${index}`">
            <image :src="formatImageUrl(img)" mode="aspectFill" class="img-preview" @click="previewImage(index)"></image>
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

      <view class="content-section">
        <input
          class="title-input"
          v-model="formData.title"
          placeholder="给物品起一个清楚的标题"
          placeholder-style="color: #ccc;"
        />
        <view class="divider"></view>
        <textarea
          class="desc-textarea"
          v-model="formData.content"
          placeholder="描述成色、来源、转手原因和线下交接说明"
          placeholder-style="color: #ccc;"
          auto-height
        />
      </view>

      <view class="attribute-section">
        <uni-list :border="false">
          <picker :range="categoryOptions" range-key="label" @change="handleCategoryChange">
            <uni-list-item
              title="分类"
              show-extra-icon
              :extra-icon="{ type: 'list', size: '20', color: '#07c160' }"
              :border="false"
            >
              <template v-slot:footer>
                <text class="category-value" :class="{ placeholder: !formData.category }">
                  {{ categoryLabel || '请选择分类' }}
                </text>
              </template>
            </uni-list-item>
          </picker>
          <uni-list-item
            title="价格"
            show-extra-icon
            :extra-icon="{ type: 'wallet-filled', size: '20', color: '#ff4d4f' }"
            :border="false"
          >
            <template v-slot:footer>
              <view class="price-input-wrapper">
                <text class="currency">¥</text>
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

    <view class="fab-publish-btn" :class="{ disabled: isPublishing }" @click="handlePublish">
      <text v-if="!isPublishing">{{ isEditMode ? '保存' : '发布' }}</text>
      <text v-else>{{ isEditMode ? '保存中...' : 'AI 审核中...' }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { onHide, onLoad, onShow } from '@dcloudio/uni-app';
import { createItem, getItemDetail, updateItem, uploadImage, type CreateItemPayload, type Item, type ItemDetailResponse } from '../../api/item';
import { formatImageUrl as normalizeImageUrl, parseImages } from '../../utils/image';
import { getCustomNavMetrics } from '../../utils/navigation';
import type { RequestError } from '../../utils/request';

const EDIT_DRAFT_KEY = 'editingItemDraft';

const navMetrics = getCustomNavMetrics();

const categoryOptions = [
  { value: 'book', label: '图书教材' },
  { value: 'digital', label: '数码产品' },
  { value: 'daily', label: '生活用品' },
  { value: 'sports', label: '体育器材' },
  { value: 'other', label: '其他' }
];

const isPublishing = ref(false);
const uploadingCount = ref(0);
const editingItemId = ref(0);
const editLoadedId = ref(0);

const categoryNameMap: Record<string, string> = {
  book: '\u56fe\u4e66',
  digital: '\u7535\u5b50\u4ea7\u54c1',
  daily: '\u751f\u6d3b\u7528\u54c1',
  sports: '\u4f53\u80b2\u5668\u6750',
  other: '\u5176\u4ed6'
};

const getCategoryName = (category?: string) => {
  return categoryNameMap[String(category || '')] || String(category || '');
};

const formData = reactive({
  title: '',
  content: '',
  price: '',
  images: [] as string[],
  category: ''
});

const isEditMode = computed(() => editingItemId.value > 0);

const categoryLabel = computed(() => {
  return categoryOptions.find((item) => item.value === formData.category)?.label || '';
});

const resetForm = () => {
  editingItemId.value = 0;
  editLoadedId.value = 0;
  formData.title = '';
  formData.content = '';
  formData.price = '';
  formData.images = [];
  formData.category = '';
};

const extractDetailItem = (raw: Item | ItemDetailResponse | undefined): Item | undefined => {
  if (!raw) return undefined;
  return (raw as ItemDetailResponse)?.item || (raw as Item);
};

const fillFormFromItem = (item: Partial<Item>) => {
  editingItemId.value = Number(item.id || 0);
  editLoadedId.value = editingItemId.value;
  formData.title = String(item.title || '');
  formData.content = String(item.content || '');
  formData.price = item.price === undefined || item.price === null ? '' : String(item.price);
  formData.images = parseImages(item.images);
  formData.category = String(item.category || '');
};

const loadEditDraft = async (id: number, draft?: Partial<Item>) => {
  if (!id || editLoadedId.value === id) return;

  if (draft && Number(draft.id) === id) {
    fillFormFromItem(draft);
    return;
  }

  try {
    uni.showLoading({ title: '加载中' });
    const res = await getItemDetail(id);
    const item = extractDetailItem(res.data);
    if (!item) throw new Error('empty item detail');
    fillFormFromItem(item);
  } catch (error) {
    console.error('加载编辑物品失败', error);
    uni.showToast({ title: '加载物品失败', icon: 'none' });
  } finally {
    uni.hideLoading();
  }
};

const loadEditStateFromStorage = async () => {
  const draft = uni.getStorageSync(EDIT_DRAFT_KEY) as Partial<Item> | '';
  const draftId = Number((draft as Partial<Item>)?.id || 0);

  if (draftId) {
    await loadEditDraft(draftId, draft as Partial<Item>);
    return;
  }

  if (isEditMode.value) return;
  resetForm();
};

onLoad(async (options: any) => {
  const id = Number(options?.id || 0);
  if (id) {
    await loadEditDraft(id);
  }
});

onShow(() => {
  uni.hideTabBar();
  loadEditStateFromStorage();
});

onHide(() => {
  uni.showTabBar();
});

const handleCancel = () => {
  if (isEditMode.value) {
    uni.removeStorageSync(EDIT_DRAFT_KEY);
    resetForm();
    backToPublishedList();
    return;
  }

  resetForm();
  uni.switchTab({ url: '/pages/index/index' });
};

const backToPublishedList = () => {
  uni.switchTab({
    url: '/pages/profile/profile',
    success: () => {
      setTimeout(() => {
        uni.navigateTo({ url: '/pages/profile/published' });
      }, 0);
    }
  });
};

const chooseImg = () => {
  uni.chooseImage({
    count: 6 - formData.images.length,
    sizeType: ['compressed'],
    success: async (res) => {
      const paths = res.tempFilePaths as string[];
      if (!paths.length) return;
      uploadingCount.value = 0;
      uni.showLoading({ title: `上传 0/${paths.length}` });
      try {
        const urls: string[] = [];
        for (const path of paths) {
          const url = await uploadImage(path);
          urls.push(url);
          uploadingCount.value += 1;
          uni.showLoading({ title: `上传 ${uploadingCount.value}/${paths.length}` });
        }
        formData.images.push(...urls.filter(Boolean));
      } catch (e) {
        console.error('图片上传失败', e);
        uni.showToast({ title: `图片上传失败，请重试 (${uploadingCount.value}/${paths.length})`, icon: 'none' });
      } finally {
        uni.hideLoading();
        uploadingCount.value = 0;
      }
    }
  });
};

const removeImage = (index: number) => {
  formData.images.splice(index, 1);
};

const handleCategoryChange = (e: any) => {
  const index = Number(e.detail.value);
  const selected = categoryOptions[index];
  if (selected) {
    formData.category = selected.value;
  }
};

const formatImageUrl = (path: string) => {
  return normalizeImageUrl(path);
};

const previewImage = (index: number) => {
  uni.previewImage({
    current: index,
    urls: formData.images.map((img) => formatImageUrl(img))
  });
};

const validateForm = () => {
  if (formData.images.length === 0) {
    uni.showToast({ title: '请至少上传一张图片', icon: 'none' });
    return false;
  }

  if (!formData.title.trim() || !formData.content.trim() || !formData.price) {
    uni.showToast({ title: '请完善物品信息', icon: 'none' });
    return false;
  }

  const price = Number(formData.price);
  if (!Number.isFinite(price) || price < 0) {
    uni.showToast({ title: '请输入有效价格', icon: 'none' });
    return false;
  }

  if (!formData.category) {
    uni.showToast({ title: '请选择物品分类', icon: 'none' });
    return false;
  }

  return true;
};

const goAfterSave = () => {
  setTimeout(() => {
    if (isEditMode.value) {
      resetForm();
      backToPublishedList();
      return;
    }
    resetForm();
    uni.switchTab({ url: '/pages/index/index' });
  }, 900);
};

const handlePublish = async () => {
  if (isPublishing.value || !validateForm()) return;

  isPublishing.value = true;
  try {
    const payload: CreateItemPayload = {
      title: formData.title.trim(),
      content: formData.content.trim(),
      price: Number(formData.price),
      images: [...formData.images],
      category: formData.category
    };

    if (isEditMode.value) {
      await updateItem(editingItemId.value, payload);
      uni.removeStorageSync(EDIT_DRAFT_KEY);
      uni.showToast({ title: '物品信息已更新', icon: 'none' });
      goAfterSave();
      return;
    }

    const res = await createItem(payload);
    const ai = res.data?.ai;
    const finalCategory = res.data?.finalCategory;
    if (ai?.available && finalCategory && finalCategory !== formData.category) {
      uni.showToast({ title: `AI 建议分类：${getCategoryName(finalCategory)}`, icon: 'none', duration: 2500 });
      goAfterSave();
      return;
    }
    if (ai?.available && finalCategory && finalCategory !== formData.category) {
      uni.showToast({ title: `AI 建议分类：${finalCategory}`, icon: 'none', duration: 2500 });
    } else if (ai?.message) {
      uni.showToast({ title: ai.message, icon: 'none', duration: 2500 });
    } else {
      uni.showToast({ title: '发布成功', icon: 'none' });
    }
    goAfterSave();
  } catch (err) {
    const requestError = err as RequestError;
    if (requestError.code === 403) {
      uni.showToast({
        title: requestError.msg || requestError.message || '发布内容不符合规范',
        icon: 'none',
        duration: 3000
      });
      return;
    }

    console.error(isEditMode.value ? '保存失败' : '发布失败', err);
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
  background-color: #fff;
  display: flex;
  align-items: center;
  padding-left: 30rpx;

  .nav-back {
    width: 100rpx;

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
    width: 100rpx;
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
    margin: -10rpx;
  }

  .image-item {
    position: relative;
    width: calc((100% - 60rpx) / 3);
    height: 200rpx;
    margin: 10rpx;

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
    width: calc((100% - 60rpx) / 3);
    height: 200rpx;
    margin: 10rpx;
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

  .category-value {
    color: #333;
    font-size: 28rpx;
    font-weight: 500;

    &.placeholder {
      color: #c0c4cc;
      font-weight: normal;
    }
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
  height: 200rpx;
}

.fab-publish-btn {
  position: fixed;
  right: 40rpx;
  bottom: calc(env(safe-area-inset-bottom) + 60rpx);
  min-width: 160rpx;
  height: 80rpx;
  padding: 0 28rpx;
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

  &.disabled {
    opacity: 0.72;
  }

  &:active {
    opacity: 0.85;
    transform: scale(0.96);
  }
}
</style>
