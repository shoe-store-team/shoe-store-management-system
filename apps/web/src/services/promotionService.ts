import type { KetQuaMaGiam, KhuyenMai, TaoKhuyenMaiDto } from '../types/promotion';
import { request } from './request';

export const promotionService = {
  // Khách: kiểm tra mã trên giỏ hiện tại
  kiemTraMa: (code: string) =>
    request<KetQuaMaGiam>('/promotions/validate', { method: 'POST', body: JSON.stringify({ code }) }),

  // Admin
  layTatCa: () => request<KhuyenMai[]>('/promotions'),
  tao: (data: TaoKhuyenMaiDto) =>
    request<KhuyenMai>('/promotions', { method: 'POST', body: JSON.stringify(data) }),
  capNhat: (id: string, data: Partial<TaoKhuyenMaiDto> & { isActive?: boolean }) =>
    request<KhuyenMai>(`/promotions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  tat: (id: string) => request<KhuyenMai>(`/promotions/${id}`, { method: 'DELETE' }),
};
