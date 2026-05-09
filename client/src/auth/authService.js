import { apiRequest } from '../utils/api';
import { clearStoredSession, loadStoredSession, saveStoredSession } from './sessionStorage';

export const authService = {
  async login({ email, password, rememberMe }) {
    const session = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
      }),
    });

    saveStoredSession({
      token: session.token,
      user: session.user,
      rememberMe: Boolean(rememberMe),
      createdAt: Date.now(),
    });

    return session;
  },

  async signup({ name, email, password, rememberMe }) {
    const session = await apiRequest('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        name,
        email,
        password,
      }),
    });

    saveStoredSession({
      token: session.token,
      user: session.user,
      rememberMe: Boolean(rememberMe),
      createdAt: Date.now(),
    });

    return session;
  },

  async logout() {
    clearStoredSession();
  },

  async getSession() {
    const storedSession = loadStoredSession();
    if (!storedSession?.token) return null;

    try {
      const response = await apiRequest('/auth/me');
      const session = {
        ...storedSession,
        user: response.user,
      };
      saveStoredSession(session);
      return session;
    } catch (error) {
      clearStoredSession();
      return null;
    }
  },
};
