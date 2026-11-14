import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { paymentService } from '../../services/paymentService';
import type { BankCode, PaymentMethod } from '../../types/payment';
import './payment.css';

type Props = {
  orderId: string;
  method?: PaymentMethod;
  bankCode?: BankCode;
  label?: string;
  className?: string;
  disabled?: boolean;
};

export function PayButton({
  orderId,
  method = 'VNPAY',
  bankCode,
  label = 'Thanh toán',
  className = 'pay-btn',
  disabled,
}: Props) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handlePayment() {
    if (loading || disabled) return;

    setLoading(true);
    setError('');

    try {
      const result = await paymentService.taoThanhToan({
        orderId,
        method,
        bankCode,
      });

      if (result.paymentUrl) {
        window.location.assign(result.paymentUrl);
        return;
      }

      if (result.reference) {
        navigate(
          `/payment/result?reference=${encodeURIComponent(result.reference)}`,
        );
        return;
      }

      throw new Error('Không nhận được thông tin giao dịch thanh toán.');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể khởi tạo thanh toán. Vui lòng thử lại.',
      );
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => void handlePayment()}
        disabled={disabled || loading}
      >
        {loading ? 'Đang xử lý...' : label}
      </button>

      {error && (
        <p className="pay-btn-error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}