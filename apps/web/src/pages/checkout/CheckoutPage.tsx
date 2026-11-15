
import { useEffect, useState } from 'react';
import {useNavigate } from 'react-router-dom';

import { cartService } from '../../services/cartService';
import { customerService } from '../../services/customerService';
import { orderService } from '../../services/orderService';
import { paymentService } from '../../services/paymentService';
import { promotionService } from '../../services/promotionService';

import { dinhDangTien } from '../../services/request';

import type { Order } from '../../types/order';
import type {
  PaymentMethod,
  PaymentResult,
} from '../../types/payment';
import type { KetQuaMaGiam } from '../../types/promotion';

import { VnpayQrPayment } from './VnpayQrPayment';
import './checkout.css';

type GioHangData = Awaited<
  ReturnType<typeof cartService.layGioHang>
>;

type CustomerProfile = {
  id: string;
  name: string;
  phone: string;
};

type CustomerAddress = {
  id: string;
  recipientName: string;
  phone: string;
  addressLine: string;
  ward?: string | null;
  district?: string | null;
  province?: string | null;
  isDefault: boolean;
};

// Ghép các thành phần địa chỉ thành một chuỗi.
const formatAddress = (address: CustomerAddress) => {
  return [
    address.addressLine,
    address.ward,
    address.district,
    address.province,
  ]
    .filter(Boolean)
    .join(', ');
};

export function CheckoutPage() {
  const navigate = useNavigate();

  // =========================================
  // 1. DỮ LIỆU GIỎ HÀNG VÀ KHÁCH HÀNG
  // =========================================

  const [gioHang, setGioHang] = useState<GioHangData | null>(null);

  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');

  const [recipientName, setRecipientName] = useState('');
  const [phone, setPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [note, setNote] = useState('');

  // =========================================
  // 2. MÃ KHUYẾN MÃI
  // =========================================

  const [promotionCode, setPromotionCode] = useState('');
  const [appliedPromotion, setAppliedPromotion] =
    useState<KetQuaMaGiam | null>(null);
  const [checkingPromotion, setCheckingPromotion] = useState(false);

  // =========================================
  // 3. PHƯƠNG THỨC VÀ KẾT QUẢ THANH TOÁN
  // =========================================

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>('COD');

  const [createdOrder, setCreatedOrder] =
    useState<Order | null>(null);

  const [paymentResult, setPaymentResult] =
    useState<PaymentResult | null>(null);

  const [qrPayment, setQrPayment] =
    useState<PaymentResult | null>(null);

  // =========================================
  // 4. TRẠNG THÁI GIAO DIỆN
  // =========================================

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // =========================================
  // 5. TẢI GIỎ HÀNG VÀ THÔNG TIN KHÁCH HÀNG
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

    const loadCustomerInfo = async () => {
      try {
        const [profileResponse, addressResponse] =
          await Promise.all([
            customerService.getProfile(),
            customerService.getAddresses(),
          ]);

        if (!mounted) return;

        // API trả về { message, data }.
        const profile: CustomerProfile =
          profileResponse.data ?? profileResponse;

        const addressList: CustomerAddress[] =
          addressResponse.data ?? addressResponse;

        const validAddresses = Array.isArray(addressList)
          ? addressList
          : [];

        setAddresses(validAddresses);

        // Điền thông tin cơ bản từ hồ sơ.
        setRecipientName(profile.name ?? '');
        setPhone(profile.phone ?? '');

        // Ưu tiên địa chỉ mặc định.
        const defaultAddress = validAddresses.find(
          (address) => address.isDefault,
        );

        if (defaultAddress) {
          setSelectedAddressId(defaultAddress.id);
          setRecipientName(defaultAddress.recipientName);
          setPhone(defaultAddress.phone);
          setShippingAddress(formatAddress(defaultAddress));
        }
      } catch {
        // Nếu không tải được hồ sơ hoặc địa chỉ,
        // khách hàng vẫn có thể tự nhập thông tin.
      }
    };

    void loadCart();
    void loadCustomerInfo();

    return () => {
      mounted = false;
    };
  }, []);

  // =========================================
  // 6. CHỌN ĐỊA CHỈ ĐÃ LƯU
  // =========================================

  const handleSelectAddress = (addressId: string) => {
    setSelectedAddressId(addressId);

    if (!addressId) {
      return;
    }

    const address = addresses.find(
      (item) => item.id === addressId,
    );

    if (!address) return;

    setRecipientName(address.recipientName);
    setPhone(address.phone);
    setShippingAddress(formatAddress(address));
  };

  // =========================================
  // 7. KIỂM TRA VÀ ÁP DỤNG MÃ KHUYẾN MÃI
  // =========================================

  const handleApplyPromotion = async () => {
    const code = promotionCode.trim();

    if (!code) {
      setError('Vui lòng nhập mã khuyến mãi.');
      return;
    }

    if (checkingPromotion) return;

    setCheckingPromotion(true);
    setError('');

    try {
      const result = await promotionService.kiemTraMa(code);

      setAppliedPromotion(result);
      setPromotionCode(result.code);

      setSuccessMessage('Áp dụng mã khuyến mãi thành công.');
    } catch (err) {
      setAppliedPromotion(null);
      setSuccessMessage('');

      setError(
        err instanceof Error
          ? err.message
          : 'Mã khuyến mãi không hợp lệ.',
      );
    } finally {
      setCheckingPromotion(false);
    }
  };

  // =========================================
  // 8. TẠO GIAO DỊCH THANH TOÁN
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

      // Thanh toán VNPay.
      if (method === 'VNPAY') {
        if (result.status === 'PAID') {
          setSuccessMessage(
            'Thanh toán đã được xác nhận thành công.',
          );
          return;
        }

        if (result.paymentUrl) {
          setQrPayment(result);
          return;
        }

        setSuccessMessage(
          'Đơn hàng đã được tạo. Giao dịch thanh toán đang được xử lý.',
        );
        return;
      }

      // Thanh toán COD.
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
  // 9. XỬ LÝ ĐẶT HÀNG
  // =========================================

  const handleCheckout = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (submitting) return;

    setError('');
    setSuccessMessage('');

    // Kiểm tra họ tên.
    if (!recipientName.trim()) {
      setError('Vui lòng nhập họ tên người nhận.');
      return;
    }

 const normalizedPhone = phone.trim();

