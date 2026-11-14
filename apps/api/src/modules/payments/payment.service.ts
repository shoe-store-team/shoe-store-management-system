import { Prisma, type Order, type Payment } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { prisma as realPrisma } from "../../config/prisma"; // đổi nếu prisma.ts export tên khác

// Test thay bằng database giả qua _usePrismaForTests (code chạy thật luôn dùng realPrisma).
let prisma = realPrisma;
export function _usePrismaForTests(client: unknown) {
  prisma = client as typeof realPrisma;
}
import { PaymentError } from "./payment.errors";
import * as vnpay from "./vnpay";

type Tx = Prisma.TransactionClient;
type Outcome = { success: boolean; transactionNo?: string; paidAt?: Date | null; code: string };

export type CreatePaymentInput = {
  orderId: string;
  method: "COD" | "VNPAY";
  bankCode?: "VNPAYQR" | "VNBANK" | "INTCARD";
  simulateResult?: "SUCCESS" | "FAILED";
};

const GRACE_MS = 5 * 60_000; // cho IPN trễ sau khi link hết hạn
const MIN_LINK_MS = 3 * 60_000; // đơn còn ít hơn 3 phút giữ hàng thì không tạo link mới
// Giao dịch do HỆ THỐNG tự đóng: nếu tiền vẫn về muộn thì vẫn được ghi nhận.
const CLOSED_BY_SYSTEM = ["EXPIRED", "SWITCHED", "ORDER_CANCELLED"];

const holdMinutes = () => Number(process.env.ORDER_HOLD_MINUTES) || 30;

/* ---------------------------------------------------------------- cấu hình */

export function getConfig() {
  const provider = process.env.PAYMENT_PROVIDER ?? "vnpay";
  if (provider !== "vnpay" && provider !== "mock")
    throw new PaymentError(503, "PAYMENT_PROVIDER không hợp lệ (vnpay | mock).");
  const isProd = process.env.NODE_ENV === "production";
  if (provider === "mock" && isProd && process.env.PAYMENT_ALLOW_MOCK_IN_PRODUCTION !== "true")
    throw new PaymentError(503, "Production cần PAYMENT_ALLOW_MOCK_IN_PRODUCTION=true để dùng mock.");
  return {
    provider,
    configured: provider === "mock" || vnpay.isConfigured(), // true = thanh toán trực tuyến dùng được
    methods: ["COD", "VNPAY"],
    channels: ["VNPAYQR", "VNBANK", "INTCARD"],
    holdMinutes: holdMinutes(),
    allowSimulate: provider === "mock" && process.env.PAYMENT_MOCK_ALLOW_OVERRIDE === "true",
  };
}

/* ---------------------------------------------------------------- helpers */

