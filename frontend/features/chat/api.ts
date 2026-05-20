import { apiClient } from '@/lib/api/axios';

const BASE = '/api/chat';

export async function createConversation(participantId: number) {
  const { data } = await apiClient.post(`${BASE}/conversations/`, {
    participant_id: participantId,
  });
  return data;
}

export async function getConversations() {
  const { data } = await apiClient.get(`${BASE}/conversations/`);
  return data;
}

export async function getMessages(conversationId: number) {
  const { data } = await apiClient.get(`${BASE}/conversations/${conversationId}/messages/`);
  return data;
}
