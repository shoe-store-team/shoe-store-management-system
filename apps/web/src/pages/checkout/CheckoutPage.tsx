
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { cartService } from '../../services/cartService';
import { orderService } from '../../services/orderService';
import { paymentService } from '../../services/paymentService';

import { dinhDangTien } from '../../services/request';

import type { Order } from '../../types/order';
import type {
  PaymentMethod,
  PaymentResult,
} from '../../types/payment';

import { VnpayQrPayment } from './VnpayQrPayment';

type GioHangData = Awaited<
  ReturnType<typeof cartService.layGioHang>
>;

export function CheckoutPage() {
  const navigate = useNavigate();

  // Dữ liệu giỏ hàng
  const [gioHang, setGioHang] = useState<GioHangData | null>(null);

  // Thông tin người nhận
  const [recipientName, setRecipientName] = useState('');
  const [phone, setPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [note, setNote] = useState('');

  // Phương thức thanh toán
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>('COD');

  // Kết quả tạo đơn hàng
  const [createdOrder, setCreatedOrder] =
    useState<Order | null>(null);

  // Kết quả thanh toán
  const [paymentResult, setPaymentResult] =
    useState<PaymentResult | null>(null);

  // Dữ liệu để hiển thị màn hình QR
  const [qrPayment, setQrPayment] =
    useState<PaymentResult | null>(null);

  // Trạng thái giao diện
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // =========================================
  // 1. TẢI GIỎ HÀNG
  // =========================================

  useEffect(() => {
    let mounted = true;

    const loadCart = async () => {
      try {
        setLoading(true);
        setError('');

        const data = await cartService.layGioHang();

        if (mounted) {
          setGioHang(data);
        }
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : 'Không thể tải giỏ hàng.',
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

  // =========================================
  // 2. TẠO GIAO DỊCH THANH TOÁN
  // =========================================

  const createPayment = async (
    order: Order,
    method: PaymentMethod,
  ) => {
    setError('');
    setSuccessMessage('');
    setPaymentResult(null);
    setQrPayment(null);

    try {
      const result = await paymentService.taoThanhToan({
        orderId: order.id,
        method,
      });

      setPaymentResult(result);

      // Thanh toán VNPay
      if (method === 'VNPAY') {
        if (result.status === 'PAID') {
          setSuccessMessage(
            'Thanh toán đã được xác nhận thành công.',
          );
          return;
        }

        // Có link thanh toán thì hiển thị QR
        if (result.paymentUrl) {
          setQrPayment(result);
          return;
        }

        setSuccessMessage(
          'Đơn hàng đã được tạo. Giao dịch thanh toán đang được xử lý.',
        );
        return;
      }

      // Thanh toán COD
      setSuccessMessage(
        'Đặt hàng thành công! Bạn sẽ thanh toán khi nhận hàng.',
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể tạo giao dịch thanh toán.',
      );
    }
  };

  // =========================================
  // 3. XỬ LÝ ĐẶT HÀNG
  // =========================================

  const handleCheckout = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (submitting) return;

    setError('');
    setSuccessMessage('');

    // Kiểm tra họ tên
    if (!recipientName.trim()) {
      setError('Vui lòng nhập họ tên người nhận.');
      return;
    }

    // Kiểm tra số điện thoại
    const normalizedPhone = phone.replace(/\s/g, '');

    if (!/^(0|\+84)[0-9]{9,10}$/.test(normalizedPhone)) {
      setError('Số điện thoại không hợp lệ.');
      return;
    }

    // Kiểm tra địa chỉ
    if (!shippingAddress.trim()) {
      setError('Vui lòng nhập địa chỉ giao hàng.');
      return;
    }

    // Kiểm tra giỏ hàng
    if (!gioHang || gioHang.items.length === 0) {
      setError('Giỏ hàng đang trống.');
      return;
    }

    setSubmitting(true);

    try {
      // Tạo đơn hàng trước
      const order = await orderService.taoDonHang({
        recipientName: recipientName.trim(),
        phone: normalizedPhone,
        shippingAddress: shippingAddress.trim(),
        note: note.trim(),
        paymentMethod,
      });

      setCreatedOrder(order);

      // Sau khi tạo đơn hàng, tạo giao dịch thanh toán
      await createPayment(order, paymentMethod);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể tạo đơn hàng.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  // =========================================
  // 4. THỬ LẠI THANH TOÁN
  // =========================================

  const handleRetryPayment = async () => {
    if (!createdOrder || submitting) return;

    setSubmitting(true);

    try {
      await createPayment(createdOrder, paymentMethod);
    } finally {
      setSubmitting(false);
    }
  };

  // =========================================
  // 5. ĐANG TẢI GIỎ HÀNG
  // =========================================

  if (loading) {
    return (
      <div className="co-page">
        <p className="muted">Đang tải giỏ hàng...</p>
      </div>
    );
  }

  // =========================================
  // 6. HIỂN THỊ MÀN HÌNH VNPay QR
  // =========================================

  if (qrPayment) {
    return (
      <div className="co-page">
        <VnpayQrPayment
          payment={qrPayment}
          onFinished={(result) => {
            setPaymentResult(result);
          }}
        />
      </div>
    );
  }

  // =========================================
  // 7. HIỂN THỊ KẾT QUẢ ĐƠN HÀNG
  // =========================================

  if (createdOrder) {
    const isPaid =
      paymentResult?.status === 'PAID' ||
      paymentResult?.orderPaymentStatus === 'PAID';

    const isCOD = paymentMethod === 'COD';

    return (
      <div className="co-page">
        <div className="co-result">
          <i className={`co-result-icon ${isPaid || isCOD ? 'ok' : 'wait'}`}>
            {isPaid || isCOD ? '✓' : '…'}
          </i>

          <h1>
            {isPaid
              ? 'Thanh toán thành công!'
              : isCOD
                ? 'Đặt hàng thành công!'
                : 'Đơn hàng đã được tạo!'}
          </h1>

          {successMessage && <p>{successMessage}</p>}

          {error && (
            <div className="voucher-error">
              {error}
            </div>
          )}

          <div className="co-facts">
            <div>
              <span>Mã đơn hàng</span>
              <strong>{createdOrder.id}</strong>
            </div>

            <div>
              <span>Người nhận</span>
              <strong>{createdOrder.recipientName}</strong>
            </div>

            <div>
              <span>Số điện thoại</span>
              <strong>{createdOrder.phone}</strong>
            </div>

            <div>
              <span>Địa chỉ</span>
              <strong>{createdOrder.shippingAddress}</strong>
            </div>

            <div>
              <span>Tổng tiền</span>
              <strong>
                {dinhDangTien(Number(createdOrder.totalAmount))}
              </strong>
            </div>

            <div>
              <span>Trạng thái đơn hàng</span>
              <strong>
                {paymentResult?.orderStatus ?? createdOrder.status}
              </strong>
            </div>

            <div>
              <span>Trạng thái thanh toán</span>
              <strong>
                {paymentResult?.orderPaymentStatus ??
                  createdOrder.paymentStatus}
              </strong>
            </div>

            <div>
              <span>Phương thức thanh toán</span>
              <strong>
                {isCOD
                  ? 'Thanh toán khi nhận hàng'
                  : 'VNPay'}
              </strong>
            </div>
          </div>

          {error && paymentMethod === 'VNPAY' && (
            <button
              type="button"
              className="co-btn primary"
              onClick={handleRetryPayment}
              disabled={submitting}
            >
              {submitting
                ? 'Đang xử lý...'
                : 'Thử lại thanh toán'}
            </button>
          )}

          <div className="co-actions">
            <button
              type="button"
              className="co-btn primary"
              onClick={() => navigate('/orders')}
            >
              Xem đơn hàng
            </button>

            <button
              type="button"
              className="co-btn"
              onClick={() => navigate('/')}
            >
              Tiếp tục mua sắm
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================
  // 8. GIỎ HÀNG TRỐNG
  // =========================================

  if (!gioHang || gioHang.items.length === 0) {
    return (
      <div className="co-page">
        <div className="checkout-head">
          <p className="section-kicker">YOUR ORDER</p>
          <h1>Thanh toán</h1>
        </div>

        <p>Giỏ hàng của bạn đang trống.</p>

        <button
          type="button"
          className="checkout-button"
          onClick={() => navigate('/')}
        >
          Tiếp tục mua sắm
        </button>
      </div>
    );
  }

  // =========================================
  // 9. GIAO DIỆN CHECKOUT
  // =========================================

  return (
    <div className="co-page">
      <div className="checkout-head">
        <p className="section-kicker">YOUR ORDER</p>
        <h1>Thanh toán đơn hàng</h1>
      </div>

      {error && (
        <div className="voucher-error">
          {error}
        </div>
      )}

      <div className="checkout-grid">
        {/* Cột trái: thông tin nhận hàng và thanh toán */}
        <form
          className="form-panel"
          onSubmit={handleCheckout}
        >
          <section>
            <h2>Thông tin người nhận</h2>

            <div className="form-grid">
              <label className="full">
                Họ và tên người nhận
                <input
                  type="text"
                  value={recipientName}
                  onChange={(event) =>
                    setRecipientName(event.target.value)
                  }
                  placeholder="Nhập họ và tên"
                  autoComplete="name"
                  required
                />
              </label>

              <label className="full">
                Số điện thoại
                <input
                  type="tel"
                  value={phone}
                  onChange={(event) =>
                    setPhone(event.target.value)
                  }
                  placeholder="Nhập số điện thoại"
                  autoComplete="tel"
                  required
                />
              </label>

              <label className="full">
                Địa chỉ giao hàng
                <textarea
                  value={shippingAddress}
                  onChange={(event) =>
                    setShippingAddress(event.target.value)
                  }
                  placeholder="Nhập địa chỉ nhận hàng"
                  autoComplete="street-address"
                  rows={3}
                  required
                />
              </label>

              <label className="full">
                Ghi chú
                <textarea
                  value={note}
                  onChange={(event) =>
                    setNote(event.target.value)
                  }
                  placeholder="Ghi chú cho người bán (không bắt buộc)"
                  rows={3}
                />
              </label>
            </div>
          </section>

          <section>
            <h2>Phương thức thanh toán</h2>

            <label className="payment-choice">
              <input
                type="radio"
                name="paymentMethod"
                value="COD"
                checked={paymentMethod === 'COD'}
                onChange={() => setPaymentMethod('COD')}
              />

              <span>
                <strong>Thanh toán khi nhận hàng (COD)</strong>
                <small>
                  Thanh toán trực tiếp khi nhận được sản phẩm.
                </small>
              </span>
            </label>

            <label className="payment-choice">
              <input
                type="radio"
                name="paymentMethod"
                value="VNPAY"
                checked={paymentMethod === 'VNPAY'}
                onChange={() => setPaymentMethod('VNPAY')}
              />

              <span>
                <strong>Thanh toán trực tuyến qua VNPay</strong>
                <small>
                  Quét mã QR để thanh toán qua VNPay.
                </small>
              </span>
            </label>
          </section>

          <button
            type="submit"
            className="checkout-button"
            disabled={submitting}
          >
            {submitting ? 'Đang xử lý...' : 'ĐẶT HÀNG'}
          </button>
        </form>

        {/* Cột phải: thông tin đơn hàng */}
        <aside className="summary">
          <h2>Đơn hàng của bạn</h2>

          {gioHang.items.map((item, index) => (
            <div
              className="summary-product"
              key={`${item.productName}-${item.size}-${item.color}-${index}`}
            >
              <div className="summary-product-image">
                <div className="summary-product-placeholder">
                  Sản phẩm
                </div>
              </div>

              <div className="summary-product-info">
                <strong>{item.productName}</strong>

                <small>
                  Size: {item.size} | Màu: {item.color}
                </small>

                <small>Số lượng: {item.quantity}</small>
              </div>

              <strong className="summary-product-price">
                {dinhDangTien(Number(item.lineTotal))}
              </strong>
            </div>
          ))}

          <div className="sum-row">
            <span>Tạm tính</span>
            <strong>
              {dinhDangTien(Number(gioHang.subtotal))}
            </strong>
          </div>

          <div className="sum-total">
            <span>Tổng thanh toán</span>
            <strong>
              {dinhDangTien(Number(gioHang.subtotal))}
            </strong>
          </div>

          <p className="muted">
            Vui lòng kiểm tra thông tin trước khi đặt hàng.
          </p>
        </aside>
      </div>
    </div>
  );
}
