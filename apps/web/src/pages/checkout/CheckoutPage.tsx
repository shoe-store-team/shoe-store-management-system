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

export function CheckoutPage() {
  const navigate = useNavigate();

  const [gioHang, setGioHang] = useState<
    Awaited<ReturnType<typeof cartService.layGioHang>> | null
  >(null);

  const [recipientName, setRecipientName] = useState('');
  const [phone, setPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [note, setNote] = useState('');

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>('COD');

  const [createdOrder, setCreatedOrder] =
    useState<Order | null>(null);

  const [paymentResult, setPaymentResult] =
    useState<PaymentResult | null>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

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

  const createPayment = async (
    order: Order,
    method: PaymentMethod,
  ) => {
    setSubmitting(true);
    setError('');

    try {
      const result = await paymentService.taoThanhToan({
        orderId: order.id,
        method,
      });

      setPaymentResult(result);

      if (method === 'VNPAY') {
        if (result.status === 'PAID') {
          setSuccessMessage('Thanh toán đã được xác nhận thành công.');
          return;
        }

        if (result.paymentUrl) {
          window.location.assign(result.paymentUrl);
          return;
        }

        setSuccessMessage(
          'Đơn hàng đã được tạo. Giao dịch thanh toán đang được xử lý.',
        );
        return;
      }

      setSuccessMessage(
        'Đặt hàng thành công! Bạn sẽ thanh toán khi nhận hàng.',
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể tạo giao dịch thanh toán.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckout = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (submitting) return;

    setError('');
    setSuccessMessage('');

    if (!recipientName.trim()) {
      setError('Vui lòng nhập họ tên người nhận.');
      return;
    }

    if (!/^(0|\+84)[0-9]{9,10}$/.test(phone.replace(/\s/g, ''))) {
      setError('Số điện thoại không hợp lệ.');
      return;
    }

    if (!shippingAddress.trim()) {
      setError('Vui lòng nhập địa chỉ giao hàng.');
      return;
    }

    if (!gioHang || gioHang.items.length === 0) {
      setError('Giỏ hàng đang trống.');
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
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể tạo đơn hàng.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetryPayment = async () => {
    if (!createdOrder || submitting) return;

    await createPayment(createdOrder, paymentMethod);
  };

  if (loading) {
    return (
      <div className="checkout-page">
        <p>Đang tải giỏ hàng...</p>
      </div>
    );
  }

  if (createdOrder) {
    const isPaid =
      paymentResult?.status === 'PAID' ||
      paymentResult?.orderPaymentStatus === 'PAID';

    const isCOD = paymentMethod === 'COD';

    return (
      <div className="checkout-page">
        <div className="checkout-result">
          <h2>
            {isPaid
              ? 'Thanh toán thành công!'
              : isCOD
                ? 'Đặt hàng thành công!'
                : 'Đơn hàng đã được tạo!'}
          </h2>

          {successMessage && <p>{successMessage}</p>}

          {error && (
            <div className="checkout-error">
              {error}
            </div>
          )}

          <div className="checkout-order-info">
            <p>
              <strong>Mã đơn hàng:</strong> {createdOrder.id}
            </p>

            <p>
              <strong>Người nhận:</strong> {createdOrder.recipientName}
            </p>

            <p>
              <strong>Số điện thoại:</strong> {createdOrder.phone}
            </p>

            <p>
              <strong>Địa chỉ:</strong> {createdOrder.shippingAddress}
            </p>

            <p>
              <strong>Tổng tiền:</strong>{' '}
              {dinhDangTien(Number(createdOrder.totalAmount))}
            </p>

            <p>
              <strong>Trạng thái đơn hàng:</strong>{' '}
              {paymentResult?.orderStatus ?? createdOrder.status}
            </p>

            <p>
              <strong>Trạng thái thanh toán:</strong>{' '}
              {paymentResult?.orderPaymentStatus ??
                createdOrder.paymentStatus}
            </p>

            <p>
              <strong>Phương thức thanh toán:</strong>{' '}
              {isCOD ? 'Thanh toán khi nhận hàng' : 'VNPay'}
            </p>
          </div>

          {!paymentResult && (
            <div>
              <p>
                Đơn hàng đã được tạo nhưng chưa tạo được giao dịch
                thanh toán. Bạn có thể thử lại.
              </p>

              <button
                type="button"
                onClick={handleRetryPayment}
                disabled={submitting}
              >
                {submitting ? 'Đang xử lý...' : 'Thử lại thanh toán'}
              </button>
            </div>
          )}

          <div className="checkout-actions">
            <button
              type="button"
              onClick={() => navigate('/orders')}
            >
              Xem đơn hàng
            </button>

            <button
              type="button"
              onClick={() => navigate('/')}
            >
              Tiếp tục mua sắm
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <h1>Thanh toán đơn hàng</h1>

      {error && (
        <div className="checkout-error">
          {error}
        </div>
      )}

      {!gioHang || gioHang.items.length === 0 ? (
        <div>
          <p>Giỏ hàng của bạn đang trống.</p>

          <button
            type="button"
            onClick={() => navigate('/')}
          >
            Tiếp tục mua sắm
          </button>
        </div>
      ) : (
        <div className="checkout-container">
          <form onSubmit={handleCheckout}>
            <section className="checkout-section">
              <h2>Thông tin người nhận</h2>

              <div>
                <label htmlFor="recipientName">
                  Họ và tên người nhận
                </label>

                <input
                  id="recipientName"
                  type="text"
                  value={recipientName}
                  onChange={(event) =>
                    setRecipientName(event.target.value)
                  }
                  placeholder="Nhập họ và tên"
                  required
                />
              </div>

              <div>
                <label htmlFor="phone">Số điện thoại</label>

                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(event) =>
                    setPhone(event.target.value)
                  }
                  placeholder="Nhập số điện thoại"
                  required
                />
              </div>

              <div>
                <label htmlFor="shippingAddress">
                  Địa chỉ giao hàng
                </label>

                <textarea
                  id="shippingAddress"
                  value={shippingAddress}
                  onChange={(event) =>
                    setShippingAddress(event.target.value)
                  }
                  placeholder="Nhập địa chỉ nhận hàng"
                  required
                />
              </div>

              <div>
                <label htmlFor="note">Ghi chú</label>

                <textarea
                  id="note"
                  value={note}
                  onChange={(event) =>
                    setNote(event.target.value)
                  }
                  placeholder="Ghi chú cho người bán (không bắt buộc)"
                />
              </div>
            </section>

            <section className="checkout-section">
              <h2>Phương thức thanh toán</h2>

              <label>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="COD"
                  checked={paymentMethod === 'COD'}
                  onChange={() => setPaymentMethod('COD')}
                />
                Thanh toán khi nhận hàng (COD)
              </label>

              <label>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="VNPAY"
                  checked={paymentMethod === 'VNPAY'}
                  onChange={() => setPaymentMethod('VNPAY')}
                />
                Thanh toán trực tuyến qua VNPay
              </label>
            </section>

            <section className="checkout-section">
              <h2>Đơn hàng của bạn</h2>

              {gioHang.items.map((item, index) => (
                <div className="checkout-item" key={index}>
                  <div>
                    <strong>{item.productName}</strong>

                    <p>
                      Size: {item.size} | Màu: {item.color}
                    </p>

                    <p>Số lượng: {item.quantity}</p>
                  </div>

                  <div>
                    {dinhDangTien(Number(item.lineTotal))}
                  </div>
                </div>
              ))}

              <div className="checkout-total">
                <strong>Tổng tiền:</strong>

                <strong>
                  {dinhDangTien(Number(gioHang.subtotal))}
                </strong>
              </div>
            </section>

            <button type="submit" disabled={submitting}>
              {submitting ? 'Đang xử lý...' : 'Đặt hàng'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}