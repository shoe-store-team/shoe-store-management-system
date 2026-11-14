export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export type PaymentStatus =
  | 'UNPAID'
  | 'PENDING'
  | 'PAID'
  | 'FAILED'
  | 'REFUNDED';

export type PaymentMethod =
  | 'COD'
  | 'VNPAY'
  | 'MOMO'
  | 'STRIPE'
  | 'OTHER';

export type OrderItem = {
  id: string;
  variantId: string | null;
  productName: string;
  size: number;
  color: string;
  quantity: number;
  price: number | string;
};

export type Payment = {
  id: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number | string;
  paymentUrl?: string | null;
};

export type Order = {
  id: string;
  userId: string;
  recipientName: string;
  phone: string;
  shippingAddress: string;
  note?: string | null;

  subtotalAmount: number | string;
  discountAmount: number | string;
  shippingFee: number | string;
  totalAmount: number | string;

  status: OrderStatus;
  paymentStatus: PaymentStatus;

  items: OrderItem[];
  payments: Payment[];

  createdAt: string;
  updatedAt: string;
};

export type CreateOrderDto = {
  recipientName: string;
  phone: string;
  shippingAddress: string;
  addressId?: string;
  note?: string;
  paymentMethod: PaymentMethod;
  promotionCode?: string;
};

export type OrderResponse = {
  message?: string;
  data: Order;
};

export type OrderListResponse = {
  message?: string;
  data: Order[];
};