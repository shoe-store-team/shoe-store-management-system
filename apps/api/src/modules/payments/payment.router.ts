import { Router } from "express";
import { authenticateToken } from "../../middlewares/auth.middleware";
import { AppError, asyncHandler } from "../../middlewares/error.middleware";
import * as payments from "./payment.service";
import { extractParams, verify } from "./vnpay";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BANKS = ["VNPAYQR", "VNBANK", "INTCARD"];
const RESULTS = ["SUCCESS", "FAILED"];

function parseCreateBody(body: any): payments.CreatePaymentInput {
  if (typeof body?.orderId !== "string" || !UUID_RE.test(body.orderId))
    throw new AppError(400, "orderId không hợp lệ.");
  if (body.bankCode !== undefined && !BANKS.includes(body.bankCode))
    throw new AppError(400, "bankCode không hợp lệ.");
  if (body.simulateResult !== undefined && !RESULTS.includes(body.simulateResult))
    throw new AppError(400, "simulateResult không hợp lệ.");
  return { orderId: body.orderId, bankCode: body.bankCode, simulateResult: body.simulateResult };
}

export const paymentRouter = Router();

// Cấu hình hiển thị cho frontend (không cần đăng nhập)
paymentRouter.get("/config", (_req, res) => {
  res.json(payments.getConfig());
});

// Tạo giao dịch cho một đơn của chính khách đang đăng nhập
paymentRouter.post("/", authenticateToken, asyncHandler(async (req, res) => {
  const result = await payments.createPayment(req.authUser!.id, parseCreateBody(req.body), req.ip ?? "127.0.0.1");
  res.json(result);
}));

// VNPay gọi server-to-server: KHÔNG gắn authenticateToken. Phải là URL public (VD ngrok).
paymentRouter.get("/vnpay/ipn", asyncHandler(async (req, res) => {
  res.json(await payments.ipn(req.query as Record<string, unknown>));
}));

// Trình duyệt khách được VNPay chuyển về: chỉ kiểm tra chữ ký rồi redirect, KHÔNG ghi DB.
paymentRouter.get("/vnpay/return", (req, res) => {
  const target = new URL("/payment/result", process.env.FRONTEND_URL ?? "http://localhost:3000");
  try {
    const params = extractParams(req.query as Record<string, unknown>);
    if (params && verify(params)) target.searchParams.set("reference", params.vnp_TxnRef ?? "");
    else target.searchParams.set("error", "signature");
  } catch {
    target.searchParams.set("error", "configuration");
  }
  res.redirect(303, target.toString());
});

paymentRouter.get("/reference/:ref", authenticateToken, asyncHandler(async (req, res) => {
  res.json(await payments.byReference(req.authUser!.id, String(req.params.ref)));
}));

paymentRouter.post("/:id/reconcile", authenticateToken, asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  if (!UUID_RE.test(id)) throw new AppError(400, "id không hợp lệ.");
  res.json(await payments.reconcile(req.authUser!.id, id));
}));
