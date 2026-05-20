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

export async function createAdminUser(payload) {
  return apiRequest('/admin/users', {
    method: 'POST',
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

export async function createAdminTeam(payload) {
  return apiRequest('/admin/teams', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateAdminTeam(teamId, payload) {
  return apiRequest(`/admin/teams/${encodeURIComponent(teamId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
