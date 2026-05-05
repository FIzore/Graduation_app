import { reactive } from 'vue';

export interface Conversation {
  userId: number;
  itemId: number;
  itemTitle: string;
  itemCover: string;
  nickname: string;
  avatar: string;
  lastMsg: string;
  lastTime: string;
  unreadCount: number;
}

interface ConversationStore {
  conversations: Record<string, Conversation>;
  unreadTotal: number;
  updateConversation(msg: any): void;
  markRead(otherUserId: number, itemId: number): void;
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

function getConvKey(otherId: number, iid: number): string {
  return `${otherId}_${iid}`;
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
    const iid = Number(msg.itemId ?? msg.ItemId ?? 0);

    if (fromId === 0 || iid === 0) return;

    const otherId = fromId === myId ? toId : fromId;
    if (otherId === 0) return;

    const isIncoming = fromId !== myId;
    const key = getConvKey(otherId, iid);
    const existing = this.conversations[key];

    if (existing) {
      existing.lastMsg = content;
      existing.lastTime = msg.createdAt ?? msg.CreatedAt ?? new Date().toISOString();
      if (isIncoming) {
        existing.unreadCount += 1;
      }
    } else {
      this.conversations[key] = {
        userId: otherId,
        itemId: iid,
        itemTitle: (msg.itemTitle as string) || (msg.ItemTitle as string) || '',
        itemCover: (msg.itemCover as string) || (msg.ItemCover as string) || '',
        nickname: (msg.nickname as string) || `用户${otherId}`,
        avatar: (msg.avatar as string) || '',
        lastMsg: content,
        lastTime: msg.createdAt ?? msg.CreatedAt ?? new Date().toISOString(),
        unreadCount: isIncoming ? 1 : 0,
      };
    }
  },

  markRead(otherUserId: number, itemId: number) {
    const key = getConvKey(otherUserId, itemId);
    if (this.conversations[key]) {
      this.conversations[key].unreadCount = 0;
    }
  },

  getMyUserId,
});
