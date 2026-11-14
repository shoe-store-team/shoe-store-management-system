export interface DashboardSummary {
  range: { from: string; to: string; days: number };
  kpi: {
    totalOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    cancelRate: number; // 0..1
    revenue: number; // VND, đơn đã thu tiền và không bị huỷ
    paidOrders: number;
    averageOrderValue: number;
    codPendingCount: number;
    codPendingAmount: number;
    refundRequiredCount: number;
  };
  ordersByStatus: Record<string, number>;
  revenueByDay: { date: string; revenue: number; orders: number }[];
  paymentsByMethod: Record<string, Record<string, number>>;
  refundRequired: { orderId: string; orderCode: string; amount: number; createdAt: string }[];
  lowStock: { variantId: string; productName: string; stock: number }[];
  lowStockThreshold: number;
  generatedAt: string;
}
