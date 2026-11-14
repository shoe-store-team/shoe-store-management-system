import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { cartService } from "../../services/cartService";
import { orderService } from "../../services/orderService";
import { paymentService } from "../../services/paymentService";

import { dinhDangTien } from "../../services/request";

import type { Order } from "../../types/order";
import type { PaymentMethod, PaymentResult } from "../../types/payment";
import { VnpayQrPayment } from "./VnpayQrPayment";
import "./checkout.css";

const PHUONG_THUC: { value: PaymentMethod; ten: string; moTa: string }[] = [
  { value: "COD", ten: "Thanh toán khi nhận hàng", moTa: "Trả tiền mặt cho đơn vị vận chuyển khi nhận hàng" },
  { value: "VNPAY", ten: "Thanh toán trực tuyến qua VNPay", moTa: "Thẻ ATM, thẻ quốc tế hoặc QR (môi trường Sandbox)" },
];

const TRANG_THAI_DON: Record<string, string> = {
  PENDING: "Chờ xử lý",
  CONFIRMED: "Đã xác nhận",
  PROCESSING: "Đang chuẩn bị",
  SHIPPED: "Đang giao",
  DELIVERED: "Đã giao",
  CANCELLED: "Đã huỷ",
};
const TRANG_THAI_TT: Record<string, string> = {
  UNPAID: "Chưa thanh toán",
  PENDING: "Đang chờ thanh toán",
  PAID: "Đã thanh toán",
  FAILED: "Thanh toán thất bại",
  REFUNDED: "Đã hoàn tiền",
};

