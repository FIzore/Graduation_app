<template>
  <view class="room-container">
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-back" @click="goBack">
        <uni-icons type="back" size="22" color="#333"></uni-icons>
      </view>
      <text class="nav-title">{{ nickname }}</text>
      <view class="nav-placeholder"></view>
    </view>

    <scroll-view
      class="msg-list"
      scroll-y
      :scroll-top="scrollTop"
      :scroll-with-animation="true"
      @scrolltoupper="onScrollToUpper"
    >
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

const myId = ref(0);
const userId = ref(0);
const nickname = ref('聊天');
const otherAvatar = ref('');
const messages = ref<ChatMsg[]>([]);
const inputText = ref('');
const keyboardHeight = ref(0);
const scrollTop = ref(0);
let msgIdCounter = 0;

const scrollToBottom = () => {
  nextTick(() => {
    scrollTop.value = 99999;
  });
};

const pushMessage = (msg: Omit<ChatMsg, 'id'>) => {
  messages.value.push({ ...msg, id: ++msgIdCounter });
  scrollToBottom();
};

const handleSocketMsg = (msg: any) => {
  const fromId = Number(msg.fromId ?? msg.FromId ?? 0);
  const toId = Number(msg.toId ?? msg.ToId ?? 0);
  const content = (msg.content ?? msg.Content ?? '') as string;
  const createdAt = (msg.createdAt ?? msg.CreatedAt ?? new Date().toISOString()) as string;

  if (!content) return;

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

  ws.send({ toId: userId.value, content: text });

  pushMessage({
    fromId: myId.value,
    toId: userId.value,
    content: text,
    createdAt: new Date().toISOString(),
    isMine: true,
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
  // placeholder for v0.8.4 history loading
};

const goBack = () => {
  uni.navigateBack();
};

onLoad((options: any) => {
  const uid = Number(options.userId);
  if (!uid) {
    uni.showToast({ title: '参数错误', icon: 'none' });
    setTimeout(() => uni.navigateBack(), 1000);
    return;
  }

  userId.value = uid;
  nickname.value = decodeURIComponent(options.nickname || '用户' + uid);
  myId.value = conversationStore.getMyUserId();
  conversationStore.markRead(uid);

  ws.on('message', handleSocketMsg);
});

onUnload(() => {
  ws.off('message', handleSocketMsg);
  conversationStore.markRead(userId.value);
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

  .nav-title {
    font-size: 32rpx;
    font-weight: bold;
    color: #333;
  }

  .nav-placeholder {
    width: 60rpx;
  }
}

.msg-list {
  flex: 1;
  padding: 20rpx 24rpx;
  overflow-y: auto;
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