import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from './authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Optimistic first paint from the cached user; always revalidated below against /me.
  const [user, setUser] = useState(() => authService.peekCachedUser());
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      const session = await authService.getSession();
      if (!isMounted) return;
      setUser(session?.user ?? null);
      setIsBootstrapping(false);
    }

    restoreSession();
    return () => {
      isMounted = false;
    };
  }, []);

  async function login(credentials) {
    const session = await authService.login(credentials);
    setUser(session.user);
    return session.user;
  }

  async function signup(payload) {
    // Signup no longer establishes a session — the user has to verify their
    // email first. The caller (LoginPage) reads the returned { message, email }
    // and routes the user to the verify-email page.
    return authService.signup(payload);
  }

  async function verifyEmail(payload) {
    // Verification doesn't establish a session — the user is sent back to
    // the login page after this resolves.
    return authService.verifyEmail(payload);
  }

  async function resendVerification(payload) {
    return authService.resendVerification(payload);
  }

  async function logout() {
    await authService.logout();
    setUser(null);
  }

  const value = useMemo(
    () => ({
      user,
      role: user?.role ?? null,
      isAuthenticated: Boolean(user),
      isBootstrapping,
      login,
      signup,
      verifyEmail,
      resendVerification,
      logout,
    }),
    [user, isBootstrapping]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }
  return context;
}
