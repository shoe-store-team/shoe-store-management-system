export type PaymentStatus = 'UNPAID' | 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
export type PaymentMethod = 'COD' | 'VNPAY';
export type BankCode = 'VNPAYQR' | 'VNBANK' | 'INTCARD';

export interface CreatePaymentBody {
  orderId: string;
  method: PaymentMethod;
  bankCode?: BankCode;
  simulateResult?: 'SUCCESS' | 'FAILED'; // chỉ dùng khi backend bật mock
}

export interface PaymentResult {
  id: string;
  orderId: string;
  orderCode: string; // VD: DH-1A2B3C4D
  method: 'COD' | 'VNPAY' | 'MOMO' | 'STRIPE' | 'OTHER';
  status: PaymentStatus;
  orderStatus: OrderStatus;
  orderPaymentStatus: PaymentStatus;
  amount: number;
  transactionId: string | null;
  paidAt: string | null;
  reference: string;
  paymentUrl: string | null; // có khi VNPay đang PENDING
  expiresAt: string | null;
  message?: string;
}

export interface PaymentConfig {
  provider: 'vnpay' | 'mock';
  configured: boolean; // false = chưa cấu hình VNPay, ẩn/khoá lựa chọn trực tuyến
  methods: PaymentMethod[];
  channels: BankCode[];
  holdMinutes: number;
  allowSimulate: boolean;
}
