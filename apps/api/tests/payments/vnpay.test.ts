import { test } from "node:test";
import assert from "node:assert/strict";
import * as vnpay from "../../src/modules/payments/vnpay";
import { SECRET, TMN, signed, useVnpayEnv } from "./helpers";

useVnpayEnv();

test("vnpDate luôn theo giờ GMT+7 và parsePayDate đọc ngược lại được", () => {
  const d = new Date("2026-11-14T17:30:05Z"); // 00:30:05 ngày 15/11 giờ VN
  assert.equal(vnpay.vnpDate(d), "20261115003005");
  assert.equal(vnpay.parsePayDate("20261115003005")?.toISOString(), d.toISOString());
  assert.equal(vnpay.parsePayDate("20261332000000"), null); // tháng 13
  assert.equal(vnpay.parsePayDate("abc"), null);
});

test("toTxnRef / fromTxnRef là hai chiều, từ chối mã lạ", () => {
  const id = "1a2b3c4d-1111-2222-3333-444455556666";
  assert.equal(vnpay.toTxnRef(id), "1a2b3c4d111122223333444455556666");
  assert.equal(vnpay.fromTxnRef(vnpay.toTxnRef(id)), id);
  assert.equal(vnpay.fromTxnRef("123"), null);
  assert.equal(vnpay.fromTxnRef("zz2b3c4d111122223333444455556666"), null);
});

test("createUrl ký đúng: verify() chấp nhận chính tham số của link", () => {
  const url = new URL(vnpay.createUrl({
    amount: 150000, txnRef: "abc123", orderInfo: "Thanh toan don hang DH-1",
    now: new Date(), expires: new Date(Date.now() + 15 * 60_000), ip: "::1",
  }));
  const params = Object.fromEntries(url.searchParams.entries());
  assert.equal(params.vnp_Amount, "15000000"); // x100
  assert.equal(params.vnp_IpAddr, "127.0.0.1"); // IPv6 được đổi
  assert.equal(params.vnp_TmnCode, TMN);
  assert.ok(vnpay.verify(params));
  assert.ok(!url.toString().includes(SECRET), "link không được chứa khoá bí mật");
});

test("verify() từ chối khi sửa 1 tham số, sai TmnCode hoặc hash sai dạng", () => {
  const p = signed({ vnp_TmnCode: TMN, vnp_Amount: "100", vnp_TxnRef: "x" });
  assert.ok(vnpay.verify(p));
  assert.ok(!vnpay.verify({ ...p, vnp_Amount: "200" }));
  assert.ok(!vnpay.verify({ ...signed({ vnp_TmnCode: "KHAC", vnp_Amount: "100" }) }));
  assert.ok(!vnpay.verify({ ...p, vnp_SecureHash: "123" }));
});

test("extractParams từ chối tham số lặp (mảng) để chống giả mạo", () => {
  assert.equal(vnpay.extractParams({ vnp_Amount: ["1", "2"] }), null);
  assert.deepEqual(vnpay.extractParams({ vnp_Amount: "1", other: "x" }), { vnp_Amount: "1" });
});

test("thiếu cấu hình thì báo lỗi 503, không ném lỗi lạ", () => {
  const saved = process.env.VNPAY_HASH_SECRET;
  delete process.env.VNPAY_HASH_SECRET;
  assert.equal(vnpay.isConfigured(), false);
  assert.throws(() => vnpay.config(), (e: any) => e.status === 503);
  process.env.VNPAY_HASH_SECRET = saved;
});
