import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { paymentService } from '../../services/paymentService';
import { dinhDangTien } from '../../services/request';
import type { PaymentResult } from '../../types/payment';
import './vnpay-qr.css';

/**
 * Màn hình thanh toán VNPay bằng mã QR (M6).
 * - Mã QR chứa link thanh toán VNPay Sandbox: quét bằng camera điện thoại, trang VNPay mở trên điện thoại.
 * - Trang này tự hỏi backend mỗi 3 giây. Vì chạy localhost nên IPN không tới được, cứ ~9 giây trang gọi
 *   đối soát (QueryDR) để backend hỏi thẳng VNPay. Khi tiền về, màn hình tự chuyển sang "Thanh toán thành công".
 * - Không tự quyết đúng/sai: trạng thái luôn lấy từ backend (đã xác minh chữ ký và số tiền).
 */

type Props = {
  payment: PaymentResult;
  /** Gọi khi có kết quả cuối cùng (PAID / FAILED / hết hạn) */
  onFinished?: (result: PaymentResult) => void;
};

const POLL_MS = 3000;
const RECONCILE_EVERY = 3; // mỗi 3 lần hỏi thì có 1 lần đối soát với VNPay

function conLai(expiresAt: string | null, now: number) {
  if (!expiresAt) return null;
  return Math.max(0, Math.floor((new Date(expiresAt).getTime() - now) / 1000));
}
/**
 * Vẽ mã QR thành SVG bằng thư viện `qrcode` (không phụ thuộc React, tránh lỗi "Invalid hook call"
 * khi monorepo có 2 bản React). Lỗi tạo mã thì hiện nút mở link thay vì làm trắng trang.
 */
