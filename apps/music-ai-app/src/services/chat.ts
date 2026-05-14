import { request } from '@/utils/request';

import type { Message, ChatSendResponse } from '../pages/ChatAIConversation/types';



/** 拉取历史消息（screenEnter 自动触发） */
export async function chatList(): Promise<Message[]> {
  return request({
    method: 'GET',
    url: '/chat/list',
  });
}


/** 发送一条消息并拿到 AI 回复 */
export async function chatSend(params: { text: string }): Promise<ChatSendResponse> {
  return request({
    method: 'POST',
    url: '/chat/send',
    data: params,
  });
}

