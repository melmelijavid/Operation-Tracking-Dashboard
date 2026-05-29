import { apiRequest } from './api';

export async function fetchMessageUsers() {
  return apiRequest('/messages/users');
}

export async function fetchMessageConversations() {
  return apiRequest('/messages/conversations');
}

export async function fetchUnreadMessageCount() {
  return apiRequest('/messages/unread-count');
}

export async function fetchConversationMessages(userId) {
  return apiRequest(`/messages/${encodeURIComponent(userId)}`);
}

export async function sendDirectMessage(userId, messageText) {
  return apiRequest(`/messages/${encodeURIComponent(userId)}`, {
    method: 'POST',
    body: JSON.stringify({ messageText }),
  });
}

export async function markConversationRead(userId) {
  return apiRequest(`/messages/${encodeURIComponent(userId)}/read`, {
    method: 'PATCH',
  });
}
