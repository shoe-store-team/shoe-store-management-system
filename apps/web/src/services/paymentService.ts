import { request } from './request';
import type { CreatePaymentBody, PaymentConfig, PaymentResult } from '../types/payment';

/**
 * request<T>(đườngDẫn, init) của request.ts: tự gắn token, trả JSON, ném Error(message) khi lỗi.
 */
const goi = <T>(method: 'GET' | 'POST', duongDan: string, body?: unknown) =>
  request<T>(duongDan, { method, body: body === undefined ? undefined : JSON.stringify(body) });

export const paymentService = {
  layCauHinh: () => goi<PaymentConfig>('GET', '/payments/config'),
  taoThanhToan: (body: CreatePaymentBody) => goi<PaymentResult>('POST', '/payments', body),
  layTheoMaThamChieu: (reference: string) =>
    goi<PaymentResult>('GET', `/payments/reference/${encodeURIComponent(reference)}`),
  doiSoat: (paymentId: string) => goi<PaymentResult>('POST', `/payments/${paymentId}/reconcile`),
};
