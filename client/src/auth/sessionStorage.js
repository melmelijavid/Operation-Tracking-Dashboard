import { AUTH_STORAGE_KEY } from './constants';

// We deliberately do NOT store the JWT here — it lives in an httpOnly cookie
// the browser handles automatically. The cached user object is only a
// first-paint hint and is always revalidated against /api/auth/me on bootstrap.

export function loadStoredUser() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.user ?? null;
  } catch (error) {
    return null;
  }
}

export function saveStoredUser(user) {
  if (!user) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user }));
}

export function clearStoredUser() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}
