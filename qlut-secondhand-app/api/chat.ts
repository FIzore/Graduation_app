import { request } from '../utils/request';

export interface ChatMessage {
  id: number;
  fromId: number;
  toId: number;
  content: string;
  isRead: boolean;
  createdAt: string;
}

/**
 * 拉取与指定用户的聊天历史记录
 * @param targetId 对方用户 ID
 * @param page 页码，从 1 开始
 * @param pageSize 每页条数，默认 20
 */
export const getChatHistory = (targetId: number, page: number, pageSize: number = 20, itemId?: number) => {
  const params: Record<string, number> = { targetId, page, pageSize };
  if (itemId) params.itemId = itemId;
  return request<ChatMessage[]>('/chat/history', 'GET', params);
};
