export type LoaiGiam = 'PERCENTAGE' | 'FIXED_AMOUNT';

export type KhuyenMai = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  discountType: LoaiGiam;
  discountValue: string; // Prisma Decimal -> chuỗi trong JSON
  maxDiscount: string | null;
  minOrderAmount: string;
  startsAt: string;
  endsAt: string;
  usageLimit: number | null;
  usageCount: number;
  isActive: boolean;
};

export type TaoKhuyenMaiDto = {
  code: string;
  name: string;
  discountType: LoaiGiam;
  discountValue: number;
  maxDiscount?: number | null;
  minOrderAmount?: number;
  startsAt: string;
  endsAt: string;
  usageLimit?: number | null;
};

export type KetQuaMaGiam = {
  code: string;
  name: string;
  subtotal: number;
  discountAmount: number;
  total: number;
};
