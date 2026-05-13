import { apiRequest } from '../utils/api';
import { clearStoredUser, loadStoredUser, saveStoredUser } from './sessionStorage';

export const authService = {
  async login({ email, password }) {
    // The server sets the session cookie via Set-Cookie. We just keep the
    // user object in localStorage to avoid a flash of unauthenticated UI on
    // the next page load — it's revalidated against /api/auth/me on bootstrap.
    const response = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    saveStoredUser(response.user);
    return response;
  },

  async signup({ name, email, password }) {
    // Returns { message, email } — the user is NOT logged in yet. They need
    // to verify their email first via verifyEmail() below.
    return apiRequest('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
  },

  async verifyEmail({ email, code }) {
    // Returns { message }. Verification flips the user's email_verified flag
    // but does NOT sign them in — they have to go back to the login page.
    return apiRequest('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
  },

  async resendVerification({ email }) {
    return apiRequest('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async logout() {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch (error) {
      // Even if the server call fails, drop the local cache so the UI
      // doesn't show a stale logged-in state.
    }
    clearStoredUser();
  },

  async getSession() {
    // Always ask the server. If the cookie is missing or expired we'll get a
    // 401 and treat the user as logged out.
    try {
      const response = await apiRequest('/auth/me');
      saveStoredUser(response.user);
      return { user: response.user };
    } catch (error) {
      clearStoredUser();
      return null;
    }
  },

  // Synchronous best-effort read used to render an initial paint without
  // waiting for /me. Always treat as a hint, not authoritative.
  peekCachedUser() {
    return loadStoredUser();
  },
};
