// Frontend: đặt cạnh cart.ts, order.ts...
export type PaymentStatus = "UNPAID" | "PENDING" | "PAID" | "FAILED" | "REFUNDED";
export type OrderStatus = "PENDING" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
export type BankCode = "VNPAYQR" | "VNBANK" | "INTCARD";

export interface CreatePaymentBody {
  orderId: string;
  bankCode?: BankCode;
  simulateResult?: "SUCCESS" | "FAILED"; // chỉ khi backend bật mock
}

export interface PaymentResult {
  id: string;
  orderId: string;
  method: "COD" | "VNPAY" | "MOMO" | "STRIPE" | "OTHER";
  status: PaymentStatus;
  orderStatus: OrderStatus;
  orderPaymentStatus: PaymentStatus;
  amount: number;
  transactionId: string | null;
  paidAt: string | null;
  reference: string;
  paymentUrl: string | null; // có khi status = PENDING -> window.location.href = paymentUrl
  expiresAt: string | null;
  message?: string;
}

export interface PaymentConfig {
  provider: "vnpay" | "mock";
  configured: boolean;
  channels: BankCode[];
  allowSimulate: boolean;
}
