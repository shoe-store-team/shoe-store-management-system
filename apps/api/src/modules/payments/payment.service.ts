import { Prisma, type Order, type Payment } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { prisma } from "../../config/prisma"; // đổi nếu prisma.ts export tên khác
import { AppError } from "../../middlewares/error.middleware";
import * as vnpay from "./vnpay";
import { paymentRouter } from "./payment.router";
export default paymentRouter;

type Tx = Prisma.TransactionClient;
type Outcome = {
  success: boolean;
  transactionNo?: string;
  paidAt?: Date | null;
  code: string;
};

export type CreatePaymentInput = {
  orderId: string;
  bankCode?: "VNPAYQR" | "VNBANK" | "INTCARD";
  simulateResult?: "SUCCESS" | "FAILED";
};

const GRACE_MS = 5 * 60_000; // cho IPN trễ sau khi link hết hạn

/* ---------------------------------------------------------------- cấu hình */

export function getConfig() {
  const provider = process.env.PAYMENT_PROVIDER ?? "vnpay";
  if (provider !== "vnpay" && provider !== "mock")
    throw new AppError(503, "PAYMENT_PROVIDER không hợp lệ (vnpay | mock).");
  const isProd = process.env.NODE_ENV === "production";
  if (
    provider === "mock" &&
    isProd &&
    process.env.PAYMENT_ALLOW_MOCK_IN_PRODUCTION !== "true"
  )
    throw new AppError(
      503,
      "Production cần PAYMENT_ALLOW_MOCK_IN_PRODUCTION=true để dùng mock.",
    );
  return {
    provider,
    configured: provider === "mock" || vnpay.isConfigured(),
    channels: ["VNPAYQR", "VNBANK", "INTCARD"],
    allowSimulate:
      provider === "mock" && process.env.PAYMENT_MOCK_ALLOW_OVERRIDE === "true",
  };
}

/* ---------------------------------------------------------------- helpers */

