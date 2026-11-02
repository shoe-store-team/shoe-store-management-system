
export type BienTheGiay = {
  id: string;
  sku: string;
  size: number;
  color: string;
  stock: number;
  priceOverride?: number | string | null;
  isActive?: boolean;
};

export type BienTheGiayInput = {
  size: number;
  color: string;
  priceOverride?: number | null;
};

export type SanPham = {
  id: string;
  productCode: string;
  name: string;
  description: string | null;
  basePrice: number | string;
  imageUrl?: string | null;
  isActive?: boolean;
  category: { id: string; name: string } | null;
  categoryId?: string | null;
  variants: BienTheGiay[];
};

export type TaoSanPhamDto = {
  name: string;
  description: string;
  basePrice: number;
  imageUrl?: string | null;
  categoryId?: string | null;
  variants: BienTheGiayInput[];
};

export type CapNhatSanPhamDto = {
  name: string;
  description: string;
  basePrice: number;
  imageUrl?: string | null;
  categoryId?: string | null;
  isActive?: boolean;
  variants?: BienTheGiayInput[];
};
