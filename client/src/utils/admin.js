import { apiRequest } from './api';

export async function fetchAdminUsers() {
  return apiRequest('/admin/users');
}

export async function updateAdminUser(userId, payload) {
  return apiRequest(`/admin/users/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function resetAdminUserPassword(userId) {
  return apiRequest(`/admin/users/${encodeURIComponent(userId)}/reset-password`, {
    method: 'POST',
  });
}

export async function fetchAdminTeams() {
  return apiRequest('/admin/teams');
}
