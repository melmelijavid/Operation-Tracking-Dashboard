import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from './authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
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
    const session = await authService.signup(payload);
    setUser(session.user);
    return session.user;
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
