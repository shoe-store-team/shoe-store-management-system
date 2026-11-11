import { request } from './request';

import type {
  Order,
  OrderStatus,
  CreateOrderDto,
  OrderResponse,
  OrderListResponse,
} from '../types/order';

export const orderService = {
  // Tao don hang
  taoDonHang: async (data: CreateOrderDto): Promise<Order> => {
    const res = await request<OrderResponse>('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    return res.data;
  },

  // Lay lich su don hang
  layLichSu: async (): Promise<Order[]> => {
    const res = await request<OrderListResponse>(
      '/orders/my-orders',
    );

    return res.data;
  },

  // Xem chi tiet don hang
  layChiTiet: async (id: string): Promise<Order> => {
    const res = await request<OrderResponse>(
      `/orders/${id}`,
    );

    return res.data;
  },

  // Admin lay tat ca don hang
  layTatCa: async (): Promise<Order[]> => {
    const res = await request<OrderListResponse>(
      '/orders',
    );

    return res.data;
  },

  // Cap nhat trang thai
  capNhatTrangThai: async (
    id: string,
    status: OrderStatus,
  ): Promise<Order> => {
    const res = await request<OrderResponse>(
      `/orders/${id}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      },
    );

    return res.data;
  },

  // Huy don hang
  huyDonHang: async (id: string): Promise<Order> => {
    const res = await request<OrderResponse>(
      `/orders/${id}/cancel`,
      {
        method: 'PATCH',
      },
    );

    return res.data;
  },
};