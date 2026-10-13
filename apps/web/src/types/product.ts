export type SanPham = {
  id: string;
  name: string;
  description: string | null;
  basePrice: number;
  category: {
    id: string;
    name: string;
  } | null;
  variants: {
    id: string;
    size: number;
    color: string;
    stock: number;
  }[];
};

export type TaoSanPhamDto = {
  name: string;
  description: string;
  basePrice: number;
  size: number;
  color: string;
  stock: number;
};

export type CapNhatSanPhamDto = {
  name: string;
  description: string;
  basePrice: number;
};