function MaQR({ value }: { value: string }) {
  const [svg, setSvg] = useState('');
  const [loi, setLoi] = useState(false);
  useEffect(() => {
    let huy = false;
    QRCode.toString(value, { type: 'svg', errorCorrectionLevel: 'L', margin: 2, width: 232 })
      .then((s) => { if (!huy) { setSvg(s); setLoi(false); } })
      .catch(() => { if (!huy) setLoi(true); });
    return () => { huy = true; };
  }, [value]);
  if (loi) return <p className="vq-muted">Không tạo được mã QR. Dùng nút “Mở cổng thanh toán” bên cạnh.</p>;
  if (!svg) return <div className="vq-qr-loading">Đang tạo mã...</div>;
  // SVG do thư viện qrcode tự sinh từ link thanh toán, không chứa nội dung người dùng nhập
  return <div className="vq-qr-svg" role="img" aria-label="Mã QR thanh toán" dangerouslySetInnerHTML={{ __html: svg }} />;
}

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export function VnpayQrPayment({ payment, onFinished }: Props) {
  const navigate = useNavigate();
  const [tt, setTt] = useState<PaymentResult>(payment);
  const [now, setNow] = useState(() => Date.now());
  const [dangKiemTra, setDangKiemTra] = useState(false);
  const [thongBao, setThongBao] = useState('');
  const dem = useRef(0);
  const daBao = useRef(false);

  const xong = tt.status !== 'PENDING' || tt.expired;
  // Link không phải cổng VNPay thật => backend đang dùng cổng giả lập (PAYMENT_MOCK_QR=true)
  const giaLap = Boolean(tt.paymentUrl && !tt.paymentUrl.includes('vnpayment.vn'));
  const giay = conLai(tt.expiresAt, now);
  const hetGio = giay === 0;

  // Hỏi backend: thường thì đọc trạng thái, định kỳ thì đối soát với VNPay
  const kiemTra = useCallback(
    async (doiSoat: boolean) => {
      try {
        const r = doiSoat
          ? await paymentService.doiSoat(payment.id)
          : await paymentService.layTheoMaThamChieu(payment.reference);
        setTt(r);
        setThongBao('');
      } catch (e) {
        // VNPay chưa phản hồi hoặc mất mạng: giữ nguyên màn hình, lần sau hỏi lại
        if (doiSoat) setThongBao((e as Error).message);
      }
    },
    [payment.id, payment.reference],
  );

  // Vòng hỏi trạng thái
  useEffect(() => {
    if (xong) return;
    const id = window.setInterval(() => {
      dem.current += 1;
      void kiemTra(dem.current % RECONCILE_EVERY === 0);
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [xong, kiemTra]);

  // Đồng hồ đếm ngược
  useEffect(() => {
    if (xong) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [xong]);

  // Báo kết quả cuối cùng cho trang cha đúng 1 lần
  useEffect(() => {
    if (xong && !daBao.current) {
      daBao.current = true;
      onFinished?.(tt);
    }
  }, [xong, tt, onFinished]);

  async function toiDaThanhToan() {
    setDangKiemTra(true);
    await kiemTra(true);
    setDangKiemTra(false);
  }

  /* ---------------------------------------------------------------- đã thanh toán */
  if (tt.status === 'PAID') {
    return (
      <div className="vq-card">
        <i className="vq-icon ok">✓</i>
        <h2>Thanh toán thành công</h2>
        <p className="vq-muted">VNPay đã xác nhận giao dịch. Đơn hàng của bạn đang được chuẩn bị.</p>
        <div className="vq-facts">
          <div><span>Mã đơn hàng</span><strong>#{tt.orderCode}</strong></div>
          <div><span>Số tiền</span><strong>{dinhDangTien(tt.amount)}</strong></div>
          {tt.transactionId && <div><span>Mã giao dịch VNPay</span><strong>{tt.transactionId}</strong></div>}
          {tt.paidAt && <div><span>Thời gian</span><strong>{new Date(tt.paidAt).toLocaleString('vi-VN')}</strong></div>}
        </div>
        <div className="vq-actions">
          <button type="button" className="vq-btn primary" onClick={() => navigate('/orders')}>Xem đơn hàng</button>
          <button type="button" className="vq-btn" onClick={() => navigate('/')}>Tiếp tục mua sắm</button>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- thất bại / hết hạn */
  if (xong) {
    const hetHan = tt.expired || tt.failureReason === 'EXPIRED';
    return (
      <div className="vq-card">
        <i className="vq-icon fail">{hetHan ? '⏱' : '✕'}</i>
        <h2>{hetHan ? 'Mã thanh toán đã hết hạn' : 'Thanh toán không thành công'}</h2>
        <p className="vq-muted">
          {tt.failureReason === 'VNPAY_24'
            ? 'Bạn đã huỷ giao dịch trên VNPay.'
            : hetHan
              ? 'Mã QR không còn hiệu lực. Bạn có thể tạo mã mới nếu đơn vẫn còn trong thời gian giữ hàng.'
              : 'Giao dịch chưa được ghi nhận. Bạn có thể thử lại.'}
        </p>
        <div className="vq-actions">
          <button type="button" className="vq-btn primary" onClick={() => navigate(`/payment/result?reference=${tt.reference}`)}>
            Xem chi tiết và thanh toán lại
          </button>
          <button type="button" className="vq-btn" onClick={() => navigate('/orders')}>Xem đơn hàng</button>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- đang chờ quét mã */
  return (
    <div className="vq-card vq-wide">
      <p className="vq-kicker">THANH TOÁN QUA VNPAY</p>
      <h2>Quét mã để thanh toán</h2>
      <p className="vq-muted">Đơn hàng #{tt.orderCode}</p>
      {giaLap && <p className="vq-demo">Chế độ giả lập để demo · không trừ tiền thật</p>}

      <div className="vq-body">
        <div className="vq-qr">
          {tt.paymentUrl ? (
            <MaQR value={tt.paymentUrl} />
          ) : (
            <p className="vq-muted">Không có link thanh toán.</p>
          )}
          <div className="vq-amount">{dinhDangTien(tt.amount)}</div>
          {giay !== null && (
            <div className={`vq-timer ${giay < 120 ? 'warn' : ''}`}>
              {hetGio ? 'Đã hết thời gian' : <>Mã hết hạn sau <strong>{mmss(giay)}</strong></>}
            </div>
          )}
        </div>

        <div className="vq-steps">
          {giaLap ? (
            <ol>
              <li>Quét mã QR bằng điện thoại, hoặc bấm <strong>Mở cổng thanh toán trên máy này</strong>.</li>
              <li>Trên trang cổng giả lập, bấm <strong>Thanh toán thành công</strong> (hoặc Huỷ giao dịch để thử trường hợp thất bại).</li>
              <li>Giữ nguyên trang này. Màn hình tự chuyển sang <strong>Thanh toán thành công</strong> sau vài giây.</li>
            </ol>
          ) : (
            <ol>
              <li>Mở camera điện thoại, quét mã QR bên cạnh.</li>
              <li>Trang VNPay mở trên điện thoại: chọn <strong>Thẻ nội địa</strong>, ngân hàng <strong>NCB</strong>.</li>
              <li>Nhập thông tin thẻ test và mã OTP (lấy ở trang demo của VNPay Sandbox).</li>
              <li>Giữ nguyên trang này. Khi VNPay xác nhận, màn hình tự chuyển sang <strong>Thanh toán thành công</strong>.</li>
            </ol>
          )}

          <div className="vq-waiting"><i /> Đang chờ thanh toán...</div>
          {thongBao && <p className="vq-note">{thongBao}</p>}

          <div className="vq-actions left">
            <button type="button" className="vq-btn primary" onClick={toiDaThanhToan} disabled={dangKiemTra}>
              {dangKiemTra ? 'Đang kiểm tra...' : 'Tôi đã thanh toán'}
            </button>
            {tt.paymentUrl && (
              <a className="vq-btn" href={tt.paymentUrl} target="_blank" rel="noopener noreferrer">
                {giaLap ? 'Mở cổng thanh toán trên máy này' : 'Mở VNPay trên máy này'}
              </a>
            )}
          </div>
          <p className="vq-hint">
            {giaLap
              ? 'Muốn quét bằng điện thoại: đặt PAYMENT_MOCK_BASE_URL là địa chỉ IP của máy tính trong cùng Wi-Fi (VD http://192.168.1.5:3000), vì điện thoại không mở được localhost.'
              : 'Sau khi trả tiền trên điện thoại, trình duyệt điện thoại có thể báo không mở được trang quay về (vì địa chỉ là localhost của máy tính). Điều này không ảnh hưởng: giao dịch vẫn được ghi nhận ở đây.'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default VnpayQrPayment;