export function CheckoutPage() {
  const navigate = useNavigate();

  const [gioHang, setGioHang] = useState<Awaited<
    ReturnType<typeof cartService.layGioHang>
  > | null>(null);

  const [recipientName, setRecipientName] = useState("");
  const [phone, setPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [note, setNote] = useState("");

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("COD");

  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(
    null,
  );
  // Giao dịch VNPay đang chờ quét mã QR
  const [qrPayment, setQrPayment] = useState<PaymentResult | null>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadCart = async () => {
      try {
        setLoading(true);
        const data = await cartService.layGioHang();

        if (mounted) {
          setGioHang(data);
        }
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error ? err.message : "Không thể tải giỏ hàng.",
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadCart();

    return () => {
      mounted = false;
    };
  }, []);

  const createPayment = async (order: Order, method: PaymentMethod) => {
    setSubmitting(true);
    setError("");

    try {
      const result = await paymentService.taoThanhToan({
        orderId: order.id,
        method,
      });

      setPaymentResult(result);

      if (method === "VNPAY") {
        if (result.status === "PAID") {
          setSuccessMessage("Thanh toán đã được xác nhận thành công.");
          return;
        }

        if (result.paymentUrl) {
          // Hiện mã QR ngay trên trang; khách quét bằng điện thoại, trang tự cập nhật khi thanh toán xong
          setQrPayment(result);
          return;
        }

        setSuccessMessage(
          "Đơn hàng đã được tạo. Giao dịch thanh toán đang được xử lý.",
        );
        return;
      }

      setSuccessMessage(
        "Cửa hàng sẽ sớm chuẩn bị đơn hàng. Bạn thanh toán tiền mặt khi nhận hàng.",
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể tạo giao dịch thanh toán.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckout = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (submitting) return;

    setError("");
    setSuccessMessage("");

    if (!recipientName.trim()) {
      setError("Vui lòng nhập họ tên người nhận.");
      return;
    }

    if (!/^(0|\+84)[0-9]{9,10}$/.test(phone.replace(/\s/g, ""))) {
      setError("Số điện thoại không hợp lệ.");
      return;
    }

    if (!shippingAddress.trim()) {
      setError("Vui lòng nhập địa chỉ giao hàng.");
      return;
    }

    if (!gioHang || gioHang.items.length === 0) {
      setError("Giỏ hàng đang trống.");
      return;
    }

    setSubmitting(true);

    try {
      const order = await orderService.taoDonHang({
        recipientName: recipientName.trim(),
        phone: phone.trim(),
        shippingAddress: shippingAddress.trim(),
        note: note.trim(),
        paymentMethod,
      });

      setCreatedOrder(order);

      await createPayment(order, paymentMethod);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tạo đơn hàng.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetryPayment = async () => {
    if (!createdOrder || submitting) return;

    await createPayment(createdOrder, paymentMethod);
  };

  /* ---------------------------------------------------------------- đang tải */
  if (loading) {
    return (
      <div className="checkout-page">
        <p className="checkout-muted">Đang tải giỏ hàng...</p>
      </div>
    );
  }

  /* ---------------------------------------------------------------- quét mã QR VNPay */
  if (qrPayment) {
    return (
      <div className="checkout-page">
        <VnpayQrPayment payment={qrPayment} onFinished={setPaymentResult} />
      </div>
    );
  }

  /* ---------------------------------------------------------------- đã tạo đơn */
  if (createdOrder) {
    const isPaid =
      paymentResult?.status === "PAID" ||
      paymentResult?.orderPaymentStatus === "PAID";

    const isCOD = paymentMethod === "COD";
    const ok = Boolean(paymentResult) && !error;
    const trangThaiDon = paymentResult?.orderStatus ?? createdOrder.status;
    const trangThaiTT = paymentResult?.orderPaymentStatus ?? createdOrder.paymentStatus;

    return (
      <div className="checkout-page">
        <div className="checkout-result">
          <i className={`checkout-result-icon ${ok ? "ok" : "wait"}`}>{ok ? "✓" : "!"}</i>
          <h2>
            {isPaid
              ? "Thanh toán thành công!"
              : isCOD && ok
                ? "Đặt hàng thành công!"
                : "Đơn hàng đã được tạo!"}
          </h2>

          {successMessage && <p className="checkout-muted">{successMessage}</p>}

          {error && <div className="checkout-error">{error}</div>}

          <div className="checkout-order-info">
            <div><span>Mã đơn hàng</span><strong>#{createdOrder.id.slice(0, 8).toUpperCase()}</strong></div>
            <div><span>Người nhận</span><strong>{createdOrder.recipientName}</strong></div>
            <div><span>Số điện thoại</span><strong>{createdOrder.phone}</strong></div>
            <div><span>Địa chỉ</span><strong>{createdOrder.shippingAddress}</strong></div>
            <div><span>Tổng tiền</span><strong>{dinhDangTien(Number(createdOrder.totalAmount))}</strong></div>
            <div><span>Trạng thái đơn</span><strong>{TRANG_THAI_DON[trangThaiDon] ?? trangThaiDon}</strong></div>
            <div><span>Thanh toán</span><strong>{TRANG_THAI_TT[trangThaiTT] ?? trangThaiTT}</strong></div>
            <div><span>Phương thức</span><strong>{isCOD ? "Thanh toán khi nhận hàng" : "VNPay"}</strong></div>
          </div>

          {!paymentResult && (
            <div className="checkout-retry">
              <p className="checkout-muted">
                Đơn hàng đã được tạo nhưng chưa tạo được giao dịch thanh toán.
                Bạn có thể thử lại.
              </p>

              <button
                type="button"
                className="checkout-btn primary"
                onClick={handleRetryPayment}
                disabled={submitting}
              >
                {submitting ? "Đang xử lý..." : "Thử lại thanh toán"}
              </button>
            </div>
          )}

          <div className="checkout-actions">
            <button type="button" className="checkout-btn primary" onClick={() => navigate("/orders")}>
              Xem đơn hàng
            </button>

            <button type="button" className="checkout-btn" onClick={() => navigate("/")}>
              Tiếp tục mua sắm
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- form thanh toán */
  return (
    <div className="checkout-page">
      <button type="button" className="checkout-back" onClick={() => navigate("/cart")}>
        ← Quay lại giỏ hàng
      </button>

      <div className="checkout-head">
        <p className="checkout-kicker">BƯỚC CUỐI CÙNG</p>
        <h1>Thanh toán đơn hàng</h1>
      </div>

      {error && <div className="checkout-error">{error}</div>}

      {!gioHang || gioHang.items.length === 0 ? (
        <div className="checkout-empty">
          <p>Giỏ hàng của bạn đang trống.</p>

          <button type="button" className="checkout-btn primary" onClick={() => navigate("/")}>
            Tiếp tục mua sắm
          </button>
        </div>
      ) : (
        <form className="checkout-container" onSubmit={handleCheckout} noValidate>
          <div className="checkout-main">
            <section className="checkout-section">
              <h2>Thông tin người nhận</h2>

              <div className="checkout-fields">
                <div className="checkout-field">
                  <label htmlFor="recipientName">Họ và tên người nhận</label>
                  <input
                    id="recipientName"
                    type="text"
                    value={recipientName}
                    onChange={(event) => setRecipientName(event.target.value)}
                    placeholder="Nguyễn Văn An"
                    autoComplete="name"
                    required
                  />
                </div>

                <div className="checkout-field">
                  <label htmlFor="phone">Số điện thoại</label>
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="090 123 4567"
                    autoComplete="tel"
                    required
                  />
                </div>

                <div className="checkout-field full">
                  <label htmlFor="shippingAddress">Địa chỉ giao hàng</label>
                  <textarea
                    id="shippingAddress"
                    value={shippingAddress}
                    onChange={(event) => setShippingAddress(event.target.value)}
                    placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố"
                    autoComplete="street-address"
                    required
                  />
                </div>

                <div className="checkout-field full">
                  <label htmlFor="note">
                    Ghi chú <span>(không bắt buộc)</span>
                  </label>
                  <textarea
                    id="note"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Ví dụ: giao giờ hành chính"
                  />
                </div>
              </div>
            </section>

            <section className="checkout-section">
              <h2>Phương thức thanh toán</h2>

              {PHUONG_THUC.map((pt) => (
                <label
                  key={pt.value}
                  className={`checkout-choice ${paymentMethod === pt.value ? "chosen" : ""}`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={pt.value}
                    checked={paymentMethod === pt.value}
                    onChange={() => setPaymentMethod(pt.value)}
                  />
                  <span>
                    <strong>{pt.ten}</strong>
                    <small>{pt.moTa}</small>
                  </span>
                </label>
              ))}
            </section>
          </div>

          <aside className="checkout-summary">
            <h2>Đơn hàng của bạn</h2>

            {gioHang.items.map((item, index) => (
              <div className="checkout-item" key={index}>
                <div className="checkout-item-thumb" aria-hidden="true">
                  {String(item.productName ?? "?").charAt(0).toUpperCase()}
                </div>
                <div className="checkout-item-info">
                  <strong>{item.productName}</strong>
                  <small>
                    Size {item.size} · {item.color} · SL {item.quantity}
                  </small>
                </div>
                <div className="checkout-item-price">{dinhDangTien(Number(item.lineTotal))}</div>
              </div>
            ))}

            <div className="checkout-lines">
              <div className="checkout-line">
                <span>Tạm tính</span>
                <span>{dinhDangTien(Number(gioHang.subtotal))}</span>
              </div>
              <div className="checkout-line">
                <span>Phí vận chuyển</span>
                <span>Miễn phí</span>
              </div>
              <div className="checkout-total">
                <span>Tổng cộng</span>
                <strong>{dinhDangTien(Number(gioHang.subtotal))}</strong>
              </div>
            </div>

            <button type="submit" className="checkout-btn primary block" disabled={submitting}>
              {submitting
                ? "Đang xử lý..."
                : paymentMethod === "VNPAY"
                  ? "Đặt hàng và thanh toán →"
                  : "Đặt hàng"}
            </button>
            <p className="checkout-note">
              {paymentMethod === "VNPAY"
                ? "Sau khi đặt hàng, quét mã QR bằng điện thoại để thanh toán qua VNPay."
                : "Bạn thanh toán khi nhận hàng."}
            </p>
          </aside>
        </form>
      )}
    </div>
  );
}
