export type DongGioHang = {
  id: string;
  variantId: string;
  productId: string;
  productName: string;
  imageUrl: string | null;
  size: number;
  color: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  stock: number;
  available: boolean;
  unavailableReason: 'INACTIVE' | 'INSUFFICIENT_STOCK' | null;
};

export type GioHang = {
  items: DongGioHang[];
  itemCount: number;
  subtotal: number;
  payableSubtotal: number;
};

export type ChiTietSanPham = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  category: { id: string; name: string } | null;
  basePrice: number;
  variants: {
  id: string;
  size: number;
  color: string;
  imageUrl: string | null;
  price: number;
  stock: number;
}[];
};
