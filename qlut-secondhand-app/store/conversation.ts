import { reactive } from 'vue';

export interface Conversation {
  userId: number;
  nickname: string;
  avatar: string;
  lastMsg: string;
  lastTime: string;
  unreadCount: number;
}

interface ConversationStore {
  conversations: Record<number, Conversation>;
  unreadTotal: number;
  updateConversation(msg: any): void;
  markRead(userId: number): void;
  getMyUserId(): number;
}

function decodeBase64Url(input: string): string {
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
}

let cachedUserId = -1;

function getMyUserId(): number {
  if (cachedUserId !== -1) return cachedUserId;
  const token = uni.getStorageSync('token');
  if (!token || typeof token !== 'string') return 0;
  const parts = token.split('.');
  if (parts.length < 2) return 0;
  try {
    const payload = decodeBase64Url(parts[1]);
    const data = JSON.parse(payload);
    cachedUserId = Number(data.user_id || data.id || data.uid || data.sub || 0);
    return cachedUserId;
  } catch {
    return 0;
  }
}

export const conversationStore = reactive<ConversationStore>({
  conversations: {},

  get unreadTotal() {
    return Object.values(this.conversations).reduce((sum, c) => sum + c.unreadCount, 0);
  },

  updateConversation(msg: any) {
    const myId = getMyUserId();
    const fromId = Number(msg.fromId ?? msg.FromId ?? 0);
    const toId = Number(msg.toId ?? msg.ToId ?? 0);
    const content = (msg.content ?? msg.Content ?? '') as string;

    if (fromId === 0) return;

    const otherId = fromId === myId ? toId : fromId;
    if (otherId === 0) return;

    const isIncoming = fromId !== myId;
    const existing = this.conversations[otherId];

    if (existing) {
      existing.lastMsg = content;
      existing.lastTime = msg.createdAt ?? msg.CreatedAt ?? new Date().toISOString();
      if (isIncoming) {
        existing.unreadCount += 1;
      }
    } else {
      this.conversations[otherId] = {
        userId: otherId,
        nickname: (msg.nickname as string) || `用户${otherId}`,
        avatar: (msg.avatar as string) || '',
        lastMsg: content,
        lastTime: msg.createdAt ?? msg.CreatedAt ?? new Date().toISOString(),
        unreadCount: isIncoming ? 1 : 0,
      };
    }
  },

  markRead(userId: number) {
    if (this.conversations[userId]) {
      this.conversations[userId].unreadCount = 0;
    }
  },

  getMyUserId,
});
