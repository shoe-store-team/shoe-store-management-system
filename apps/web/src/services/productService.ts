
import type {
  SanPham,
  TaoSanPhamDto,
  CapNhatSanPhamDto,
} from '../types/product';

import type { ChiTietSanPham } from '../types/cart';
import { request } from './request';

const API_URL = '/products';

export const productService = {
  // Lấy chi tiết sản phẩm
  layChiTiet: (id: string) =>
    request<ChiTietSanPham>(`/catalog/${id}`),

  // Lấy danh sách sản phẩm
  layTatCa: async (): Promise<SanPham[]> => {
    return request<SanPham[]>(API_URL);
  },

  // Thêm sản phẩm
  them: async (data: TaoSanPhamDto): Promise<SanPham> => {
    const result = await request<{ product: SanPham }>(
      API_URL,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    );

    return result.product;
  },

  // Cập nhật sản phẩm
  capNhat: async (
    id: string,
    data: CapNhatSanPhamDto,
  ): Promise<SanPham> => {
    const result = await request<{ product: SanPham }>(
      `${API_URL}/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      },
    );

    return result.product;
  },

  // Xóa sản phẩm
  xoa: async (id: string): Promise<void> => {
    await request<void>(`${API_URL}/${id}`, {
      method: 'DELETE',
    });
  },
};
