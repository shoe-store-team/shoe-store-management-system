import { test } from "node:test";
import assert from "node:assert/strict";
import * as dash from "../../src/modules/dashboard/dashboard.service";
import { Decimal, createFakePrisma } from "../payments/fake-prisma";

const fake = createFakePrisma();
dash._usePrismaForTests(fake.prisma);

const at = (iso: string) => new Date(iso);
const order = (id: string, status: string, paymentStatus: string, amount: number, createdAt: string) => ({
  id: `${id}0000000-0000-4000-8000-000000000000`.slice(0, 36), userId: "u", status, paymentStatus,
  totalAmount: new Decimal(amount), createdAt: at(createdAt),
});

test("parseRange theo ngày giờ VN và kiểm tra đầu vào", () => {
  const r = dash.parseRange("2026-11-01", "2026-11-14");
  assert.equal(r.start.toISOString(), "2026-10-31T17:00:00.000Z");
  assert.equal(r.end.toISOString(), "2026-11-14T17:00:00.000Z");
  assert.equal(r.days, 14);
  assert.throws(() => dash.parseRange("2026-11-15", "2026-11-14"), (e) => (e as { status?: number }).status === 400);
  assert.throws(() => dash.parseRange("2026-02-30"), (e) => (e as { status?: number }).status === 400);
  assert.throws(() => dash.parseRange("2024-01-01", "2026-11-14"), (e) => (e as { status?: number }).status === 400);
});

test("Số liệu: không tính đơn huỷ vào doanh thu, mỗi đơn 1 lần, chia ngày theo giờ VN", async () => {
  const a = order("a", "DELIVERED", "PAID", 300000, "2026-11-10T03:00:00Z");
  const b = order("b", "CONFIRMED", "PAID", 200000, "2026-11-10T16:30:00Z"); // 23:30 ngày 10 giờ VN
  const c = order("c", "CANCELLED", "PAID", 999000, "2026-11-11T03:00:00Z"); // huỷ nhưng tiền về -> cần hoàn
  const d = order("d", "CONFIRMED", "UNPAID", 150000, "2026-11-12T03:00:00Z"); // COD chờ thu
  const e = order("e", "CANCELLED", "UNPAID", 400000, "2026-11-12T04:00:00Z"); // COD của đơn huỷ: không tính
  const old = order("f", "DELIVERED", "PAID", 700000, "2026-09-01T03:00:00Z"); // ngoài khoảng
  const pay = (id: string, o: ReturnType<typeof order>, method: string, status: string, paidAt: string | null) => ({
    id, orderId: o.id, method, status, amount: o.totalAmount, paidAt: paidAt ? at(paidAt) : null, createdAt: o.createdAt,
  });
  fake.reset({
    order: [a, b, c, d, e, old],
    payment: [
      pay("p1", a, "VNPAY", "PAID", "2026-11-10T03:05:00Z"),
      pay("p1b", a, "VNPAY", "PAID", "2026-11-10T03:06:00Z"), // lỡ trả 2 lần: vẫn chỉ tính 1 đơn
      pay("p2", b, "VNPAY", "PAID", "2026-11-10T17:10:00Z"), // 00:10 ngày 11 giờ VN
      pay("p3", c, "VNPAY", "PAID", "2026-11-11T03:10:00Z"),
      pay("p4", d, "COD", "PENDING", null),
      pay("p5", e, "COD", "PENDING", null),
      pay("p6", old, "VNPAY", "PAID", "2026-09-01T03:05:00Z"),
      pay("p7", d, "VNPAY", "FAILED", null),
    ],
    product: [{ id: "pr1", name: "Giày chạy A" }],
    productVariant: [
      { id: "v1", productId: "pr1", stock: 0 },
      { id: "v2", productId: "pr1", stock: 3 },
      { id: "v3", productId: "pr1", stock: 50 },
    ],
  });

  const s = await dash.getSummary({ from: "2026-11-01", to: "2026-11-14" });
  assert.equal(s.kpi.totalOrders, 5);
  assert.equal(s.kpi.cancelledOrders, 2);
  assert.equal(s.kpi.cancelRate, 0.4);
  assert.equal(s.kpi.completedOrders, 1);
  assert.equal(s.kpi.revenue, 500000, "chỉ a + b, không có c (huỷ) và không cộng trùng a");
  assert.equal(s.kpi.paidOrders, 2);
  assert.equal(s.kpi.averageOrderValue, 250000);
  assert.equal(s.kpi.codPendingCount, 1);
  assert.equal(s.kpi.codPendingAmount, 150000);
  assert.equal(s.kpi.refundRequiredCount, 1);
  assert.equal(s.refundRequired[0].amount, 999000);

  const day = (dte: string) => s.revenueByDay.find((r) => r.date === dte)!;
  assert.equal(s.revenueByDay.length, 14);
  assert.deepEqual(day("2026-11-10"), { date: "2026-11-10", revenue: 300000, orders: 1 });
  assert.deepEqual(day("2026-11-11"), { date: "2026-11-11", revenue: 200000, orders: 1 });
  assert.equal(s.ordersByStatus.PROCESSING, 0, "trạng thái không có đơn vẫn trả về 0");
  assert.deepEqual(s.paymentsByMethod.VNPAY, { PAID: 4, FAILED: 1 });
  assert.deepEqual(s.lowStock.map((v) => v.stock), [0, 3]);
  assert.equal(s.lowStock[0].productName, "Giày chạy A");
});

test("Database trống: tất cả bằng 0, không lỗi chia cho 0", async () => {
  fake.reset();
  const s = await dash.getSummary({ from: "2026-11-01", to: "2026-11-07" });
  assert.equal(s.kpi.totalOrders, 0);
  assert.equal(s.kpi.cancelRate, 0);
  assert.equal(s.kpi.averageOrderValue, 0);
  assert.equal(s.kpi.codPendingAmount, 0);
  assert.equal(s.revenueByDay.length, 7);
});
