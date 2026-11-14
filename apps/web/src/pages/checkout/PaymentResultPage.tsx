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