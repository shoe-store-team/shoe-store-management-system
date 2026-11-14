import { Router } from "express";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { authenticateToken } from "../../middlewares/auth.middleware";
import { PaymentError } from "./payment.errors";
import * as payments from "./payment.service";
import { extractParams, verify } from "./vnpay";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const METHODS = ["COD", "VNPAY"];
const BANKS = ["VNPAYQR", "VNBANK", "INTCARD"];
const RESULTS = ["SUCCESS", "FAILED"];

const wrap =
  (fn: (req: Request, res: Response) => unknown): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res)).catch(next);
  };

// function parseCreateBody(body: any): payments.CreatePaymentInput {
//   if (typeof body?.orderId !== "string" || !UUID_RE.test(body.orderId))
//     throw new PaymentError(400, "orderId không hợp lệ.");
//   if (!METHODS.includes(body.method))
//     throw new PaymentError(
//       400,
//       "Phương thức thanh toán không hợp lệ (COD | VNPAY).",
//     );
//   if (body.bankCode !== undefined && !BANKS.includes(body.bankCode))
//     throw new PaymentError(400, "bankCode không hợp lệ.");
//   if (
//     body.simulateResult !== undefined &&
//     !RESULTS.includes(body.simulateResult)
//   )
//     throw new PaymentError(400, "simulateResult không hợp lệ.");
//   return {
//     orderId: body.orderId,
//     method: body.method,
//     bankCode: body.bankCode,
//     simulateResult: body.simulateResult,
//   };
// }
function parseCreateBody(body: unknown): payments.CreatePaymentInput {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new PaymentError(400, "Dữ liệu thanh toán không hợp lệ.");
  }

  const input = body as Record<string, unknown>;

  if (typeof input.orderId !== "string" || !UUID_RE.test(input.orderId))
    throw new PaymentError(400, "orderId không hợp lệ.");

  if (
    typeof input.method !== "string" ||
    !METHODS.includes(input.method)
  )
    throw new PaymentError(
      400,
      "Phương thức thanh toán không hợp lệ (COD | VNPAY).",
    );

  if (
    input.bankCode !== undefined &&
    (typeof input.bankCode !== "string" || !BANKS.includes(input.bankCode))
  )
    throw new PaymentError(400, "bankCode không hợp lệ.");

  if (
    input.simulateResult !== undefined &&
    (typeof input.simulateResult !== "string" ||
      !RESULTS.includes(input.simulateResult))
  )
    throw new PaymentError(400, "simulateResult không hợp lệ.");

  return {
    orderId: input.orderId,
    method: input.method as payments.CreatePaymentInput["method"],
    bankCode: input.bankCode as payments.CreatePaymentInput["bankCode"],
    simulateResult:
      input.simulateResult as payments.CreatePaymentInput["simulateResult"],
  };
}

export const paymentRouter = Router();

// Cấu hình hiển thị cho frontend (không cần đăng nhập)
paymentRouter.get(
  "/config",
  wrap((_req, res) => res.json(payments.getConfig())),
);

// Chọn phương thức thanh toán cho một đơn của chính khách đang đăng nhập (đơn do module orders tạo)
paymentRouter.post(
  "/",
  authenticateToken,
  wrap(async (req, res) => {
    res.json(
      await payments.createPayment(
        req.authUser!.id,
        parseCreateBody(req.body),
        req.ip ?? "127.0.0.1",
      ),
    );
  }),
);

// VNPay gọi server-to-server: KHÔNG gắn authenticateToken. Phải là URL public (VD ngrok).
paymentRouter.get(
  "/vnpay/ipn",
  wrap(async (req, res) => {
    res.json(await payments.ipn(req.query as Record<string, unknown>));
  }),
);

// Trình duyệt khách được VNPay chuyển về: chỉ kiểm tra chữ ký rồi redirect, KHÔNG ghi DB.
paymentRouter.get("/vnpay/return", (req, res) => {
  const target = new URL(
    "/payment/result",
    process.env.FRONTEND_URL ?? "http://localhost:5173",
  );
  try {
    const params = extractParams(req.query as Record<string, unknown>);
    if (params && verify(params))
      target.searchParams.set("reference", params.vnp_TxnRef ?? "");
    else target.searchParams.set("error", "signature");
  } catch {
    target.searchParams.set("error", "configuration");
  }
  res.redirect(303, target.toString());
});

paymentRouter.get(
  "/reference/:ref",
  authenticateToken,
  wrap(async (req, res) => {
    res.json(
      await payments.byReference(req.authUser!.id, String(req.params.ref)),
    );
  }),
);

paymentRouter.post(
  "/:id/reconcile",
  authenticateToken,
  wrap(async (req, res) => {
    const id = String(req.params.id);
    if (!UUID_RE.test(id)) throw new PaymentError(400, "id không hợp lệ.");
    res.json(await payments.reconcile(req.authUser!.id, id));
  }),
);

// Bắt lỗi ngay trong module: chỉ cần app.use("/api/payments", paymentRouter), không cần sửa error middleware chung.
// paymentRouter.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
//   if (err instanceof PaymentError) {
//     res.status(err.status).json({ message: err.message });
//     return;
//   }
//   console.error("[payments]", err);
//   res.status(500).json({ message: "Lỗi hệ thống thanh toán." });
// });
paymentRouter.use(
  (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    void _next;

    if (err instanceof PaymentError) {
      res.status(err.status).json({ message: err.message });
      return;
    }
    console.error("[payments]", err);
    res.status(500).json({ message: "Lỗi hệ thống thanh toán." });
  },
);
export default paymentRouter;
