import type { SanPham, TaoSanPhamDto, CapNhatSanPhamDto } from '../types/product';

const API_URL = 'http://localhost:3000/api/products';

export const productService = {
  async layTatCa(): Promise<SanPham[]> {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error('Không lấy được danh sách sản phẩm');
    return res.json();
  },

  async them(data: TaoSanPhamDto): Promise<SanPham> {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Không thể thêm sản phẩm');
    return result.product;
  },

  async capNhat(id: string, data: CapNhatSanPhamDto): Promise<SanPham> {
    const res = await fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Không thể cập nhật sản phẩm');
    return result.product;
  },

  async xoa(id: string): Promise<void> {
    const res = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE',
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Không thể xóa sản phẩm');
  }
};