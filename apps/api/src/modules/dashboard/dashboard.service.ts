import { prisma as realPrisma } from "../../config/prisma"; // đổi nếu prisma.ts export tên khác

// Test thay bằng database giả qua _usePrismaForTests (code chạy thật luôn dùng realPrisma).
let prisma = realPrisma;
export function _usePrismaForTests(client: unknown) {
  prisma = client as typeof realPrisma;
}

/**
 * Số liệu dashboard, tính hoàn toàn từ database (không có số giả).
 * Quy ước để không mâu thuẫn với payments:
 *  - "Doanh thu đã thu" = tiền của các đơn có paymentStatus = PAID và KHÔNG bị huỷ, tính theo ngày thanh toán (giờ VN).
 *    Mỗi đơn chỉ tính 1 lần, kể cả khi lỡ có 2 giao dịch PAID.
 *  - Đơn huỷ được đếm riêng, không bao giờ cộng vào doanh thu hay "hoàn tất".
 *  - Đơn huỷ nhưng tiền đã về (VNPay về muộn) nằm ở "cần hoàn tiền".
 *  - COD chờ thu = giao dịch COD còn PENDING của đơn chưa huỷ (M4 đổi sang PAID khi giao xong).
 */

const VN_OFFSET_MS = 7 * 3600_000;
const DAY_MS = 86_400_000;
const MAX_DAYS = 366;
export const LOW_STOCK_DEFAULT = 5;

export const ORDER_STATUSES = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"] as const;

export class DashboardError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** "2026-11-14" (ngày giờ VN) -> thời điểm 00:00 giờ VN của ngày đó. */
function startOfVnDay(ymd: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) throw new DashboardError(400, "Ngày phải có dạng YYYY-MM-DD.");
  const d = new Date(`${ymd}T00:00:00+07:00`);
  if (Number.isNaN(d.getTime()) || vnDate(d) !== ymd) throw new DashboardError(400, `Ngày không hợp lệ: ${ymd}`);
  return d;
}
export const vnDate = (d: Date) => new Date(d.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);

/** Khoảng [from, to] tính theo ngày VN, mặc định 30 ngày gần nhất. Trả về [start, endExclusive). */
export function parseRange(from?: string, to?: string, now = new Date()) {
  const toYmd = to ?? vnDate(now);
  const end = new Date(startOfVnDay(toYmd).getTime() + DAY_MS);
  const start = from ? startOfVnDay(from) : new Date(end.getTime() - 30 * DAY_MS);
  const days = Math.round((end.getTime() - start.getTime()) / DAY_MS);
  if (days <= 0) throw new DashboardError(400, "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.");
  if (days > MAX_DAYS) throw new DashboardError(400, `Khoảng thời gian tối đa ${MAX_DAYS} ngày.`);
  return { start, end, days };
}

const toNumber = (v: unknown) => (v == null ? 0 : Number(v));

export async function getSummary(opts: { from?: string; to?: string; lowStock?: number } = {}) {
  const { start, end, days } = parseRange(opts.from, opts.to);
  const lowStock = opts.lowStock ?? LOW_STOCK_DEFAULT;
  const inRange = { gte: start, lt: end };

  const [byStatus, paidPayments, codPending, refundOrders, paymentsByMethod, lowStockVariants] = await Promise.all([
    // 1. Đơn tạo trong khoảng, theo trạng thái
    prisma.order.groupBy({
      by: ["status"],
      where: { createdAt: inRange },
      _count: { _all: true },
      _sum: { totalAmount: true },
    }),
    // 2. Giao dịch đã thu tiền trong khoảng (để chia theo ngày)
    prisma.payment.findMany({
      where: { status: "PAID", paidAt: inRange },
      select: { orderId: true, paidAt: true, order: { select: { status: true, paymentStatus: true, totalAmount: true } } },
      orderBy: { paidAt: "asc" },
    }),
    // 3. COD chờ thu (không giới hạn thời gian: là "công nợ" hiện tại)
    prisma.payment.aggregate({
      where: { method: "COD", status: "PENDING", order: { status: { not: "CANCELLED" } } },
      _count: { _all: true },
      _sum: { amount: true },
    }),
    // 4. Đơn huỷ nhưng đã nhận tiền -> cần hoàn tiền
    prisma.order.findMany({
      where: { status: "CANCELLED", paymentStatus: "PAID" },
      select: { id: true, totalAmount: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    // 5. Kết quả giao dịch theo phương thức trong khoảng
    prisma.payment.groupBy({
      by: ["method", "status"],
      where: { createdAt: inRange },
      _count: { _all: true },
    }),
    // 6. Biến thể sắp hết hàng
    prisma.productVariant.findMany({
      where: { stock: { lte: lowStock } },
      select: { id: true, stock: true, product: { select: { name: true } } },
      orderBy: { stock: "asc" },
      take: 10,
    }),
  ]);

  /* ---- đơn theo trạng thái ---- */
  const ordersByStatus = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as Record<string, number>;
  let totalOrders = 0;
  for (const row of byStatus) {
    ordersByStatus[row.status] = row._count._all;
    totalOrders += row._count._all;
  }
  const cancelled = ordersByStatus.CANCELLED ?? 0;

  /* ---- doanh thu theo ngày (VN), mỗi đơn tính 1 lần, bỏ đơn huỷ ---- */
  const revenueByDay = new Map<string, { revenue: number; orders: number }>();
  for (let i = 0; i < days; i++) revenueByDay.set(vnDate(new Date(start.getTime() + i * DAY_MS)), { revenue: 0, orders: 0 });
  const counted = new Set<string>();
  for (const p of paidPayments) {
    if (!p.paidAt || counted.has(p.orderId)) continue;
    if (p.order.status === "CANCELLED" || p.order.paymentStatus !== "PAID") continue;
    counted.add(p.orderId);
    const bucket = revenueByDay.get(vnDate(p.paidAt));
    if (bucket) {
      bucket.revenue += toNumber(p.order.totalAmount);
      bucket.orders += 1;
    }
  }
  const daily = [...revenueByDay.entries()].map(([date, v]) => ({ date, ...v }));
  const revenue = daily.reduce((s, d) => s + d.revenue, 0);
  const paidOrders = counted.size;

  /* ---- giao dịch theo phương thức ---- */
  const payments: Record<string, Record<string, number>> = {};
  for (const row of paymentsByMethod) {
    payments[row.method] ??= {};
    payments[row.method][row.status] = row._count._all;
  }

  return {
    range: { from: vnDate(start), to: vnDate(new Date(end.getTime() - 1)), days },
    kpi: {
      totalOrders,
      completedOrders: ordersByStatus.DELIVERED ?? 0,
      cancelledOrders: cancelled,
      cancelRate: totalOrders ? cancelled / totalOrders : 0,
      revenue,
      paidOrders,
      averageOrderValue: paidOrders ? Math.round(revenue / paidOrders) : 0,
      codPendingCount: codPending._count._all,
      codPendingAmount: toNumber(codPending._sum.amount),
      refundRequiredCount: refundOrders.length,
    },
    ordersByStatus,
    revenueByDay: daily,
    paymentsByMethod: payments,
    refundRequired: refundOrders.map((o) => ({
      orderId: o.id,
      orderCode: `DH-${o.id.slice(0, 8).toUpperCase()}`,
      amount: toNumber(o.totalAmount),
      createdAt: o.createdAt.toISOString(),
    })),
    lowStock: lowStockVariants.map((v) => ({ variantId: v.id, productName: v.product?.name ?? "", stock: v.stock })),
    lowStockThreshold: lowStock,
    generatedAt: new Date().toISOString(),
  };
}