// Khoá theo đơn hàng: 2 request song song trên cùng đơn chạy tuần tự.
// (orders.service dùng CÙNG biểu thức hashtext để huỷ đơn không đụng thanh toán)
export const lockOrder = (tx: Tx, orderId: string) =>
  tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${orderId}::text))`;

const orderCodeOf = (orderId: string) => `DH-${orderId.slice(0, 8).toUpperCase()}`;

function expiryOf(payment: Payment) {
  const raw = payment.paymentUrl ? new URL(payment.paymentUrl).searchParams.get("vnp_ExpireDate") : null;
  return vnpay.parsePayDate(raw ?? undefined);
}
function isExpired(payment: Payment) {
  const exp = expiryOf(payment);
  return !exp || exp.getTime() + GRACE_MS < Date.now();
}
const isClosedBySystem = (p: Payment) => p.status === "FAILED" && CLOSED_BY_SYSTEM.includes(p.failureReason ?? "");

const sameAmount = (vnpAmount: string | undefined, amount: Prisma.Decimal) =>
  /^\d+$/.test(vnpAmount ?? "") && BigInt(vnpAmount!) === BigInt(amount.toFixed(0)) * 100n;

const validTxn = (no: string | undefined, date: Date | null) =>
  Boolean(date) && /^[0-9]{1,15}$/.test(no ?? "") && no !== "0";

export function toResponse(payment: Payment, order: Pick<Order, "status" | "paymentStatus">) {
  const expired =
    payment.method === "VNPAY" &&
    ((payment.status === "PENDING" && Boolean(payment.paymentUrl) && isExpired(payment)) ||
      (payment.status === "FAILED" && payment.failureReason === "EXPIRED"));
  return {
    id: payment.id,
    orderId: payment.orderId,
    orderCode: orderCodeOf(payment.orderId),
    method: payment.method,
    status: payment.status,
    orderStatus: order.status,
    orderPaymentStatus: order.paymentStatus,
    amount: Number(payment.amount),
    transactionId: payment.providerTransactionId,
    paidAt: payment.paidAt?.toISOString() ?? null,
    reference: vnpay.toTxnRef(payment.id),
    paymentUrl: payment.status === "PENDING" ? payment.paymentUrl : null,
    expiresAt: expiryOf(payment)?.toISOString() ?? null,
    // VD: VNPAY_24 (khách huỷ), EXPIRED, SWITCHED (đổi sang COD), ORDER_CANCELLED
    failureReason: payment.status === "FAILED" ? payment.failureReason : null,
    expired,
    // Đơn đã huỷ nhưng tiền đã về: admin cần hoàn tiền thủ công
    refundRequired: order.status === "CANCELLED" && order.paymentStatus === "PAID",
  };
}

/* ---------------------------------------------------------------- ghi kết quả */

/** Ghi kết quả cuối cùng vào payment + order. Không bao giờ bỏ sót một giao dịch đã thu tiền. */
async function finalize(tx: Tx, payment: Payment, order: Order, r: Outcome) {
  if (!r.success) {
    const updatedPayment = await tx.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED", failureReason: `VNPAY_${r.code}` },
    });
    const updatedOrder =
      order.paymentStatus === "PAID"
        ? order
        : await tx.order.update({ where: { id: order.id }, data: { paymentStatus: "FAILED" } });
    return { payment: updatedPayment, order: updatedOrder };
  }

  if (order.paymentStatus === "PAID" || order.status === "CANCELLED")
    console.warn(`[payments] Đơn ${order.id} (${order.status}/${order.paymentStatus}) vừa nhận thêm tiền từ payment ${payment.id}: cần xử lý hoàn tiền.`);

  const updatedPayment = await tx.payment.update({
    where: { id: payment.id },
    data: { status: "PAID", providerTransactionId: r.transactionNo, paidAt: r.paidAt ?? new Date(), failureReason: null },
  });
  const updatedOrder = await tx.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: "PAID",
      status: order.status === "PENDING" ? "CONFIRMED" : order.status,
    },
  });
  return { payment: updatedPayment, order: updatedOrder };
}

/* ---------------------------------------------------------------- tạo thanh toán */

export async function createPayment(userId: string, input: CreatePaymentInput, ip: string) {
  const { provider, configured, allowSimulate } = getConfig();
  if (input.method === "VNPAY" && !configured)
    throw new PaymentError(503, "Thanh toán trực tuyến chưa được cấu hình (VNPAY_TMN_CODE, VNPAY_HASH_SECRET, VNPAY_RETURN_URL).");
  if (input.simulateResult && !allowSimulate)
    throw new PaymentError(400, "Chỉ chọn được kết quả khi bật chế độ giả lập (mock).");

  return prisma.$transaction(
    async (tx) => {
      await lockOrder(tx, input.orderId);

      const order = await tx.order.findFirst({ where: { id: input.orderId, userId } });
      if (!order) throw new PaymentError(404, "Không tìm thấy đơn hàng.");

      const pending = await tx.payment.findFirst({
        where: { orderId: order.id, status: "PENDING" },
        orderBy: { createdAt: "desc" },
      });

      // Đã chọn thanh toán khi nhận hàng: bấm lại thì trả lại đúng giao dịch đó.
      if (pending?.method === "COD") {
        if (input.method === "COD") return toResponse(pending, order);
        throw new PaymentError(409, "Đơn hàng đã chọn thanh toán khi nhận hàng.");
      }
      if (order.paymentStatus === "PAID") throw new PaymentError(409, "Đơn hàng đã được thanh toán.");
      if (order.status !== "PENDING") throw new PaymentError(409, "Đơn hàng không còn ở trạng thái chờ thanh toán.");

      // Có link VNPay đang chờ
      if (pending) {
        if (input.method === "VNPAY" && !isExpired(pending)) return toResponse(pending, order); // dùng lại link cũ
        // Đổi sang COD hoặc link đã hết hạn -> đóng giao dịch cũ (tiền về muộn vẫn được ghi nhận)
        await tx.payment.update({
          where: { id: pending.id },
          data: { status: "FAILED", failureReason: input.method === "COD" ? "SWITCHED" : "EXPIRED" },
        });
      }

      const amount = Number(order.totalAmount);
      if (!Number.isSafeInteger(amount) || amount < 0 || amount > 9_999_999_999)
        throw new PaymentError(400, "Số tiền thanh toán không hợp lệ (VND phải là số nguyên).");

      const id = randomUUID();
      const now = new Date();

      /* ---- Thanh toán khi nhận hàng: đơn được xác nhận ngay, tiền thu lúc giao ---- */
      if (input.method === "COD") {
        const payment = await tx.payment.create({
          data: { id, orderId: order.id, method: "COD", status: "PENDING", amount: order.totalAmount },
        });
        const updatedOrder = await tx.order.update({ where: { id: order.id }, data: { status: "CONFIRMED" } });
        return toResponse(payment, updatedOrder);
      }

      /* ---- Thanh toán trực tuyến (VNPay / mock / đơn 0đ) ---- */
      const free = amount === 0;
      const instant = free || provider === "mock";
      // Link chỉ sống tới hết thời gian giữ hàng của đơn (mặc định 30 phút kể từ lúc đặt)
      const expires = new Date(order.createdAt.getTime() + holdMinutes() * 60_000);
      if (!instant && expires.getTime() - now.getTime() < MIN_LINK_MS)
        throw new PaymentError(409, "Đơn hàng đã hết thời gian giữ hàng. Vui lòng đặt lại.");

      const paymentUrl = instant
        ? null
        : vnpay.createUrl({
            amount,
            txnRef: vnpay.toTxnRef(id),
            orderInfo: `Thanh toan don hang ${orderCodeOf(order.id)}`,
            now,
            expires,
            ip,
            bankCode: input.bankCode,
          });

      const payment = await tx.payment.create({
        data: { id, orderId: order.id, method: "VNPAY", status: "PENDING", amount: order.totalAmount, paymentUrl },
      });

      if (instant) {
        const success = free || input.simulateResult !== "FAILED";
        const done = await finalize(tx, payment, order, {
          success,
          transactionNo: `${free ? "FREE" : "MOCK"}-${randomUUID()}`,
          paidAt: now,
          code: success ? "00" : "24",
        });
        return toResponse(done.payment, done.order);
      }

      const updatedOrder = await tx.order.update({ where: { id: order.id }, data: { paymentStatus: "PENDING" } });
      return toResponse(payment, updatedOrder);
    },
    { maxWait: 10_000, timeout: 20_000 },
  );
}

/* ---------------------------------------------------------------- IPN (VNPay -> server) */

export async function ipn(query: Record<string, unknown>) {
  try {
    const params = vnpay.extractParams(query);
    if (!params || !vnpay.verify(params)) return { RspCode: "97", Message: "Invalid signature" };

    const paymentId = vnpay.fromTxnRef(params.vnp_TxnRef ?? "");
    const found = paymentId ? await prisma.payment.findUnique({ where: { id: paymentId } }) : null;
    if (!found || found.method !== "VNPAY") return { RspCode: "01", Message: "Order not found" };

    return await prisma.$transaction(async (tx) => {
      await lockOrder(tx, found.orderId);
      const payment = await tx.payment.findUniqueOrThrow({ where: { id: found.id } });
      const order = await tx.order.findUniqueOrThrow({ where: { id: payment.orderId } });

      if (!sameAmount(params.vnp_Amount, payment.amount) || !payment.amount.equals(order.totalAmount))
        return { RspCode: "04", Message: "Invalid amount" };

      // Link đã bị hệ thống đóng nhưng tiền vẫn về muộn -> vẫn được ghi nhận.
      const reopen = isClosedBySystem(payment);
      if (payment.status !== "PENDING" && !reopen) return { RspCode: "02", Message: "Order already confirmed" };

      const { vnp_ResponseCode: rc, vnp_TransactionStatus: ts } = params;
      if (!/^\d{2}$/.test(rc ?? "") || !/^\d{2}$/.test(ts ?? "")) return { RspCode: "99", Message: "Invalid result" };
      // Trạng thái chưa chắc chắn (nghi ngờ/đảo/đang xử lý): để PENDING, chờ đối soát.
      if (["01", "04", "05", "06", "07", "09"].includes(ts) || rc === "07")
        return { RspCode: "99", Message: "Pending reconciliation" };

      const success = rc === "00" && ts === "00";
      if (!success && reopen) return { RspCode: "00", Message: "Confirm success" };

      const date = vnpay.parsePayDate(params.vnp_PayDate);
      if (success && !validTxn(params.vnp_TransactionNo, date)) return { RspCode: "99", Message: "Invalid transaction" };

      await finalize(tx, payment, order, { success, transactionNo: params.vnp_TransactionNo, paidAt: date, code: rc });
      return { RspCode: "00", Message: "Confirm success" };
    });
  } catch (e) {
    console.error("[payments] VNPay IPN lỗi, VNPay sẽ gọi lại:", e);
    return { RspCode: "99", Message: "Temporary error" };
  }
}

/* ---------------------------------------------------------------- tra cứu / đối soát */

export async function byReference(userId: string, ref: string) {
  const id = vnpay.fromTxnRef(ref);
  const payment = id ? await prisma.payment.findFirst({ where: { id, order: { userId } }, include: { order: true } }) : null;
  if (!payment) throw new PaymentError(404, "Không tìm thấy giao dịch.");
  return toResponse(payment, payment.order);
}

/** Hỏi VNPay (QueryDR) khi IPN chưa tới được server (VD: chạy localhost) và ghi kết quả. */
export async function reconcile(userId: string, id: string) {
  const payment = await prisma.payment.findFirst({ where: { id, order: { userId } }, include: { order: true } });
  if (!payment) throw new PaymentError(404, "Không tìm thấy giao dịch.");
  if ((payment.status !== "PENDING" && !isClosedBySystem(payment)) || payment.method !== "VNPAY" || !payment.paymentUrl)
    return toResponse(payment, payment.order);

  const createDate = new URL(payment.paymentUrl).searchParams.get("vnp_CreateDate");
  if (!createDate) throw new PaymentError(409, "Giao dịch thiếu thời gian khởi tạo.");

  const result = await vnpay.queryTransaction(vnpay.toTxnRef(payment.id), createDate);
  if (result.vnp_ResponseCode !== "00" || result.vnp_TransactionType !== "01" || !["00", "02"].includes(result.vnp_TransactionStatus))
    return { ...toResponse(payment, payment.order), message: "VNPay chưa xác nhận kết quả cuối cùng. Thử lại sau." };
  if (!sameAmount(result.vnp_Amount, payment.amount)) throw new PaymentError(409, "Số tiền đối soát không khớp.");

  return prisma.$transaction(async (tx) => {
    await lockOrder(tx, payment.orderId);
    const current = await tx.payment.findUniqueOrThrow({ where: { id } });
    const order = await tx.order.findUniqueOrThrow({ where: { id: payment.orderId } });
    if (current.status !== "PENDING" && !isClosedBySystem(current)) return toResponse(current, order);

    const success = result.vnp_TransactionStatus === "00";
    const paidAt = vnpay.parsePayDate(result.vnp_PayDate);
    if (success && !validTxn(result.vnp_TransactionNo, paidAt))
      throw new PaymentError(409, "Kết quả đối soát thiếu mã/thời gian giao dịch.");
    if (!success && isClosedBySystem(current)) return toResponse(current, order);

    const done = await finalize(tx, current, order, {
      success, transactionNo: result.vnp_TransactionNo, paidAt, code: success ? "00" : "99",
    });
    return toResponse(done.payment, done.order);
  });
}

/* ---------------------------------------------------------------- dọn link hết hạn (server.ts gọi định kỳ) */

/**
 * Đóng các link VNPay đã quá hạn (kèm 5 phút ân hạn) với lý do EXPIRED. Trả về số giao dịch đã đóng.
 * - Đơn chuyển paymentStatus PENDING -> FAILED để khách thấy "hết hạn" và có thể thanh toán lại (nếu còn giờ giữ hàng).
 * - EXPIRED là trạng thái "hệ thống tự đóng": nếu tiền vẫn về muộn, IPN/đối soát vẫn ghi nhận.
 * - Mỗi đơn xử lý trong transaction riêng, có khoá đơn, nên không chạy chen với IPN.
 */
export async function expirePendingPayments(now: Date = new Date()) {
  const candidates = await prisma.payment.findMany({
    where: { method: "VNPAY", status: "PENDING", createdAt: { lt: new Date(now.getTime() - GRACE_MS) } },
    select: { id: true, orderId: true },
    take: 200,
  });
  let expired = 0;
  for (const c of candidates) {
    try {
      const closed = await prisma.$transaction(async (tx) => {
        await lockOrder(tx, c.orderId);
        const payment = await tx.payment.findUnique({ where: { id: c.id } });
        if (!payment || payment.status !== "PENDING") return false;
        const exp = expiryOf(payment);
        if (exp && exp.getTime() + GRACE_MS >= now.getTime()) return false;
        await tx.payment.update({ where: { id: payment.id }, data: { status: "FAILED", failureReason: "EXPIRED" } });
        await tx.order.updateMany({ where: { id: payment.orderId, paymentStatus: "PENDING" }, data: { paymentStatus: "FAILED" } });
        return true;
      });
      if (closed) expired++;
    } catch (e) {
      console.error(`[payments] Không đóng được giao dịch hết hạn ${c.id}:`, e);
    }
  }
  return expired;
}

/* ---------------------------------------------------------------- dành cho module orders (M4/M5) */

/**
 * M4 gọi hàm này BÊN TRONG transaction huỷ đơn, TRƯỚC khi đổi Order.status = CANCELLED và hoàn kho:
 *
 *   await prisma.$transaction(async (tx) => {
 *     const { alreadyPaid } = await closePaymentsForCancelledOrder(tx, orderId);
 *     if (alreadyPaid) throw new Error("Đơn đã thanh toán, cần hoàn tiền trước khi huỷ");   // tuỳ nghiệp vụ
 *     const o = await tx.order.updateMany({ where: { id: orderId, status: { not: "CANCELLED" } }, data: { status: "CANCELLED" } });
 *     if (o.count === 1) { ...hoàn kho đúng 1 lần... }
 *   });
 *
 * - Khoá đơn bằng cùng advisory lock với payments, nên không chạy chen với IPN/đối soát.
 * - Đóng mọi giao dịch PENDING với lý do ORDER_CANCELLED. Nếu tiền VNPay vẫn về muộn,
 *   IPN/đối soát vẫn ghi nhận (paymentStatus = PAID, status giữ CANCELLED) để admin hoàn tiền.
 */
export async function closePaymentsForCancelledOrder(tx: Tx, orderId: string) {
  await lockOrder(tx, orderId);
  const order = await tx.order.findUnique({ where: { id: orderId }, select: { paymentStatus: true } });
  const { count } = await tx.payment.updateMany({
    where: { orderId, status: "PENDING" },
    data: { status: "FAILED", failureReason: "ORDER_CANCELLED" },
  });
  return { closed: count, alreadyPaid: order?.paymentStatus === "PAID" };
}
