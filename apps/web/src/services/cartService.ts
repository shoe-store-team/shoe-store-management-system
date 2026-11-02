import type { GioHang } from '../types/cart';
import { request } from './request';

export const cartService = {
  layGioHang: () => request<GioHang>('/cart'),

  them: (variantId: string, quantity: number) =>
    request<GioHang>('/cart/items', { method: 'POST', body: JSON.stringify({ variantId, quantity }) }),

  capNhatSoLuong: (itemId: string, quantity: number) =>
    request<GioHang>(`/cart/items/${itemId}`, { method: 'PATCH', body: JSON.stringify({ quantity }) }),

  xoa: (itemId: string) => request<GioHang>(`/cart/items/${itemId}`, { method: 'DELETE' }),
};
