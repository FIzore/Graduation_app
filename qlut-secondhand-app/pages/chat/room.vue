<template>
  <view class="room-container">
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-back" @click="goBack">
        <uni-icons type="back" size="22" color="#333"></uni-icons>
      </view>
      <view class="nav-center">
        <text class="nav-title">{{ nickname }}</text>
        <text class="nav-sub" v-if="itemTitle">{{ itemTitle }}</text>
      </view>
      <view class="nav-placeholder"></view>
    </view>

    <view v-if="itemId" class="context-anchor" :style="{ top: navAnchorTop + 'px' }">
      <image class="anchor-cover" :src="itemCover || '/static/default.png'" mode="aspectFill"></image>
      <view class="anchor-main">
        <text class="anchor-title">{{ itemTitle || '当前沟通物品' }}</text>
        <text class="anchor-price" v-if="itemPrice">约 {{ itemPrice }}</text>
      </view>
      <view class="anchor-action" @click="goToDetail">
        <text class="anchor-action-text">查看详情</text>
      </view>
    </view>

    <scroll-view
      class="msg-list"
      scroll-y
      :scroll-top="scrollTop"
      :scroll-with-animation="true"
      @scrolltoupper="onScrollToUpper"
    >
      <view class="msg-content" :class="{ 'with-anchor': itemId }">
        <view class="loading-hint" v-if="loadingHistory">
          <text>加载中...</text>
        </view>
        <view class="msg-item" v-for="msg in messages" :key="msg.id" :class="msg.isMine ? 'msg-right' : 'msg-left'">
          <image
            v-if="!msg.isMine"
            class="msg-avatar"
            :src="otherAvatar || '/static/default-avatar.png'"
            mode="aspectFill"
          ></image>

          <view class="msg-bubble" :class="msg.isMine ? 'bubble-mine' : 'bubble-other'">
            <text class="msg-text">{{ msg.content }}</text>
          </view>

          <image
            v-if="msg.isMine"
            class="msg-avatar"
            src="/static/default-avatar.png"
            mode="aspectFill"
          ></image>
        </view>

        <view class="msg-end" v-if="messages.length === 0">
          <text class="end-text">暂无消息，发送第一条问候吧</text>
        </view>
      </view>
    </scroll-view>

    <view class="input-bar" :style="{ bottom: keyboardHeight + 'px' }">
      <input
        class="msg-input"
        v-model="inputText"
        placeholder="输入消息..."
        confirm-type="send"
        :adjust-position="false"
        @confirm="handleSend"
        @focus="onInputFocus"
        @blur="onInputBlur"
      />
      <view class="send-btn" @click="handleSend" v-if="inputText.trim()">
        <text class="send-text">发送</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue';
import { onLoad, onUnload } from '@dcloudio/uni-app';
import { useWebSocket } from '../../utils/websocket';
import { conversationStore } from '../../store/conversation';
import { getChatHistory } from '../../api/chat';

interface ChatMsg {
  id: number;
  fromId: number;
  toId: number;
  content: string;
  createdAt: string;
  isMine: boolean;
}

const ws = useWebSocket();
const statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 20;
const PAGE_SIZE = 20;
const navBarHeight = 88;
const anchorOffset = 16;

const myId = ref(0);
const userId = ref(0);
const nickname = ref('聊天');
const itemId = ref(0);
const itemTitle = ref('');
const itemCover = ref('');
const itemPrice = ref('');
const otherAvatar = ref('');
const messages = ref<ChatMsg[]>([]);
const inputText = ref('');
const keyboardHeight = ref(0);
const scrollTop = ref(0);
const loadingHistory = ref(false);

const historyPage = ref(1);
const noMoreHistory = ref(false);
let msgIdCounter = 0;
const loadedMsgKeys: Set<string> = new Set();
const navAnchorTop = statusBarHeight + navBarHeight;

const scrollToBottom = () => {
  nextTick(() => {
    scrollTop.value = 99999;
  });
};

const pushMessage = (msg: Omit<ChatMsg, 'id'>) => {
  messages.value.push({ ...msg, id: ++msgIdCounter });
  scrollToBottom();
};

