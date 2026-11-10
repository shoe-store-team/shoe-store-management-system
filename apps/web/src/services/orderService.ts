import { request } from './request';

export type TrangThaiDon = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
export type TrangThaiThanhToan = 'UNPAID' | 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

/** POST /api/orders: tạo đơn từ giỏ hàng hiện tại của khách. */
export type TaoDonDto = {
  recipientName: string;
  phone: string;
  shippingAddress: string;
  note?: string;
  promotionCode?: string;
  addressId?: string;
};

export type DonHangMoi = {
  id: string;
  code: string;
  status: TrangThaiDon;
  paymentStatus: TrangThaiThanhToan;
  totalAmount: number;
};

export type DonHangCuaToi = {
  id: string;
  code: string;
  createdAt: string;
  status: TrangThaiDon;
  paymentStatus: TrangThaiThanhToan;
  subtotalAmount: number;
  discountAmount: number;
  shippingFee: number;
  totalAmount: number;
  recipientName: string;
  phone: string;
  shippingAddress: string;
  paymentMethod: 'COD' | 'VNPAY' | 'MOMO' | 'STRIPE' | 'OTHER' | null;
  holdExpiresAt: string | null; // hạn thanh toán (chỉ có với đơn chờ thanh toán)
  items: { id: string; productName: string; imageUrl: string | null; size: number; color: string; quantity: number; price: number }[];
};

export const orderService = {
  taoDon: (data: TaoDonDto) =>
    request<DonHangMoi>('/orders', { method: 'POST', body: JSON.stringify(data) }),
  layDonCuaToi: () => request<DonHangCuaToi[]>('/orders/mine'),
  huyDon: (id: string) => request<{ id: string; status: TrangThaiDon }>(`/orders/${id}/cancel`, { method: 'POST' }),
};
