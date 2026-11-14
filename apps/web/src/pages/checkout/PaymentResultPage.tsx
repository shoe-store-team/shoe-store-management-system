import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { paymentService } from '../../services/paymentService';
import { dinhDangTien } from '../../services/request';
import type { PaymentResult } from '../../types/payment';
import './payment.css';

type TrangThai =
  | { type: 'loading' }
  | { type: 'error'; message: string }
  | { type: 'success'; data: PaymentResult };

export function PaymentResultPage() {
  const [searchParams] = useSearchParams();

  const reference = searchParams.get('reference');
  const error = searchParams.get('error');

  const [trangThai, setTrangThai] = useState<TrangThai>({
    type: 'loading',
  });

  const [dangKiemTra, setDangKiemTra] = useState(false);

  const taiKetQua = useCallback(async () => {
    if (error) {
      setTrangThai({
        type: 'error',
        message:
          error === 'signature'
            ? 'Chữ ký xác thực thanh toán không hợp lệ.'
            : error === 'config'
              ? 'Cổng thanh toán chưa được cấu hình đầy đủ.'
              : 'Thanh toán không thành công. Vui lòng kiểm tra lại.',
      });
      return;
    }

    if (!reference) {
      setTrangThai({
        type: 'error',
        message: 'Không tìm thấy mã giao dịch thanh toán.',
      });
      return;
    }

    setDangKiemTra(true);

    try {
      let ketQua = await paymentService.layTheoMaThamChieu(reference);

      if (ketQua.method === 'VNPAY' && ketQua.status === 'PENDING') {
        for (let i = 0; i < 3; i++) {
          await new Promise((resolve) => setTimeout(resolve, 2000));

          ketQua = await paymentService.doiSoat(ketQua.id);

          if (ketQua.status !== 'PENDING') {
            break;
          }
        }
      }

      setTrangThai({
        type: 'success',
        data: ketQua,
      });
    } catch (err) {
      setTrangThai({
        type: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Không thể lấy kết quả thanh toán.',
      });
    } finally {
      setDangKiemTra(false);
    }
  }, [reference, error]);

  useEffect(() => {
    void taiKetQua();
  }, [taiKetQua]);

  if (trangThai.type === 'loading') {
    return (
      <main className="co-page">
        <section className="co-result">
          <h2>Đang kiểm tra thanh toán...</h2>
          <p>Vui lòng chờ trong giây lát.</p>
        </section>
      </main>
    );
  }

<<<<<<< Updated upstream
  if (trangThai.type === 'error') {
    return (
      <main className="co-page">
        <section className="co-result">
          <h2>Không thể xác nhận thanh toán</h2>
          <p>{trangThai.message}</p>

          <div className="co-actions">
            <Link to="/orders" className="co-btn">
              Xem đơn hàng
            </Link>

            <Link to="/products" className="co-btn">
              Tiếp tục mua sắm
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const tt = trangThai.data;

  const daThanhToan = tt.status === 'PAID';
  const thatBai = tt.status === 'FAILED';
  const choThanhToan = tt.status === 'PENDING';
  const laCOD = tt.method === 'COD';

  return (
    <main className="co-page">
      <section className="co-result">
        <div className="co-result-icon">
          {daThanhToan || laCOD ? '✓' : thatBai ? '✕' : '…'}
        </div>

        <h2>
          {daThanhToan
            ? 'Thanh toán thành công'
            : laCOD
              ? 'Đặt hàng thành công'
              : thatBai
                ? 'Thanh toán thất bại'
                : 'Đang chờ thanh toán'}
        </h2>

        <p>
          {daThanhToan
            ? 'Giao dịch của bạn đã được xác nhận.'
            : laCOD
              ? 'Đơn hàng đã được ghi nhận. Bạn sẽ thanh toán khi nhận hàng.'
              : thatBai
                ? 'Giao dịch thất bại. Đơn hàng đã được hủy theo quy định.'
                : 'Hệ thống chưa nhận được xác nhận thanh toán. Bạn có thể kiểm tra lại trạng thái.'}
        </p>

        <div className="co-facts">
          <div>
            <span>Mã đơn hàng</span>
            <strong>{tt.orderCode}</strong>
          </div>

          <div>
            <span>Số tiền</span>
            <strong>{dinhDangTien(tt.amount)}</strong>
          </div>

          <div>
            <span>Phương thức</span>
            <strong>{tt.method}</strong>
          </div>

          <div>
            <span>Trạng thái thanh toán</span>
            <strong>
              {daThanhToan
                ? 'Đã thanh toán'
                : laCOD
                  ? 'Thanh toán khi nhận hàng'
                  : thatBai
                    ? 'Thất bại'
                    : 'Đang chờ'}
            </strong>
          </div>

          {tt.transactionId && (
            <div>
              <span>Mã giao dịch</span>
              <strong>{tt.transactionId}</strong>
            </div>
          )}

          {tt.paidAt && (
            <div>
              <span>Thời gian thanh toán</span>
              <strong>
                {new Date(tt.paidAt).toLocaleString('vi-VN')}
              </strong>
            </div>
=======
  const { tt } = trangThai;
  const laCod = tt.method === 'COD';
  const donDaHuy = tt.orderStatus === 'CANCELLED';
  // Chọn đúng một trường hợp hiển thị
  const loai: 'cod' | 'paid' | 'refund' | 'cancelled' | 'expired' | 'failed' | 'pending' =
    tt.refundRequired ? 'refund'
    : tt.status === 'PAID' ? 'paid'
    : laCod && !donDaHuy ? 'cod'
    : donDaHuy || tt.failureReason === 'ORDER_CANCELLED' ? 'cancelled'
    : tt.expired ? 'expired'
    : tt.status === 'FAILED' ? 'failed'
    : 'pending';
  // Chỉ cho thanh toán lại khi đơn vẫn đang chờ thanh toán
  const thuLaiDuoc = !laCod && tt.orderStatus === 'PENDING' && tt.orderPaymentStatus !== 'PAID';
  const NOI_DUNG = {
    cod: ['ok', '✓', 'Đặt hàng thành công', 'Cảm ơn bạn! Cửa hàng sẽ sớm chuẩn bị đơn hàng. Bạn thanh toán tiền mặt khi nhận hàng.'],
    paid: ['ok', '✓', 'Thanh toán thành công', 'Thanh toán đã được xác nhận. Đơn hàng của bạn đang được chuẩn bị.'],
    refund: ['wait', '!', 'Đã nhận tiền nhưng đơn đã bị huỷ', 'Cửa hàng đã ghi nhận khoản thanh toán và sẽ liên hệ để hoàn tiền cho bạn.'],
    cancelled: ['fail', '✕', 'Đơn hàng đã bị huỷ', 'Giao dịch này không còn hiệu lực. Nếu tài khoản của bạn đã bị trừ tiền, cửa hàng sẽ ghi nhận và hoàn lại.'],
    expired: ['fail', '⏱', 'Giao dịch đã hết hạn', thuLaiDuoc ? 'Link thanh toán đã hết hạn. Bạn có thể tạo giao dịch mới nếu đơn vẫn còn trong thời gian giữ hàng.' : 'Link thanh toán đã hết hạn.'],
    failed: ['fail', '✕', 'Thanh toán không thành công', tt.failureReason === 'VNPAY_24' ? 'Bạn đã huỷ giao dịch trên VNPay.' : 'Giao dịch này chưa được ghi nhận thanh toán. Bạn có thể thử lại trong thời gian giữ đơn.'],
    pending: ['wait', '…', 'Đang chờ VNPay xác nhận', tt.message ?? 'Giao dịch chưa có kết quả cuối cùng.'],
  } as const;
  const [icon, kyHieu, tieuDe, moTa] = NOI_DUNG[loai];

  return (
    <div className="co-page">
      <div className="co-result">
        <i className={`co-result-icon ${icon}`}>{kyHieu}</i>
        <h1>{tieuDe}</h1>
        <p>{moTa}</p>

        <div className="co-facts">
          <div><span>Mã đơn hàng</span><strong>#{tt.orderCode}</strong></div>
          <div><span>Số tiền</span><strong>{dinhDangTien(tt.amount)}</strong></div>
          <div><span>Phương thức</span><strong>{laCod ? 'Thanh toán khi nhận hàng' : 'VNPay'}</strong></div>
          {tt.transactionId && <div><span>Mã giao dịch</span><strong>{tt.transactionId}</strong></div>}
          {tt.paidAt && <div><span>Thời gian</span><strong>{gio(tt.paidAt)}</strong></div>}
          {loai === 'pending' && tt.expiresAt && <div><span>Hết hạn lúc</span><strong>{gio(tt.expiresAt)}</strong></div>}
        </div>

        <div className="co-actions">
          {(loai === 'failed' || loai === 'expired') && thuLaiDuoc && (
            <PayButton orderId={tt.orderId} label="Thanh toán lại" />
          )}
          {loai === 'pending' && (
            <>
              <button className="co-btn" onClick={() => void tai(() => false)}>Kiểm tra lại</button>
              <PayButton orderId={tt.orderId} label="Quay lại trang thanh toán" />
            </>
>>>>>>> Stashed changes
          )}
        </div>

        {thatBai && (
          <div className="co-actions">
            <p>
              Đơn hàng này đã bị hủy. Nếu muốn mua sản phẩm,
              vui lòng tạo một đơn hàng mới.
            </p>

            <Link to="/products" className="co-btn">
              Tiếp tục mua sắm
            </Link>
          </div>
        )}

        {choThanhToan && (
          <div className="co-actions">
            <button
              type="button"
              className="co-btn"
              disabled={dangKiemTra}
              onClick={() => void taiKetQua()}
            >
              {dangKiemTra ? 'Đang kiểm tra...' : 'Kiểm tra lại thanh toán'}
            </button>

            <Link to="/orders" className="co-btn">
              Xem đơn hàng
            </Link>
          </div>
        )}

        {(daThanhToan || laCOD) && (
          <div className="co-actions">
            <Link to="/orders" className="co-btn">
              Xem đơn hàng
            </Link>

            <Link to="/products" className="co-btn">
              Tiếp tục mua sắm
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}