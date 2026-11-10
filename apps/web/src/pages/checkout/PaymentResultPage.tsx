import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { paymentService } from '../../services/paymentService';
import { dinhDangTien } from '../../services/request';
import type { PaymentResult } from '../../types/payment';
import { PayButton } from './PayButton';
import './checkout.css';

type TrangThai =
  | { loai: 'dang-tai' }
  | { loai: 'loi'; thongBao: string }
  | { loai: 'xong'; tt: PaymentResult };

const doi = (ms: number) => new Promise((r) => setTimeout(r, ms));
const gio = (iso: string) => new Date(iso).toLocaleString('vi-VN');

/**
 * Đích đến sau khi đặt hàng:
 *  - COD: backend trả về ngay -> "Đặt hàng thành công".
 *  - VNPay: VNPay chuyển về /payment/result?reference=... (backend redirect). Trang này không tự quyết đúng/sai:
 *    nó hỏi backend; nếu giao dịch còn PENDING (IPN chưa tới, VD chạy localhost) thì đối soát để backend hỏi lại VNPay.
 */
export function PaymentResultPage() {
  const [params] = useSearchParams();
  const reference = params.get('reference');
  const loiUrl = params.get('error');
  const [trangThai, setTrangThai] = useState<TrangThai>({ loai: 'dang-tai' });

  const tai = useCallback(
    async (daHuy: () => boolean) => {
      if (loiUrl) {
        setTrangThai({
          loai: 'loi',
          thongBao:
            loiUrl === 'signature'
              ? 'Dữ liệu trả về từ VNPay không hợp lệ. Nếu bạn đã bị trừ tiền, vui lòng liên hệ cửa hàng.'
              : 'Hệ thống thanh toán chưa được cấu hình.',
        });
        return;
      }
      if (!reference) {
        setTrangThai({ loai: 'loi', thongBao: 'Thiếu mã giao dịch.' });
        return;
      }
      setTrangThai({ loai: 'dang-tai' });
      try {
        let tt = await paymentService.layTheoMaThamChieu(reference);
        for (let i = 0; i < 3 && tt.method === 'VNPAY' && tt.status === 'PENDING' && !daHuy(); i++) {
          tt = await paymentService.doiSoat(tt.id);
          if (tt.status === 'PENDING') await doi(2000);
        }
        if (!daHuy()) setTrangThai({ loai: 'xong', tt });
      } catch (e) {
        if (!daHuy()) setTrangThai({ loai: 'loi', thongBao: (e as Error).message });
      }
    },
    [reference, loiUrl],
  );

  useEffect(() => {
    let huy = false;
    void tai(() => huy);
    return () => { huy = true; };
  }, [tai]);

  const lienKet = (
    <div className="co-actions">
      <Link className="co-btn primary" to="/orders">Xem đơn hàng của tôi</Link>
      <Link className="co-btn" to="/">Tiếp tục mua sắm</Link>
    </div>
  );

  if (trangThai.loai === 'dang-tai')
    return <div className="co-page"><div className="co-result"><p>Đang xác nhận thanh toán...</p></div></div>;

  if (trangThai.loai === 'loi')
    return (
      <div className="co-page">
        <div className="co-result">
          <i className="co-result-icon fail">!</i>
          <h1>Không thể xác nhận thanh toán</h1>
          <p>{trangThai.thongBao}</p>
          {lienKet}
        </div>
      </div>
    );

  const { tt } = trangThai;
  const laCod = tt.method === 'COD';

  return (
    <div className="co-page">
      <div className="co-result">
        {(tt.status === 'PAID' || laCod) && (
          <>
            <i className="co-result-icon ok">✓</i>
            <h1>{laCod ? 'Đặt hàng thành công' : 'Thanh toán thành công'}</h1>
            <p>
              {laCod
                ? 'Cảm ơn bạn! Cửa hàng sẽ sớm chuẩn bị đơn hàng. Bạn thanh toán tiền mặt khi nhận hàng.'
                : 'Thanh toán đã được xác nhận. Đơn hàng của bạn đang được chuẩn bị.'}
            </p>
          </>
        )}
        {tt.status === 'FAILED' && !laCod && (
          <>
            <i className="co-result-icon fail">✕</i>
            <h1>Thanh toán không thành công</h1>
            <p>Giao dịch này chưa được ghi nhận thanh toán. Bạn có thể thử lại trong thời gian giữ đơn.</p>
          </>
        )}
        {tt.status === 'PENDING' && !laCod && (
          <>
            <i className="co-result-icon wait">…</i>
            <h1>Đang chờ VNPay xác nhận</h1>
            <p>{tt.message ?? 'Giao dịch chưa có kết quả cuối cùng.'}</p>
          </>
        )}

        <div className="co-facts">
          <div><span>Mã đơn hàng</span><strong>#{tt.orderCode}</strong></div>
          <div><span>Số tiền</span><strong>{dinhDangTien(tt.amount)}</strong></div>
          <div><span>Phương thức</span><strong>{laCod ? 'Thanh toán khi nhận hàng' : 'VNPay'}</strong></div>
          {tt.transactionId && <div><span>Mã giao dịch</span><strong>{tt.transactionId}</strong></div>}
          {tt.paidAt && <div><span>Thời gian</span><strong>{gio(tt.paidAt)}</strong></div>}
        </div>

        <div className="co-actions">
          {tt.status === 'FAILED' && !laCod && <PayButton orderId={tt.orderId} label="Thanh toán lại" />}
          {tt.status === 'PENDING' && !laCod && (
            <>
              <button className="co-btn" onClick={() => void tai(() => false)}>Kiểm tra lại</button>
              <PayButton orderId={tt.orderId} label="Quay lại trang thanh toán" />
            </>
          )}
        </div>
        {lienKet}
      </div>
    </div>
  );
}
