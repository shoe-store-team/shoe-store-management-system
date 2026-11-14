import { randomUUID } from "node:crypto";
import * as vnpay from "../../src/modules/payments/vnpay";
import { Decimal } from "./fake-prisma";

export const TMN = "TESTTMN1";
export const SECRET = "TEST_SECRET_KHONG_DUOC_LO_RA_LOG_1234567890";

export function useVnpayEnv() {
  process.env.PAYMENT_PROVIDER = "vnpay";
  process.env.VNPAY_TMN_CODE = TMN;
  process.env.VNPAY_HASH_SECRET = SECRET;
  process.env.VNPAY_RETURN_URL = "http://localhost:3000/api/payments/vnpay/return";
  process.env.ORDER_HOLD_MINUTES = "30";
  delete process.env.PAYMENT_MOCK_ALLOW_OVERRIDE;
}
export function useMockEnv() {
  useVnpayEnv();
  process.env.PAYMENT_PROVIDER = "mock";
  process.env.PAYMENT_MOCK_ALLOW_OVERRIDE = "true";
}

export function makeOrder(over: Record<string, unknown> = {}) {
  return {
    id: randomUUID(),
    userId: "user-1",
    status: "PENDING",
    paymentStatus: "UNPAID",
    totalAmount: new Decimal(500000),
    createdAt: new Date(),
    ...over,
  };
}

export function signed(params: Record<string, string>) {
  return { ...params, vnp_SecureHash: vnpay.hmac(vnpay.canonical(params), SECRET) };
}

/** Tạo query IPN hợp lệ (đã ký) cho một payment, có thể ghi đè từng trường. */
export function ipnQuery(payment: { id: string; amount: number }, over: Record<string, string> = {}) {
  return signed({
    vnp_TmnCode: TMN,
    vnp_Amount: String(payment.amount * 100),
    vnp_TxnRef: vnpay.toTxnRef(payment.id),
    vnp_ResponseCode: "00",
    vnp_TransactionStatus: "00",
    vnp_TransactionNo: "14000001",
    vnp_PayDate: vnpay.vnpDate(new Date()),
    vnp_BankCode: "NCB",
    vnp_OrderInfo: "Thanh toan don hang",
    ...over,
  });
}

/** Phản hồi QueryDR giả có chữ ký đúng (dùng cho đối soát). */
export function queryDrResponse(txnRef: string, amount: number, status = "00") {
  const data: Record<string, string> = {
    vnp_ResponseId: "r1", vnp_Command: "querydr", vnp_ResponseCode: "00", vnp_Message: "OK",
    vnp_TmnCode: TMN, vnp_TxnRef: txnRef, vnp_Amount: String(amount * 100), vnp_BankCode: "NCB",
    vnp_PayDate: vnpay.vnpDate(new Date()), vnp_TransactionNo: "14000099", vnp_TransactionType: "01",
    vnp_TransactionStatus: status, vnp_OrderInfo: "x", vnp_PromotionCode: "", vnp_PromotionAmount: "",
  };
  const fields = ["vnp_ResponseId","vnp_Command","vnp_ResponseCode","vnp_Message","vnp_TmnCode","vnp_TxnRef","vnp_Amount","vnp_BankCode","vnp_PayDate","vnp_TransactionNo","vnp_TransactionType","vnp_TransactionStatus","vnp_OrderInfo","vnp_PromotionCode","vnp_PromotionAmount"];
  return { ...data, vnp_SecureHash: vnpay.hmac(fields.map((k) => data[k]).join("|"), SECRET) };
}
