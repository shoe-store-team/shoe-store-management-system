const API_BASE = 'http://localhost:3000/api';

/**
 * Gọi API chung cho giỏ hàng/khuyến mãi.
 * - Có token (Người 1 lưu ở localStorage 'token') thì gửi Authorization.
 * - Dev tạm: localStorage 'devUserId' -> header x-user-id (xóa khi đăng nhập xong).
 */
export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('token');
  if (token) headers.Authorization = `Bearer ${token}`;
  const devUserId = localStorage.getItem('devUserId');
  if (devUserId) headers['x-user-id'] = devUserId;

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers as Record<string, string> | undefined) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.message || 'Có lỗi xảy ra');
  return body as T;
}

export const dinhDangTien = (n: number) => `${Math.round(n).toLocaleString('vi-VN')}đ`;