if (!normalizedPhone) {
  setError('Vui lòng nhập số điện thoại.');
  return;
}

    // Kiểm tra địa chỉ.
    if (!shippingAddress.trim()) {
      setError('Vui lòng nhập địa chỉ giao hàng.');
      return;
    }

    // Kiểm tra giỏ hàng.
    if (!gioHang || gioHang.items.length === 0) {
      setError('Giỏ hàng đang trống.');
      return;
    }

    setSubmitting(true);

    try {
      // Tạo đơn hàng.
      const order = await orderService.taoDonHang({
        recipientName: recipientName.trim(),
        phone: normalizedPhone,
        shippingAddress: shippingAddress.trim(),

        // Chỉ gửi addressId nếu khách vẫn dùng
        // địa chỉ đã lưu mà không chỉnh sửa.
        ...(selectedAddressId
          ? { addressId: selectedAddressId }
          : {}),

        note: note.trim(),
        paymentMethod,

        // Chỉ gửi mã đã được API xác nhận.
        ...(appliedPromotion
          ? { promotionCode: appliedPromotion.code }
          : {}),
      });

      setCreatedOrder(order);

      // Sau khi tạo đơn hàng, tạo giao dịch thanh toán.
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
  // 10. THỬ LẠI THANH TOÁN
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
  // 11. TÍNH SỐ TIỀN HIỂN THỊ
  // =========================================

  const subtotal = appliedPromotion
    ? Number(appliedPromotion.subtotal)
    : Number(gioHang?.subtotal ?? 0);

  const discountAmount = appliedPromotion
    ? Number(appliedPromotion.discountAmount)
    : 0;

  const totalAmount = appliedPromotion
    ? Number(appliedPromotion.total)
    : subtotal;

  // =========================================
  // 12. ĐANG TẢI GIỎ HÀNG
  // =========================================

  if (loading) {
    return (
      <div className="co-page">
        <p className="muted">Đang tải giỏ hàng...</p>
      </div>
    );
  }

  // =========================================
  // 13. HIỂN THỊ MÀN HÌNH VNPay QR
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
  // 14. HIỂN THỊ KẾT QUẢ ĐƠN HÀNG
  // =========================================

  if (createdOrder) {
    const isPaid =
      paymentResult?.status === 'PAID' ||
      paymentResult?.orderPaymentStatus === 'PAID';

    const isCOD = paymentMethod === 'COD';

    return (
      <div className="co-page">
        <div className="co-result">
          <i
            className={`co-result-icon ${
              isPaid || isCOD ? 'ok' : 'wait'
            }`}
          >
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
                {dinhDangTien(Number(createdOrder.discountAmount))}
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
  // 15. GIỎ HÀNG TRỐNG
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
  // 16. GIAO DIỆN CHECKOUT
  // =========================================

  return (
    <div className="co-page">
      <div className="checkout-head">
        <p className="section-kicker">YOUR ORDER</p>
        <h1>Thanh toán đơn hàng</h1>
      </div>

      {error && (
        <div className="voucher-error">{error}</div>
      )}

      {successMessage && (
        <p className="co-success-message">{successMessage}</p>
      )}

      <div className="checkout-grid">
        {/* Cột trái: thông tin nhận hàng và thanh toán */}
        <form
          className="form-panel"
          onSubmit={handleCheckout}
        >
          <section>
            <h2>Thông tin người nhận</h2>

            {addresses.length > 0 && (
              <label className="full">
                Chọn địa chỉ đã lưu
                <select
                  value={selectedAddressId}
                  onChange={(event) =>
                    handleSelectAddress(event.target.value)
                  }
                >
                  <option value="">Nhập địa chỉ khác</option>

                  {addresses.map((address) => (
                    <option key={address.id} value={address.id}>
                      {address.recipientName} - {formatAddress(address)}
                      {address.isDefault ? ' (Mặc định)' : ''}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="form-grid">
              <label className="full">
                Họ và tên người nhận
                <input
                  type="text"
                  value={recipientName}
                  onChange={(event) => {
                    setRecipientName(event.target.value);
                    setSelectedAddressId('');
                  }}
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
                  onChange={(event) => {
                    setPhone(event.target.value);
                    setSelectedAddressId('');
                  }}
                  placeholder="Nhập số điện thoại"
                  autoComplete="tel"
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

          {/* Mã khuyến mãi */}
          <section>
            <h2>Mã khuyến mãi</h2>

            <div className="co-promotion">
              <input
                type="text"
                value={promotionCode}
                onChange={(event) => {
                  setPromotionCode(event.target.value);
                  setAppliedPromotion(null);
                  setSuccessMessage('');
                }}
                placeholder="Nhập mã giảm giá"
                disabled={checkingPromotion}
              />

              <button
                type="button"
                className="co-btn primary"
                onClick={handleApplyPromotion}
                disabled={checkingPromotion || !promotionCode.trim()}
              >
                {checkingPromotion ? 'Đang kiểm tra...' : 'Áp dụng'}
              </button>
            </div>

            {appliedPromotion && (
              <p className="co-promotion-success">
                Đã áp dụng: {appliedPromotion.name}
              </p>
            )}
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
  {item.imageUrl ? (
    <img
      src={item.imageUrl}
      alt={item.productName}
    />
  ) : (
    <div className="summary-product-placeholder">
      Sản phẩm
    </div>
  )}
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
            <strong>{dinhDangTien(subtotal)}</strong>
          </div>

          <div className="sum-row">
            <span>Giảm giá</span>
            <strong>
              -{dinhDangTien(discountAmount)}
            </strong>
          </div>

          <div className="sum-total">
            <span>Tổng thanh toán</span>
            <strong>{dinhDangTien(totalAmount)}</strong>
          </div>

          <p className="muted">
            Vui lòng kiểm tra thông tin trước khi đặt hàng.
          </p>
        </aside>
      </div>
    </div>
  );
}
