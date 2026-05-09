import { AUTH_STORAGE_KEY } from './constants';

export function loadStoredSession() {
  try {
    const rawSession = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!rawSession) return null;
    const parsedSession = JSON.parse(rawSession);
    return parsedSession?.user ? parsedSession : null;
  } catch (error) {
    return null;
  }
}

export function saveStoredSession(session) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}
