import { Router } from "express";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { authenticateToken } from "../../middlewares/auth.middleware";
import { PaymentError } from "./payment.errors";
import * as payments from "./payment.service";
import { extractParams, verify } from "./vnpay";
import { renderMockGateway } from "./mock-gateway.html";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const METHODS: unknown[] = ["COD", "VNPAY"];
const BANKS: unknown[] = ["VNPAYQR", "VNBANK", "INTCARD"];
const RESULTS: unknown[] = ["SUCCESS", "FAILED"];

const wrap =
  (fn: (req: Request, res: Response) => unknown): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res)).catch(next);
  };

function parseCreateBody(raw: unknown): payments.CreatePaymentInput {
  const body = (raw ?? {}) as Record<string, unknown>;
  if (typeof body.orderId !== "string" || !UUID_RE.test(body.orderId)) throw new PaymentError(400, "orderId không hợp lệ.");
  if (!METHODS.includes(body.method)) throw new PaymentError(400, "Phương thức thanh toán không hợp lệ (COD | VNPAY).");
  if (body.bankCode !== undefined && !BANKS.includes(body.bankCode)) throw new PaymentError(400, "bankCode không hợp lệ.");
  if (body.simulateResult !== undefined && !RESULTS.includes(body.simulateResult))
    throw new PaymentError(400, "simulateResult không hợp lệ.");
  return {
    orderId: body.orderId,
    method: body.method as payments.CreatePaymentInput["method"],
    bankCode: body.bankCode as payments.CreatePaymentInput["bankCode"],
    simulateResult: body.simulateResult as payments.CreatePaymentInput["simulateResult"],
  };
}

export const paymentRouter = Router();

// Cấu hình hiển thị cho frontend (không cần đăng nhập)
paymentRouter.get("/config", wrap((_req, res) => res.json(payments.getConfig())));

// Chọn phương thức thanh toán cho một đơn của chính khách đang đăng nhập (đơn do module orders tạo)
paymentRouter.post("/", authenticateToken, wrap(async (req, res) => {
  res.json(await payments.createPayment(req.authUser!.id, parseCreateBody(req.body), req.ip ?? "127.0.0.1"));
}));

// VNPay gọi server-to-server: KHÔNG gắn authenticateToken. Phải là URL public (VD ngrok).
paymentRouter.get("/vnpay/ipn", wrap(async (req, res) => {
  res.json(await payments.ipn(req.query as Record<string, unknown>));
}));

// Trình duyệt khách được VNPay chuyển về: chỉ kiểm tra chữ ký rồi redirect, KHÔNG ghi DB.
paymentRouter.get("/vnpay/return", (req, res) => {
  const target = new URL("/payment/result", process.env.FRONTEND_URL ?? "http://localhost:5173");
  try {
    const params = extractParams(req.query as Record<string, unknown>);
    if (params && verify(params)) target.searchParams.set("reference", params.vnp_TxnRef ?? "");
    else target.searchParams.set("error", "signature");
  } catch {
    target.searchParams.set("error", "configuration");
  }
  res.redirect(303, target.toString());
});

// Cổng thanh toán giả lập (chỉ bật khi PAYMENT_PROVIDER=mock và PAYMENT_MOCK_QR=true). Không gắn auth:
// điện thoại quét mã QR không có token, giống như cổng VNPay thật.
paymentRouter.get("/mock/:ref", wrap(async (req, res) => {
  const p = await payments.getMockPayment(String(req.params.ref));
  res.type("html").send(renderMockGateway(p));
}));

paymentRouter.post("/mock/:ref/complete", wrap(async (req, res) => {
  const result = (req.body as Record<string, unknown> | undefined)?.result;
  if (result !== "SUCCESS" && result !== "FAILED") throw new PaymentError(400, "result phải là SUCCESS hoặc FAILED.");
  res.json(await payments.completeMockPayment(String(req.params.ref), result));
}));

paymentRouter.get("/reference/:ref", authenticateToken, wrap(async (req, res) => {
  res.json(await payments.byReference(req.authUser!.id, String(req.params.ref)));
}));

paymentRouter.post("/:id/reconcile", authenticateToken, wrap(async (req, res) => {
  const id = String(req.params.id);
  if (!UUID_RE.test(id)) throw new PaymentError(400, "id không hợp lệ.");
  res.json(await payments.reconcile(req.authUser!.id, id));
}));

// Bắt lỗi ngay trong module: chỉ cần app.use("/api/payments", paymentRouter), không cần sửa error middleware chung.
// Express nhận diện error handler nhờ đủ 4 tham số, nên phải giữ `next`
paymentRouter.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    next(err);
    return;
  }
  if (err instanceof PaymentError) {
    res.status(err.status).json({ message: err.message });
    return;
  }
  console.error("[payments]", err);
  res.status(500).json({ message: "Lỗi hệ thống thanh toán." });
});

export default paymentRouter;
