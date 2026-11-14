
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { cartService } from '../../services/cartService';
import { orderService } from '../../services/orderService';
import { paymentService } from '../../services/paymentService';
import { customerService } from '../../services/customerService';
import { promotionService } from '../../services/promotionService';

import { dinhDangTien } from '../../services/request';

import type { Order } from '../../types/order';
import type {
  PaymentMethod,
  PaymentResult,
} from '../../types/payment';
import type { KetQuaMaGiam } from '../../types/promotion';

import './checkout.css';

type CustomerProfile = {
  id: string;
  name: string;
  email: string;
  phone: string;
};

type SavedAddress = {
  id: string;
  recipientName: string;
  phone: string;
  addressLine: string;
  ward: string | null;
  district: string | null;
  province: string | null;
  isDefault: boolean;
};

type ApiResponse<T> = {
  message: string;
  data: T;
};

function formatAddress(address: SavedAddress): string {
  return [
    address.addressLine,
    address.ward,
    address.district,
    address.province,
  ]
    .filter((part) => part && part.trim())
    .join(', ');
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Nhận mã giảm giá từ CartPage.
  const promotionCode =
    (location.state as { promotionCode?: string } | null)
      ?.promotionCode?.trim() ?? '';

  const [gioHang, setGioHang] = useState<
    Awaited<ReturnType<typeof cartService.layGioHang>> | null
  >(null);

  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');

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

  // Thông tin mã giảm giá.
  const [promotion, setPromotion] =
    useState<KetQuaMaGiam | null>(null);

  const [promotionError, setPromotionError] = useState('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Tải giỏ hàng, hồ sơ và địa chỉ đã lưu.
  useEffect(() => {
    let mounted = true;

    async function loadCheckoutData() {
      setLoading(true);
      setError('');

      const [cartResult, profileResult, addressResult] =
        await Promise.allSettled([
          cartService.layGioHang(),
          customerService.getProfile(),
          customerService.getAddresses(),
        ]);

      if (!mounted) return;

      if (cartResult.status === 'fulfilled') {
        setGioHang(cartResult.value);
      } else {
        setError(
          cartResult.reason instanceof Error
            ? cartResult.reason.message
            : 'Không thể tải giỏ hàng.',
        );
      }

      if (profileResult.status === 'fulfilled') {
        const response =
          profileResult.value as ApiResponse<CustomerProfile | null>;

        const profile = response.data;

        if (profile) {
          setRecipientName(profile.name || '');
          setPhone(profile.phone || '');
        }
      }

      if (addressResult.status === 'fulfilled') {
        const response =
          addressResult.value as ApiResponse<SavedAddress[]>;

        const addresses = response.data || [];

        setSavedAddresses(addresses);

        const defaultAddress =
          addresses.find((address) => address.isDefault) ||
          addresses[0];

        if (defaultAddress) {
          setSelectedAddressId(defaultAddress.id);
          setRecipientName(defaultAddress.recipientName || '');
          setPhone(defaultAddress.phone || '');
          setShippingAddress(formatAddress(defaultAddress));
        }
      }

      setLoading(false);
    }

    void loadCheckoutData();

    return () => {
      mounted = false;
    };
  }, []);

  // Kiểm tra lại mã giảm giá khi vào trang Checkout.
  useEffect(() => {
    let mounted = true;

    async function checkPromotion() {
      if (!promotionCode) {
        setPromotion(null);
        setPromotionError('');
        return;
      }

      try {
        const result =
          await promotionService.kiemTraMa(promotionCode);

        if (!mounted) return;

        setPromotion(result);
        setPromotionError('');
      } catch (err) {
        if (!mounted) return;

        setPromotion(null);
        setPromotionError(
          err instanceof Error
            ? err.message
            : 'Không thể kiểm tra mã giảm giá.',
        );
      }
    }

    void checkPromotion();

    return () => {
      mounted = false;
    };
  }, [promotionCode]);

  // Chọn địa chỉ giao hàng đã lưu.
  const handleAddressChange = (addressId: string) => {
    setSelectedAddressId(addressId);

    if (!addressId) return;

    const address = savedAddresses.find(
      (item) => item.id === addressId,
    );

    if (!address) return;

    setRecipientName(address.recipientName || '');
    setPhone(address.phone || '');
    setShippingAddress(formatAddress(address));
  };

  // Tạo giao dịch thanh toán.
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
          setSuccessMessage(
            'Thanh toán đã được xác nhận thành công.',
          );
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

  // Xử lý đặt hàng.
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

    const normalizedPhone = phone.trim();

    if (!normalizedPhone) {
      setError('Vui lòng nhập số điện thoại.');
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

    // Nếu có mã nhưng kiểm tra thất bại thì không âm thầm đặt đơn
    // mà bỏ qua mã giảm giá.
    if (promotionCode && !promotion) {
      setError(
        promotionError ||
          'Mã giảm giá chưa được xác nhận. Vui lòng quay lại giỏ hàng kiểm tra mã.',
      );
      return;
    }

    setSubmitting(true);

    try {
      const order = await orderService.taoDonHang({
        recipientName: recipientName.trim(),
        phone: normalizedPhone,
        shippingAddress: shippingAddress.trim(),
        note: note.trim(),
        paymentMethod,

        // Backend nhận promotionCode và tự tính lại tiền giảm.
        ...(promotionCode ? { promotionCode } : {}),
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

  // Thử lại khi tạo giao dịch thanh toán thất bại.
  const handleRetryPayment = async () => {
    if (!createdOrder || submitting) return;

    await createPayment(createdOrder, paymentMethod);
  };

  // Trạng thái tải dữ liệu.
  if (loading) {
    return (
      <div className="co-page">
        <p className="muted">Đang tải thông tin thanh toán...</p>
      </div>
    );
  }

  // Màn hình kết quả sau khi đặt hàng.
  if (createdOrder) {
    const isPaid =
      paymentResult?.status === 'PAID' ||
      paymentResult?.orderPaymentStatus === 'PAID';

    const isCOD = paymentMethod === 'COD';

    return (
      <div className="co-page">
        <div className="co-result">
          <div
            className={`co-result-icon ${
              isPaid || isCOD
                ? 'ok'
                : paymentResult
                  ? 'wait'
                  : 'fail'
            }`}
          >
            {isPaid || isCOD ? '✓' : paymentResult ? '…' : '!'}
          </div>

          <h1>
            {isPaid
              ? 'Thanh toán thành công!'
              : isCOD
                ? 'Đặt hàng thành công!'
                : 'Đơn hàng đã được tạo!'}
          </h1>

          {successMessage && <p>{successMessage}</p>}

          {error && (
            <div className="voucher-error">{error}</div>
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
              <span>Tạm tính</span>
              <strong>
                {dinhDangTien(Number(createdOrder.subtotalAmount))}
              </strong>
            </div>

            <div>
              <span>Giảm giá</span>
              <strong>
                -{dinhDangTien(Number(createdOrder.discountAmount))}
              </strong>
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

          {!paymentResult && (
            <>
              <p>
                Đơn hàng đã được tạo nhưng chưa tạo được giao dịch
                thanh toán. Bạn có thể thử lại.
              </p>

              <div className="co-actions">
                <button
                  className="co-btn primary"
                  type="button"
                  onClick={handleRetryPayment}
                  disabled={submitting}
                >
                  {submitting
                    ? 'Đang xử lý...'
                    : 'Thử lại thanh toán'}
                </button>
              </div>
            </>
          )}

          <div className="co-actions">
            <button
              className="co-btn primary"
              type="button"
              onClick={() => navigate('/orders')}
            >
              Xem đơn hàng
            </button>

            <button
              className="co-btn"
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
    <div className="co-page">
      <div className="checkout-head">
        <p className="section-kicker">SOLEDAY · SOLELAB</p>
        <h1>Thanh toán đơn hàng</h1>
      </div>

      {error && (
        <div className="voucher-error">{error}</div>
      )}

      {!gioHang || gioHang.items.length === 0 ? (
        <div className="form-panel">
          <p>Giỏ hàng của bạn đang trống.</p>

          <button
            className="checkout-button"
            type="button"
            onClick={() => navigate('/')}
          >
            Tiếp tục mua sắm
          </button>
        </div>
      ) : (
        <form onSubmit={handleCheckout}>
          <div className="checkout-grid">
            <div className="form-panel">
              <section>
                <h2>Thông tin người nhận</h2>

                {savedAddresses.length > 0 && (
                  <div className="form-grid">
                    <label className="full">
                      Địa chỉ đã lưu

                      <select
                        value={selectedAddressId}
                        onChange={(event) =>
                          handleAddressChange(event.target.value)
                        }
                      >
                        <option value="">Nhập địa chỉ khác</option>

                        {savedAddresses.map((address) => (
                          <option
                            key={address.id}
                            value={address.id}
                          >
                            {[
                              address.addressLine,
                              address.district,
                              address.province,
                              address.isDefault
                                ? '(Mặc định)'
                                : '',
                            ]
                              .filter(Boolean)
                              .join(' - ')}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}

                <div className="form-grid">
                  <label>
                    Họ và tên người nhận

                    <input
                      type="text"
                      value={recipientName}
                      onChange={(event) => {
                        setRecipientName(event.target.value);
                        setSelectedAddressId('');
                      }}
                      placeholder="Nhập họ và tên"
                      required
                    />
                  </label>

                  <label>
                    Số điện thoại

                    <input
                      type="tel"
                      value={phone}
                      onChange={(event) => {
                        setPhone(event.target.value);
                        setSelectedAddressId('');
                      }}
                      placeholder="Nhập số điện thoại"
                      required
                    />
                  </label>

                  <label className="full">
                    Địa chỉ giao hàng

                    <textarea
                      value={shippingAddress}
                      onChange={(event) => {
                        setShippingAddress(event.target.value);
                        setSelectedAddressId('');
                      }}
                      placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
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
                      rows={2}
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
                      Thanh toán trực tiếp khi nhận giày
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
                    <small>Thanh toán qua cổng VNPay</small>
                  </span>
                </label>
              </section>
            </div>

            <aside className="summary">
              <h2>Đơn hàng của bạn</h2>

              {gioHang.items.map((item) => (
                <div className="summary-product" key={item.id}>
                  <div className="summary-product-image">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.productName}
                      />
                    ) : (
                      <div className="summary-product-placeholder">
                        Không có ảnh
                      </div>
                    )}
                  </div>

                  <span className="summary-product-info">
                    <strong>{item.productName}</strong>

                    <small>
                      Size: {item.size} · Màu: {item.color}
                    </small>

                    <small>Số lượng: {item.quantity}</small>
                  </span>

                  <strong className="summary-product-price">
                    {dinhDangTien(Number(item.lineTotal))}
                  </strong>
                </div>
              ))}

              <div className="sum-row">
                <span>Tạm tính</span>

                <strong>
                  {dinhDangTien(Number(gioHang.payableSubtotal))}
                </strong>
              </div>

              {promotion && (
                <div className="sum-row">
                  <span>
                    Giảm giá ({promotion.code})
                  </span>

                  <strong>
                    -{dinhDangTien(Number(promotion.discountAmount))}
                  </strong>
                </div>
              )}

              {promotionError && (
                <p className="voucher-error">
                  {promotionError}
                </p>
              )}

              <div className="sum-total">
                <span>Tổng tiền dự kiến</span>

                <strong>
                  {dinhDangTien(
                    Number(
                      promotion?.total ?? gioHang.payableSubtotal,
                    ),
                  )}
                </strong>
              </div>

              <button
                className="checkout-button"
                type="submit"
                disabled={
                  submitting ||
                  Boolean(promotionCode && !promotion)
                }
              >
                {submitting ? 'Đang xử lý...' : 'ĐẶT HÀNG'}
              </button>

              <p className="muted">
                Vui lòng kiểm tra thông tin trước khi xác nhận đặt hàng.
              </p>
            </aside>
          </div>
        </form>
      )}
    </div>
  );
}
