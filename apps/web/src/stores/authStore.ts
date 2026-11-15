import { useSyncExternalStore } from "react";

const TOKEN_KEY = "token";
const USER_KEY = "user";

export type AuthUser = {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  role?: string;
};

// Lấy thông tin đăng nhập ban đầu từ localStorage
function getStoredUser(): AuthUser | null {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
}

let token: string | null = localStorage.getItem(TOKEN_KEY);
let user: AuthUser | null = getStoredUser();

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

// Đồng bộ khi một tab khác thay đổi localStorage
window.addEventListener("storage", (event) => {
  if (event.key === TOKEN_KEY || event.key === USER_KEY || event.key === null) {
    token = localStorage.getItem(TOKEN_KEY);
    user = getStoredUser();

    notify();
  }
});

export const authStore = {
  getToken: () => token,

  getUser: () => user,

  isAuthenticated: () => Boolean(token),

  // Lưu token và user cùng lúc khi đăng nhập
  setAuth(value: string, userData: AuthUser) {
    token = value;
    user = userData;

    localStorage.setItem(TOKEN_KEY, value);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));

    notify();
  },

  // Chỉ sử dụng khi thực sự cần cập nhật riêng token
  setToken(value: string) {
    token = value;
    localStorage.setItem(TOKEN_KEY, value);
    notify();
  },

  // Cập nhật thông tin user
  setUser(userData: AuthUser) {
    user = userData;
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    notify();
  },

  // Đăng xuất khỏi phiên dùng chung trên trình duyệt
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