const loadInitialHistory = async () => {
  loadingHistory.value = true;
  uni.showLoading({ title: '加载中...' });
  try {
    const res = await getChatHistory(userId.value, 1, PAGE_SIZE, itemId.value);
    const data = res.data;
    const msgs = Array.isArray(data) ? data : (data as any)?.messages ?? (data as any)?.list ?? [];
    const arr = Array.isArray(msgs) ? msgs.reverse() : [];
    if (arr.length < PAGE_SIZE) noMoreHistory.value = true;
    arr.forEach((m: any) => {
      const key = [m.fromId ?? m.FromId, m.toId ?? m.ToId, m.content ?? m.Content, m.createdAt ?? m.CreatedAt].join('-');
      loadedMsgKeys.add(key);
      messages.value.push({
        id: ++msgIdCounter,
        fromId: Number(m.fromId ?? m.FromId ?? 0),
        toId: Number(m.toId ?? m.ToId ?? 0),
        content: (m.content ?? m.Content ?? '') as string,
        createdAt: (m.createdAt ?? m.CreatedAt ?? '') as string,
        isMine: (m.fromId ?? m.FromId) == myId.value,
      });
    });
    scrollToBottom();
  } catch (e) {
    console.error('[chat] load history failed:', e);
  } finally {
    loadingHistory.value = false;
    uni.hideLoading();
  }
};

const loadMoreHistory = async () => {
  if (loadingHistory.value || noMoreHistory.value) return;
  loadingHistory.value = true;
  try {
    historyPage.value++;
    const res = await getChatHistory(userId.value, historyPage.value, PAGE_SIZE, itemId.value);
    const data = res.data;
    const msgs = Array.isArray(data) ? data : (data as any)?.messages ?? (data as any)?.list ?? [];
    const arr = Array.isArray(msgs) ? msgs.reverse() : [];
    if (arr.length === 0) {
      noMoreHistory.value = true;
      return;
    }
    const prepend: ChatMsg[] = [];
    arr.forEach((m: any) => {
      const key = [m.fromId ?? m.FromId, m.toId ?? m.ToId, m.content ?? m.Content, m.createdAt ?? m.CreatedAt].join('-');
      if (loadedMsgKeys.has(key)) return;
      loadedMsgKeys.add(key);
      prepend.push({
        id: ++msgIdCounter,
        fromId: Number(m.fromId ?? m.FromId ?? 0),
        toId: Number(m.toId ?? m.ToId ?? 0),
        content: (m.content ?? m.Content ?? '') as string,
        createdAt: (m.createdAt ?? m.CreatedAt ?? '') as string,
        isMine: (m.fromId ?? m.FromId) == myId.value,
      });
    });
    messages.value = [...prepend, ...messages.value];
  } catch (e) {
    historyPage.value--;
    console.error('[chat] load more history failed:', e);
  } finally {
    loadingHistory.value = false;
  }
};

const handleSocketMsg = (msg: any) => {
  const fromId = Number(msg.fromId ?? msg.FromId ?? 0);
  const toId = Number(msg.toId ?? msg.ToId ?? 0);
  const content = (msg.content ?? msg.Content ?? '') as string;
  const createdAt = (msg.createdAt ?? msg.CreatedAt ?? new Date().toISOString()) as string;
  if (!content) return;

  const key = [fromId, toId, content, createdAt].join('-');
  if (loadedMsgKeys.has(key)) return;
  loadedMsgKeys.add(key);

  const isFromPeer = fromId === userId.value && toId === myId.value;
  const isFromMe = fromId === myId.value && toId === userId.value;

  if (isFromPeer) {
    pushMessage({ fromId, toId, content, createdAt, isMine: false });
  } else if (isFromMe) {
    pushMessage({ fromId, toId, content, createdAt, isMine: true });
  }
};

const handleSend = () => {
  const text = inputText.value.trim();
  if (!text) return;
  const payload: Record<string, unknown> = { toId: userId.value, content: text };
  if (itemId.value) payload.itemId = itemId.value;
  ws.send(payload);
  const now = new Date().toISOString();
  pushMessage({
    fromId: myId.value,
    toId: userId.value,
    content: text,
    createdAt: now,
    isMine: true,
  });
  conversationStore.updateConversation({
    fromId: myId.value,
    toId: userId.value,
    content: text,
    createdAt: now,
    itemId: itemId.value,
    nickname: nickname.value,
    itemTitle: itemTitle.value,
    itemCover: itemCover.value,
  });
  inputText.value = '';
};

const onInputFocus = (e: any) => {
  if (e.detail?.height) {
    keyboardHeight.value = e.detail.height;
    scrollToBottom();
  }
};

const onInputBlur = () => {
  keyboardHeight.value = 0;
};

const onScrollToUpper = () => {
  loadMoreHistory();
};

const goBack = () => {
  uni.navigateBack();
};

const goToDetail = () => {
  if (!itemId.value) return;
  uni.navigateTo({
    url: `/pages/item/detail?id=${itemId.value}`
  });
};

