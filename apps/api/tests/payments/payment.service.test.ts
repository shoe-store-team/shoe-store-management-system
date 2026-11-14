/**
 * Kịch bản nghiệp vụ của payment.service.ts trên database giả trong bộ nhớ (không cần PostgreSQL, không gọi VNPay thật).
 * Chạy: npx tsx --test tests/payments/*.test.ts   (trong thư mục apps/api)
 */
import { afterEach, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import * as svc from "../../src/modules/payments/payment.service";
import * as vnpay from "../../src/modules/payments/vnpay";
import { createFakePrisma } from "./fake-prisma";
import { SECRET, ipnQuery, makeOrder, queryDrResponse, useMockEnv, useVnpayEnv } from "./helpers";

const fake = createFakePrisma();
svc._usePrismaForTests(fake.prisma);

const IP = "127.0.0.1";
const ORDER_FIELDS = (id: string) => fake.db().order.find((o) => o.id === id)!;
const PAYMENTS = (orderId: string) => fake.db().payment.filter((p) => p.orderId === orderId);
const rejects = (p: Promise<unknown>, status: number) => assert.rejects(p, (e: any) => e.status === status);
const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("Chế độ mock và COD", () => {
  beforeEach(() => useMockEnv());

  test("S-mock: VNPay giả lập thành công -> Payment PAID, đơn CONFIRMED/PAID", async () => {
    const order = makeOrder();
    fake.reset({ order: [order] });
    const r = await svc.createPayment("user-1", { orderId: order.id, method: "VNPAY" }, IP);
    assert.equal(r.status, "PAID");
    assert.equal(r.orderStatus, "CONFIRMED");
    assert.equal(ORDER_FIELDS(order.id).paymentStatus, "PAID");
    assert.deepEqual(fake.prisma.locks, [order.id], "phải khoá theo đơn trước khi đọc");
  });

  test("Thất bại rồi thanh toán lại: tạo giao dịch mới, lần sau thành công", async () => {
    const order = makeOrder();
    fake.reset({ order: [order] });
    const fail = await svc.createPayment("user-1", { orderId: order.id, method: "VNPAY", simulateResult: "FAILED" }, IP);
    assert.equal(fail.status, "FAILED");
    assert.equal(ORDER_FIELDS(order.id).status, "PENDING");
    assert.equal(ORDER_FIELDS(order.id).paymentStatus, "FAILED");
    const ok = await svc.createPayment("user-1", { orderId: order.id, method: "VNPAY" }, IP);
    assert.notEqual(ok.id, fail.id);
    assert.equal(ok.status, "PAID");
    assert.equal(PAYMENTS(order.id).length, 2);
  });

  test("COD: đơn CONFIRMED ngay, gọi lại không tạo trùng, không đổi sang VNPay được", async () => {
    const order = makeOrder();
    fake.reset({ order: [order] });
    const a = await svc.createPayment("user-1", { orderId: order.id, method: "COD" }, IP);
    const b = await svc.createPayment("user-1", { orderId: order.id, method: "COD" }, IP);
    assert.equal(a.id, b.id);
    assert.equal(a.orderStatus, "CONFIRMED");
    assert.equal(a.orderPaymentStatus, "UNPAID");
    assert.equal(PAYMENTS(order.id).length, 1);
    await rejects(svc.createPayment("user-1", { orderId: order.id, method: "VNPAY" }, IP), 409);
  });

  test("Phân quyền và trạng thái: đơn người khác 404, đơn đã PAID 409, đơn đã huỷ 409", async () => {
    const paid = makeOrder({ paymentStatus: "PAID", status: "CONFIRMED" });
    const cancelled = makeOrder({ status: "CANCELLED" });
    const other = makeOrder({ userId: "user-2" });
    fake.reset({ order: [paid, cancelled, other] });
    await rejects(svc.createPayment("user-1", { orderId: other.id, method: "COD" }, IP), 404);
    await rejects(svc.createPayment("user-1", { orderId: paid.id, method: "VNPAY" }, IP), 409);
    await rejects(svc.createPayment("user-1", { orderId: cancelled.id, method: "VNPAY" }, IP), 409);
    assert.equal(fake.db().payment.length, 0);
  });

  test("simulateResult bị từ chối khi không bật giả lập", async () => {
    useVnpayEnv();
    const order = makeOrder();
    fake.reset({ order: [order] });
    await rejects(svc.createPayment("user-1", { orderId: order.id, method: "VNPAY", simulateResult: "SUCCESS" }, IP), 400);
  });

  test("Rollback: lỗi giữa chừng thì không còn Payment mồ côi", async () => {
    const order = makeOrder();
    fake.reset({ order: [order] });
    fake.hooks.beforeUpdate = (table) => {
      if (table === "order") throw new Error("DB down");
    };
    await assert.rejects(svc.createPayment("user-1", { orderId: order.id, method: "COD" }, IP));
    assert.equal(fake.db().payment.length, 0);
    assert.equal(ORDER_FIELDS(order.id).status, "PENDING");
  });
});

describe("VNPay Sandbox (IPN, hết hạn, đơn huỷ)", () => {
  beforeEach(() => useVnpayEnv());

  async function taoLink() {
    const order = makeOrder();
    fake.reset({ order: [order] });
    const r = await svc.createPayment("user-1", { orderId: order.id, method: "VNPAY" }, IP);
    return { order, r };
  }

  test("Tạo link: PENDING, có paymentUrl hạn = giờ giữ đơn; bấm lại nhận đúng link cũ", async () => {
    const { order, r } = await taoLink();
    assert.equal(r.status, "PENDING");
    assert.ok(r.paymentUrl?.startsWith("https://sandbox.vnpayment.vn/"));
    assert.equal(ORDER_FIELDS(order.id).paymentStatus, "PENDING");
    const again = await svc.createPayment("user-1", { orderId: order.id, method: "VNPAY" }, IP);
    assert.equal(again.id, r.id);
    assert.equal(again.paymentUrl, r.paymentUrl);
    assert.equal(PAYMENTS(order.id).length, 1);
    const exp = new Date(r.expiresAt!).getTime();
    assert.ok(Math.abs(exp - (order.createdAt.getTime() + 30 * 60_000)) < 1000);
  });

  test("IPN thành công -> PAID; IPN lặp lại trả 02 và KHÔNG đổi dữ liệu", async () => {
    const { order, r } = await taoLink();
    const q = ipnQuery({ id: r.id, amount: 500000 });
    assert.deepEqual(await svc.ipn(q), { RspCode: "00", Message: "Confirm success" });
    const snapshot = JSON.stringify(fake.db());
    assert.equal((await svc.ipn(q)).RspCode, "02");
    assert.equal((await svc.ipn(q)).RspCode, "02");
    assert.equal(JSON.stringify(fake.db()), snapshot, "callback lặp không được ghi thêm");
    const o = ORDER_FIELDS(order.id);
    assert.equal(o.paymentStatus, "PAID");
    assert.equal(o.status, "CONFIRMED");
    assert.equal(PAYMENTS(order.id)[0].providerTransactionId, "14000001");
  });

  test("IPN sai chữ ký -> 97, sai số tiền -> 04, mã giao dịch lạ -> 01; dữ liệu không đổi", async () => {
    const { order, r } = await taoLink();
    const q = ipnQuery({ id: r.id, amount: 500000 });
    assert.equal((await svc.ipn({ ...q, vnp_Amount: "100" })).RspCode, "97"); // sửa sau khi ký
    assert.equal((await svc.ipn(ipnQuery({ id: r.id, amount: 1000 }))).RspCode, "04");
    assert.equal((await svc.ipn(ipnQuery({ id: "00000000-0000-0000-0000-000000000000", amount: 500000 }))).RspCode, "01");
    assert.equal(PAYMENTS(order.id)[0].status, "PENDING");
    assert.equal(ORDER_FIELDS(order.id).paymentStatus, "PENDING");
  });

  test("Khách huỷ trên VNPay (24) -> FAILED, bấm thanh toán lại tạo link mới", async () => {
    const { order, r } = await taoLink();
    assert.equal((await svc.ipn(ipnQuery({ id: r.id, amount: 500000 }, { vnp_ResponseCode: "24", vnp_TransactionStatus: "02" }))).RspCode, "00");
    const res = await svc.byReference("user-1", r.reference);
    assert.equal(res.status, "FAILED");
    assert.equal(res.failureReason, "VNPAY_24");
    assert.equal(res.expired, false);
    const retry = await svc.createPayment("user-1", { orderId: order.id, method: "VNPAY" }, IP);
    assert.notEqual(retry.id, r.id);
    assert.equal(retry.status, "PENDING");
  });

  test("Trạng thái chưa chắc chắn (01) -> giữ PENDING, chờ đối soát", async () => {
    const { order, r } = await taoLink();
    assert.equal((await svc.ipn(ipnQuery({ id: r.id, amount: 500000 }, { vnp_TransactionStatus: "01" }))).RspCode, "99");
    assert.equal(PAYMENTS(order.id)[0].status, "PENDING");
  });

  test("Link hết hạn: response báo expired; tạo lại thì đóng link cũ (EXPIRED); tiền link cũ về muộn vẫn được ghi", async () => {
    const order = makeOrder({ createdAt: new Date(Date.now() - 10 * 60_000) });
    fake.reset({ order: [order] });
    const r = await svc.createPayment("user-1", { orderId: order.id, method: "VNPAY" }, IP);
    // Giả lập link đã quá hạn 10 phút (vượt cả 5 phút ân hạn)
    const old = fake.db().payment[0];
    const url = new URL(old.paymentUrl);
    url.searchParams.set("vnp_ExpireDate", vnpay.vnpDate(new Date(Date.now() - 10 * 60_000)));
    old.paymentUrl = url.toString();

    const view = await svc.byReference("user-1", r.reference);
    assert.equal(view.expired, true);

    const fresh = await svc.createPayment("user-1", { orderId: order.id, method: "VNPAY" }, IP);
    assert.notEqual(fresh.id, r.id);
    assert.equal(fake.db().payment.find((p) => p.id === r.id)!.failureReason, "EXPIRED");

    // Tiền của link cũ vẫn về (khách đã thanh toán trước khi hết hạn)
    assert.equal((await svc.ipn(ipnQuery({ id: r.id, amount: 500000 }))).RspCode, "00");
    assert.equal(fake.db().payment.find((p) => p.id === r.id)!.status, "PAID");
    assert.equal(ORDER_FIELDS(order.id).paymentStatus, "PAID");
  });

  test("Hết thời gian giữ đơn -> 409, không tạo giao dịch", async () => {
    const order = makeOrder({ createdAt: new Date(Date.now() - 29 * 60_000) }); // còn 1 phút < 3 phút tối thiểu
    fake.reset({ order: [order] });
    await rejects(svc.createPayment("user-1", { orderId: order.id, method: "VNPAY" }, IP), 409);
    assert.equal(fake.db().payment.length, 0);
  });

  test("Đơn bị huỷ (M4 gọi closePaymentsForCancelledOrder) rồi tiền về muộn -> ghi nhận, báo cần hoàn tiền", async () => {
    const { order, r } = await taoLink();
    await fake.prisma.$transaction(async (tx: any) => {
      const res = await svc.closePaymentsForCancelledOrder(tx, order.id);
      assert.deepEqual(res, { closed: 1, alreadyPaid: false });
      await tx.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
    });
    let view = await svc.byReference("user-1", r.reference);
    assert.equal(view.failureReason, "ORDER_CANCELLED");
    assert.equal(view.refundRequired, false);

    assert.equal((await svc.ipn(ipnQuery({ id: r.id, amount: 500000 }))).RspCode, "00");
    view = await svc.byReference("user-1", r.reference);
    assert.equal(view.status, "PAID");
    assert.equal(view.orderStatus, "CANCELLED", "không được tự mở lại đơn đã huỷ");
    assert.equal(view.refundRequired, true);
    // IPN lặp sau đó không ghi thêm
    assert.equal((await svc.ipn(ipnQuery({ id: r.id, amount: 500000 }))).RspCode, "02");
  });

  test("Đối soát (QueryDR) khi IPN không tới được localhost -> PAID", async () => {
    const { order, r } = await taoLink();
    globalThis.fetch = (async () =>
      new Response(JSON.stringify(queryDrResponse(r.reference, 500000)), { status: 200 })) as typeof fetch;
    const res = await svc.reconcile("user-1", r.id);
    assert.equal(res.status, "PAID");
    assert.equal(res.transactionId, "14000099");
    assert.equal(ORDER_FIELDS(order.id).status, "CONFIRMED");
    // Người khác không đối soát được giao dịch này
    await rejects(svc.reconcile("user-2", r.id), 404);
  });

  test("Đối soát: phản hồi bị sửa (sai chữ ký) -> 503, giữ PENDING", async () => {
    const { order, r } = await taoLink();
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ ...queryDrResponse(r.reference, 500000), vnp_Amount: "1" }), { status: 200 })) as typeof fetch;
    await rejects(svc.reconcile("user-1", r.id), 503);
    assert.equal(PAYMENTS(order.id)[0].status, "PENDING");
  });

  test("Khoá bí mật không xuất hiện trong response, link hay log lỗi", async () => {
    const { r } = await taoLink();
    const logs: string[] = [];
    const saved = { error: console.error, warn: console.warn, log: console.log };
    console.error = console.warn = console.log = (...a: unknown[]) => { logs.push(a.map((x) => (x instanceof Error ? x.stack : JSON.stringify(x))).join(" ")); };
    try {
      const findUnique = fake.prisma.payment.findUnique;
      fake.prisma.payment.findUnique = async () => { throw new Error("connection lost"); };
      assert.equal((await svc.ipn(ipnQuery({ id: r.id, amount: 500000 }))).RspCode, "99");
      fake.prisma.payment.findUnique = findUnique;
    } finally {
      Object.assign(console, saved);
    }
    assert.ok(logs.length > 0);
    for (const text of [...logs, JSON.stringify(r), JSON.stringify(svc.getConfig())]) assert.ok(!text.includes(SECRET));
  });
});
