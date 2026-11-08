import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import { AppError } from "../../middlewares/error.middleware";

export type VnpParams = Record<string, string>;

const gatewayUrl = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
const queryUrl = "https://sandbox.vnpayment.vn/merchant_webapi/api/transaction";

export function isConfigured() {
  return Boolean(
    process.env.VNPAY_TMN_CODE?.trim() &&
      process.env.VNPAY_HASH_SECRET?.trim() &&
      process.env.VNPAY_RETURN_URL?.trim(),
  );
}

export function config() {
  const tmnCode = process.env.VNPAY_TMN_CODE?.trim();
  const secret = process.env.VNPAY_HASH_SECRET?.trim();
  const returnUrl = process.env.VNPAY_RETURN_URL?.trim();
  if (!tmnCode || !secret || !returnUrl)
    throw new AppError(503, "Chưa cấu hình VNPay Sandbox trên backend.");
  if (!/^https?:\/\//.test(returnUrl)) throw new AppError(503, "VNPAY_RETURN_URL không hợp lệ.");
  return { tmnCode, secret, returnUrl };
}

/** vnp_TxnRef = payment.id bỏ dấu gạch (VNPay không cho ký tự đặc biệt). Không cần cột riêng trong DB. */
export const toTxnRef = (paymentId: string) => paymentId.replaceAll("-", "");
export function fromTxnRef(ref: string) {
  if (!/^[0-9a-f]{32}$/i.test(ref)) return null;
  return `${ref.slice(0, 8)}-${ref.slice(8, 12)}-${ref.slice(12, 16)}-${ref.slice(16, 20)}-${ref.slice(20)}`.toLowerCase();
}

/** VNPay dùng giờ GMT+7 bất kể múi giờ của server. */
export function vnpDate(date: Date) {
  return new Date(date.getTime() + 7 * 3600000).toISOString().slice(0, 19).replace(/[-T:]/g, "");
}

export function parsePayDate(value?: string) {
  if (!value || !/^\d{14}$/.test(value)) return null;
  const date = new Date(
    `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(8, 10)}:${value.slice(10, 12)}:${value.slice(12, 14)}+07:00`,
  );
  return Number.isNaN(date.getTime()) || vnpDate(date) !== value ? null : date;
}

function encode(value: string) {
  return encodeURIComponent(value)
    .replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/%20/g, "+");
}

/** Sắp xếp key + URL-encode kiểu VNPay 2.1.0 để ký. */
export function canonical(params: VnpParams) {
  return Object.keys(params)
    .filter((k) => k.startsWith("vnp_") && !["vnp_SecureHash", "vnp_SecureHashType"].includes(k))
    .sort()
    .map((k) => `${encode(k)}=${encode(params[k])}`)
    .join("&");
}

export const hmac = (data: string, secret: string) =>
  createHmac("sha512", secret).update(data, "utf8").digest("hex");

export function validHash(actual: string | undefined, expected: string) {
  if (!actual || !/^[a-f0-9]{128}$/i.test(actual)) return false;
  return timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}

/** Từ req.query lấy các tham số vnp_*; trả null nếu có tham số lặp/lồng nhau (chống giả mạo). */
export function extractParams(query: Record<string, unknown>): VnpParams | null {
  const params: VnpParams = {};
  for (const [key, value] of Object.entries(query)) {
    if (!key.startsWith("vnp_")) continue;
    if (typeof value !== "string" || value.length > 2048) return null;
    params[key] = value;
  }
  return params;
}

export function verify(params: VnpParams) {
  const { tmnCode, secret } = config();
  return params.vnp_TmnCode === tmnCode && validHash(params.vnp_SecureHash, hmac(canonical(params), secret));
}

export function normalizeIp(ip: string) {
  const value = ip.replace(/^::ffff:/, "");
  // VNPay hay từ chối IPv6 (::1 khi chạy local) nên quy về 127.0.0.1.
  return isIP(value) === 4 ? value : "127.0.0.1";
}

export function createUrl(input: {
  amount: number; txnRef: string; orderInfo: string;
  now: Date; expires: Date; ip: string; bankCode?: string;
}) {
  const { tmnCode, secret, returnUrl } = config();
  const params: VnpParams = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: tmnCode,
    vnp_Amount: String(input.amount * 100),
    vnp_CurrCode: "VND",
    vnp_TxnRef: input.txnRef,
    vnp_OrderInfo: input.orderInfo,
    vnp_OrderType: "other",
    vnp_Locale: "vn",
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: normalizeIp(input.ip),
    vnp_CreateDate: vnpDate(input.now),
    vnp_ExpireDate: vnpDate(input.expires),
  };
  if (input.bankCode) params.vnp_BankCode = input.bankCode;
  const data = canonical(params);
  return `${gatewayUrl}?${data}&vnp_SecureHash=${hmac(data, secret)}`;
}

/** QueryDR: chủ động hỏi VNPay kết quả giao dịch (chữ ký nối bằng '|'). */
export async function queryTransaction(txnRef: string, createDate: string) {
  const { tmnCode, secret } = config();
  const request: VnpParams = {
    vnp_RequestId: randomBytes(16).toString("hex"),
    vnp_Version: "2.1.0",
    vnp_Command: "querydr",
    vnp_TmnCode: tmnCode,
    vnp_TxnRef: txnRef,
    vnp_TransactionDate: createDate,
    vnp_CreateDate: vnpDate(new Date()),
    vnp_IpAddr: normalizeIp(process.env.VNPAY_QUERY_IP ?? "127.0.0.1"),
    vnp_OrderInfo: `Query transaction ${txnRef}`,
  };
  const reqFields = ["vnp_RequestId","vnp_Version","vnp_Command","vnp_TmnCode","vnp_TxnRef","vnp_TransactionDate","vnp_CreateDate","vnp_IpAddr","vnp_OrderInfo"];
  request.vnp_SecureHash = hmac(reqFields.map((k) => request[k]).join("|"), secret);

  let response: Response;
  try {
    response = await fetch(queryUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(12000),
    });
  } catch {
    throw new AppError(503, "Chưa kết nối được máy chủ VNPay.");
  }
  if (!response.ok) throw new AppError(503, "VNPay chưa phản hồi truy vấn.");
  const raw: unknown = await response.json();
  if (!raw || typeof raw !== "object") throw new AppError(503, "Phản hồi VNPay không hợp lệ.");

  const data: VnpParams = {};
  for (const [k, v] of Object.entries(raw)) if (typeof v === "string" || typeof v === "number") data[k] = String(v);

  const resFields = ["vnp_ResponseId","vnp_Command","vnp_ResponseCode","vnp_Message","vnp_TmnCode","vnp_TxnRef","vnp_Amount","vnp_BankCode","vnp_PayDate","vnp_TransactionNo","vnp_TransactionType","vnp_TransactionStatus","vnp_OrderInfo","vnp_PromotionCode","vnp_PromotionAmount"];
  if (
    !validHash(data.vnp_SecureHash, hmac(resFields.map((k) => data[k] ?? "").join("|"), secret)) ||
    data.vnp_TmnCode !== tmnCode || data.vnp_TxnRef !== txnRef || data.vnp_Command !== "querydr"
  )
    throw new AppError(503, "Không xác thực được phản hồi truy vấn VNPay.");
  return data;
}