onLoad(async (options: any) => {
  const uid = Number(options.userId);
  if (!uid) {
    uni.showToast({ title: '参数错误', icon: 'none' });
    setTimeout(() => uni.navigateBack(), 1000);
    return;
  }
  userId.value = uid;
  nickname.value = decodeURIComponent(options.nickname || '用户' + uid);
  itemId.value = Number(options.itemId || 0);
  if (!itemId.value) {
    uni.showToast({ title: '缺少物品上下文', icon: 'none' });
    setTimeout(() => uni.navigateBack(), 1000);
    return;
  }
  itemTitle.value = decodeURIComponent(options.itemTitle || '');
  itemCover.value = decodeURIComponent(options.itemCover || '');
  itemPrice.value = decodeURIComponent(options.itemPrice || '');
  otherAvatar.value = itemCover.value || '/static/default-avatar.png';
  myId.value = conversationStore.getMyUserId();
  conversationStore.markRead(uid, itemId.value);

  await loadInitialHistory();
  ws.on('message', handleSocketMsg);
});

onUnload(() => {
  ws.off('message', handleSocketMsg);
  conversationStore.markRead(userId.value, itemId.value);
});
</script>

<style lang="scss" scoped>
.room-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f5f5;
}

.nav-bar {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 20rpx;
  background-color: #fff;
  border-bottom: 1rpx solid #eee;
  z-index: 10;

  .nav-back {
    width: 60rpx;
    height: 60rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .nav-center {
    display: flex;
    flex-direction: column;
    align-items: center;
    overflow: hidden;
  }

  .nav-title {
    font-size: 32rpx;
    font-weight: bold;
    color: #333;
  }

  .nav-sub {
    font-size: 22rpx;
    color: #999;
    margin-top: 2rpx;
    max-width: 400rpx;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .nav-placeholder {
    width: 60rpx;
  }
}

.context-anchor {
  position: fixed;
  left: 20rpx;
  right: 20rpx;
  height: 88rpx;
  background: rgba(255, 255, 255, 0.96);
  border: 1rpx solid rgba(0, 0, 0, 0.05);
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  padding: 0 18rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.06);
  z-index: 9;
}

.anchor-cover {
  width: 56rpx;
  height: 56rpx;
  border-radius: 12rpx;
  background-color: #f0f0f0;
  flex-shrink: 0;
}

.anchor-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  margin: 0 16rpx;
}

.anchor-title {
  font-size: 24rpx;
  color: #333;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.anchor-price {
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #ff4d4f;
}

.anchor-action {
  flex-shrink: 0;
  padding: 10rpx 18rpx;
  background-color: rgba(7, 193, 96, 0.1);
  border-radius: 999rpx;
}

.anchor-action-text {
  font-size: 22rpx;
  color: #07c160;
  font-weight: 500;
}

.msg-list {
  flex: 1;
  padding: 20rpx 24rpx;
  overflow-y: auto;
  box-sizing: border-box;
}

.msg-content {
  min-height: 100%;
}

.msg-content.with-anchor {
  margin-top: 160rpx !important;
}

.msg-item {
  display: flex;
  align-items: flex-start;
  margin-bottom: 30rpx;

  &.msg-left {
    flex-direction: row;
  }

  &.msg-right {
    flex-direction: row-reverse;
  }
}

.msg-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background-color: #e0e0e0;
  flex-shrink: 0;
}

.msg-bubble {
  max-width: 480rpx;
  padding: 18rpx 24rpx;
  border-radius: 16rpx;
  margin: 0 14rpx;
  word-break: break-all;

  .msg-text {
    font-size: 30rpx;
    line-height: 1.5;
    color: #333;
  }
}

.bubble-other {
  background-color: #fff;
  border-top-left-radius: 4rpx;
}

.bubble-mine {
  background-color: #95ec69;
  border-top-right-radius: 4rpx;
}

.msg-end {
  display: flex;
  justify-content: center;
  padding: 60rpx 0;

  .end-text {
    font-size: 26rpx;
    color: #ccc;
  }
}

.loading-hint {
  display: flex;
  justify-content: center;
  padding: 20rpx 0;

  text {
    font-size: 24rpx;
    color: #999;
  }
}

.input-bar {
  display: flex;
  align-items: center;
  padding: 16rpx 20rpx;
  background-color: #fff;
  border-top: 1rpx solid #eee;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));

  .msg-input {
    flex: 1;
    height: 72rpx;
    background-color: #f5f5f5;
    border-radius: 8rpx;
    padding: 0 20rpx;
    font-size: 30rpx;
  }

  .send-btn {
    margin-left: 16rpx;
    padding: 14rpx 28rpx;
    background-color: #07c160;
    border-radius: 8rpx;

    .send-text {
      font-size: 28rpx;
      color: #fff;
      font-weight: bold;
    }
  }
}
</style>
