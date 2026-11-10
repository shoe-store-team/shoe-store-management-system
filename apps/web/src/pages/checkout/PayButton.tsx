import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { paymentService } from '../../services/paymentService';
import type { BankCode, PaymentMethod } from '../../types/payment';
import './checkout.css';

type Props = {
  orderId: string;
  method?: PaymentMethod;
  bankCode?: BankCode;
  label?: string;
  className?: string; // 'pay-button' trong thẻ đơn / chi tiết đơn; mặc định nút đen của trang kết quả
  disabled?: boolean;
};

/**
 * Nút thanh toán cho một đơn đã tạo: gọi API rồi chuyển khách sang VNPay (hoặc trang kết quả).
 * Bấm lại cho cùng một đơn sẽ nhận lại đúng link cũ, không tạo giao dịch trùng.
 */
export function PayButton({ orderId, method = 'VNPAY', bankCode, label = 'Thanh toán', className = 'co-btn primary', disabled }: Props) {
  const dieuHuong = useNavigate();
  const [dangXuLy, setDangXuLy] = useState(false);
  const [loi, setLoi] = useState('');

  async function bam() {
    setDangXuLy(true);
    setLoi('');
    try {
      const tt = await paymentService.taoThanhToan({ orderId, method, bankCode });
      if (tt.paymentUrl) {
        window.location.assign(tt.paymentUrl); // sang trang VNPay
        return; // giữ trạng thái "đang xử lý" cho tới khi trình duyệt chuyển trang
      }
      dieuHuong(`/payment/result?reference=${tt.reference}`);
    } catch (e) {
      setLoi((e as Error).message);
      setDangXuLy(false);
    }
  }

  return (
    <>
      <button className={className} onClick={bam} disabled={disabled || dangXuLy}>
        {dangXuLy ? 'Đang xử lý...' : label}
      </button>
      {loi && <p className="voucher-error">{loi}</p>}
    </>
  );
}
