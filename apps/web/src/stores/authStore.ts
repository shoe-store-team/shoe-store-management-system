
import { useSyncExternalStore } from 'react';

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

export type AuthUser = {
  id?: string;
  name: string;
  email?: string;
  role?: string;
};

let token: string | null = localStorage.getItem(TOKEN_KEY);
let user: AuthUser | null = JSON.parse(
  localStorage.getItem(USER_KEY) || 'null',
);

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export const authStore = {
  getToken: () => token,
  getUser: () => user,
  isAuthenticated: () => Boolean(token),

  setAuth(value: string, userData: AuthUser) {
    token = value;
    user = userData;
    localStorage.setItem(TOKEN_KEY, value);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    notify();
  },

  setToken(value: string) {
    token = value;
    localStorage.setItem(TOKEN_KEY, value);
    notify();
  },

  logout() {
    token = null;
    user = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    notify();
  },

  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function useAuth() {
  const currentToken = useSyncExternalStore(
    authStore.subscribe,
    authStore.getToken,
    () => null,
  );

  const currentUser = useSyncExternalStore(
    authStore.subscribe,
    authStore.getUser,
    () => null,
  );

  return {
    token: currentToken,
    user: currentUser,
    isAuthenticated: Boolean(currentToken),
    logout: authStore.logout,
  };
}
