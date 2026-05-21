import { apiRequest } from './api';

export async function fetchMyProfile() {
  return apiRequest('/me');
}

export async function updateMyProfile(payload) {
  return apiRequest('/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function changeMyEmail(email) {
  return apiRequest('/me/email', {
    method: 'PATCH',
    body: JSON.stringify({ email }),
  });
}

export async function changeMyPassword(currentPassword, newPassword) {
  return apiRequest('/me/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function uploadMyAvatar(file) {
  const formData = new FormData();
  formData.append('avatar', file);
  return apiRequest('/me/avatar', {
    method: 'POST',
    body: formData,
  });
}

export async function deleteMyAvatar() {
  return apiRequest('/me/avatar', {
    method: 'DELETE',
  });
}
