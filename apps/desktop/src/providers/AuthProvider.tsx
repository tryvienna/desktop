/**
 * AuthProvider — React context for authentication state.
 *
 * Calls auth.getAuthState() on mount and subscribes to
 * auth.onAuthStateChanged events from the main process.
 */

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { getApi, getEvents } from '@vienna/ipc/renderer';
import { api, events } from '../ipc';

interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  email: string | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: () => Promise<void>;
  signup: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    userId: null,
    email: null,
    isLoading: true,
  });

  useEffect(() => {
    const client = getApi(api);

    // Load initial auth state
    client.auth.getAuthState({}).then((result) => {
      setState({
        isAuthenticated: result.isAuthenticated,
        userId: result.userId,
        email: result.email,
        isLoading: false,
      });
    }).catch(() => {
      setState({ isAuthenticated: false, userId: null, email: null, isLoading: false });
    });

    // Subscribe to auth state changes from main process
    const eventBus = getEvents(events);
    const unsubscribe = eventBus.auth.onAuthStateChanged((payload) => {
      setState({
        isAuthenticated: payload.isAuthenticated,
        userId: payload.userId,
        email: payload.email ?? null,
        isLoading: false,
      });
    });

    return unsubscribe;
  }, []);

  const login = useCallback(async () => {
    const client = getApi(api);
    await client.auth.openBrowserAuth({ type: 'login' });
  }, []);

  const signup = useCallback(async () => {
    const client = getApi(api);
    await client.auth.openBrowserAuth({ type: 'signup' });
  }, []);

  const logout = useCallback(async () => {
    const client = getApi(api);
    await client.auth.logout({});
    setState({ isAuthenticated: false, userId: null, email: null, isLoading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