// Khoá theo đơn hàng: 2 request song song trên cùng đơn sẽ chạy tuần tự (thay cho Idempotency-Key).
const lockOrder = (tx: Tx, orderId: string) =>
  tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${orderId}::text))`;

function expiryOf(payment: Payment) {
  const raw = payment.paymentUrl
    ? new URL(payment.paymentUrl).searchParams.get("vnp_ExpireDate")
    : null;
  return vnpay.parsePayDate(raw ?? undefined);
}
function isExpired(payment: Payment) {
  const exp = expiryOf(payment);
  return !exp || exp.getTime() + GRACE_MS < Date.now();
}
const isExpiredFailure = (p: Payment) =>
  p.status === "FAILED" && p.failureReason === "EXPIRED";

const sameAmount = (vnpAmount: string | undefined, amount: Prisma.Decimal) =>
  /^\d+$/.test(vnpAmount ?? "") &&
  BigInt(vnpAmount!) === BigInt(amount.toFixed(0)) * 100n;

const validTxn = (no: string | undefined, date: Date | null) =>
  Boolean(date) && /^[0-9]{1,15}$/.test(no ?? "") && no !== "0";

export function toResponse(
  payment: Payment,
  order: Pick<Order, "status" | "paymentStatus">,
) {
  return {
    id: payment.id,
    orderId: payment.orderId,
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
        : await tx.order.update({
            where: { id: order.id },
            data: { paymentStatus: "FAILED" },
          });
    return { payment: updatedPayment, order: updatedOrder };
  }

  if (order.paymentStatus === "PAID" || order.status === "CANCELLED")
    console.warn(
      `[payments] Đơn ${order.id} (${order.status}/${order.paymentStatus}) vừa nhận thêm tiền từ payment ${payment.id}: cần xử lý hoàn tiền.`,
    );

  const updatedPayment = await tx.payment.update({
    where: { id: payment.id },
    data: {
      status: "PAID",
      providerTransactionId: r.transactionNo,
      paidAt: r.paidAt ?? new Date(),
      failureReason: null,
    },
  });
  const updatedOrder = await tx.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: "PAID",
      ...(order.status === "PENDING" ? { status: "CONFIRMED" } : {}),
    },
  });
  return { payment: updatedPayment, order: updatedOrder };
}

/* ---------------------------------------------------------------- tạo thanh toán */

export async function createPayment(
  userId: string,
  input: CreatePaymentInput,
  ip: string,
) {
  const { provider, configured, allowSimulate } = getConfig();
  if (!configured)
    throw new AppError(
      503,
      "Chưa cấu hình VNPAY_TMN_CODE, VNPAY_HASH_SECRET, VNPAY_RETURN_URL trong .env.",
    );
  if (input.simulateResult && !allowSimulate)
    throw new AppError(
      400,
      "Chỉ chọn được kết quả khi bật chế độ giả lập (mock).",
    );

  return prisma.$transaction(
    async (tx) => {
      await lockOrder(tx, input.orderId);

      const order = await tx.order.findFirst({
        where: { id: input.orderId, userId },
      });
      if (!order) throw new AppError(404, "Không tìm thấy đơn hàng.");
      if (order.paymentStatus === "PAID")
        throw new AppError(409, "Đơn hàng đã được thanh toán.");
      if (order.status !== "PENDING")
        throw new AppError(
          409,
          "Đơn hàng không còn ở trạng thái chờ thanh toán.",
        );

      // Đã có giao dịch đang chờ -> dùng lại (idempotent), hết hạn thì đóng lại để tạo mới.
      const pending = await tx.payment.findFirst({
        where: { orderId: order.id, status: "PENDING" },
        orderBy: { createdAt: "desc" },
      });
      if (pending) {
        if (!isExpired(pending)) return toResponse(pending, order);
        await tx.payment.update({
          where: { id: pending.id },
          data: { status: "FAILED", failureReason: "EXPIRED" },
        });
      }

      const amount = Number(order.totalAmount);
      if (!Number.isSafeInteger(amount) || amount < 0 || amount > 9_999_999_999)
        throw new AppError(
          400,
          "Số tiền thanh toán không hợp lệ (VND phải là số nguyên).",
        );

      const id = randomUUID();
      const now = new Date();
      const free = amount === 0;
      const instant = free || provider === "mock";
      const minutes = Math.min(
        Math.max(Number(process.env.VNPAY_EXPIRE_MINUTES) || 15, 5),
        60,
      );

      const paymentUrl = instant
        ? null
        : vnpay.createUrl({
            amount,
            txnRef: vnpay.toTxnRef(id),
            orderInfo: `Thanh toan don hang ${order.id.slice(0, 8).toUpperCase()}`,
            now,
            expires: new Date(now.getTime() + minutes * 60_000),
            ip,
            bankCode: input.bankCode,
          });

      const payment = await tx.payment.create({
        data: {
          id,
          orderId: order.id,
          method: "VNPAY",
          status: "PENDING",
          amount: order.totalAmount,
          paymentUrl,
        },
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

      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: { paymentStatus: "PENDING" },
      });
      return toResponse(payment, updatedOrder);
    },
    { maxWait: 10_000, timeout: 20_000 },
  );
}

/* ---------------------------------------------------------------- IPN (VNPay -> server) */

export async function ipn(query: Record<string, unknown>) {
  try {
    const params = vnpay.extractParams(query);
    if (!params || !vnpay.verify(params))
      return { RspCode: "97", Message: "Invalid signature" };

    const paymentId = vnpay.fromTxnRef(params.vnp_TxnRef ?? "");
    const found = paymentId
      ? await prisma.payment.findUnique({ where: { id: paymentId } })
      : null;
    if (!found || found.method !== "VNPAY")
      return { RspCode: "01", Message: "Order not found" };

    return await prisma.$transaction(async (tx) => {
      await lockOrder(tx, found.orderId);
      const payment = await tx.payment.findUniqueOrThrow({
        where: { id: found.id },
      });
      const order = await tx.order.findUniqueOrThrow({
        where: { id: payment.orderId },
      });

      if (
        !sameAmount(params.vnp_Amount, payment.amount) ||
        !payment.amount.equals(order.totalAmount)
      )
        return { RspCode: "04", Message: "Invalid amount" };

      // Link đã bị đóng vì hết hạn nhưng tiền vẫn về muộn -> vẫn được ghi nhận.
      const reopen = isExpiredFailure(payment);
      if (payment.status !== "PENDING" && !reopen)
        return { RspCode: "02", Message: "Order already confirmed" };

      const { vnp_ResponseCode: rc, vnp_TransactionStatus: ts } = params;
      if (!/^\d{2}$/.test(rc ?? "") || !/^\d{2}$/.test(ts ?? ""))
        return { RspCode: "99", Message: "Invalid result" };
      // Trạng thái chưa chắc chắn (nghi ngờ/đảo/đang xử lý): để PENDING, chờ đối soát.
      if (["01", "04", "05", "06", "07", "09"].includes(ts) || rc === "07")
        return { RspCode: "99", Message: "Pending reconciliation" };

      const success = rc === "00" && ts === "00";
      if (!success && reopen)
        return { RspCode: "00", Message: "Confirm success" };

      const date = vnpay.parsePayDate(params.vnp_PayDate);
      if (success && !validTxn(params.vnp_TransactionNo, date))
        return { RspCode: "99", Message: "Invalid transaction" };

      await finalize(tx, payment, order, {
        success,
        transactionNo: params.vnp_TransactionNo,
        paidAt: date,
        code: rc,
      });
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
  const payment = id
    ? await prisma.payment.findFirst({
        where: { id, order: { userId } },
        include: { order: true },
      })
    : null;
  if (!payment) throw new AppError(404, "Không tìm thấy giao dịch.");
  return toResponse(payment, payment.order);
}

/** Hỏi VNPay (QueryDR) khi IPN chưa tới được server (VD: chạy localhost) và ghi kết quả. */
export async function reconcile(userId: string, id: string) {
  const payment = await prisma.payment.findFirst({
    where: { id, order: { userId } },
    include: { order: true },
  });
  if (!payment) throw new AppError(404, "Không tìm thấy giao dịch.");
  if (
    (payment.status !== "PENDING" && !isExpiredFailure(payment)) ||
    payment.method !== "VNPAY" ||
    !payment.paymentUrl
  )
    return toResponse(payment, payment.order);

  const createDate = new URL(payment.paymentUrl).searchParams.get(
    "vnp_CreateDate",
  );
  if (!createDate)
    throw new AppError(409, "Giao dịch thiếu thời gian khởi tạo.");

  const result = await vnpay.queryTransaction(
    vnpay.toTxnRef(payment.id),
    createDate,
  );
  if (
    result.vnp_ResponseCode !== "00" ||
    result.vnp_TransactionType !== "01" ||
    !["00", "02"].includes(result.vnp_TransactionStatus)
  )
    return {
      ...toResponse(payment, payment.order),
      message: "VNPay chưa xác nhận kết quả cuối cùng. Thử lại sau.",
    };
  if (!sameAmount(result.vnp_Amount, payment.amount))
    throw new AppError(409, "Số tiền đối soát không khớp.");

  return prisma.$transaction(async (tx) => {
    await lockOrder(tx, payment.orderId);
    const current = await tx.payment.findUniqueOrThrow({ where: { id } });
    const order = await tx.order.findUniqueOrThrow({
      where: { id: payment.orderId },
    });
    if (current.status !== "PENDING" && !isExpiredFailure(current))
      return toResponse(current, order);

    const success = result.vnp_TransactionStatus === "00";
    const paidAt = vnpay.parsePayDate(result.vnp_PayDate);
    if (success && !validTxn(result.vnp_TransactionNo, paidAt))
      throw new AppError(409, "Kết quả đối soát thiếu mã/thời gian giao dịch.");
    if (!success && isExpiredFailure(current))
      return toResponse(current, order);

    const done = await finalize(tx, current, order, {
      success,
      transactionNo: result.vnp_TransactionNo,
      paidAt,
      code: success ? "00" : "99",
    });
    return toResponse(done.payment, done.order);
  });
}
