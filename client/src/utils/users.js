import { apiRequest } from './api';

export async function fetchUsers() {
  return apiRequest('/users');
}

export async function updateUserRole(userId, role) {
  return apiRequest(`/users/${encodeURIComponent(userId)}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
}
