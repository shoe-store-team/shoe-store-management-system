import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cartService } from '../../services/cartService';
import { customerService } from '../../services/customerService';
import { orderService } from '../../services/orderService';
import type { DonHangMoi } from '../../services/orderService';
import { paymentService } from '../../services/paymentService';
import { promotionService } from '../../services/promotionService';
import { dinhDangTien } from '../../services/request';
import type { GioHang } from '../../types/cart';
import type { PaymentConfig, PaymentMethod } from '../../types/payment';
import type { KetQuaMaGiam } from '../../types/promotion';
import './checkout.css';

// Thiết kế chỉ có 2 tỉnh và 2 quận. Mở rộng danh sách tại đây khi cần.
const TINH = ['Hồ Chí Minh', 'Hà Nội'];
const HUYEN = ['Quận 1', 'Quận 3'];

type DiaChi = {
  id: string;
  recipientName: string;
  phone: string;
  addressLine: string;
  ward?: string | null;
  district?: string | null;
  province?: string | null;
  isDefault?: boolean;
};
type Form = { hoTen: string; sdt: string; diaChi: string; huyen: string; tinh: string };

// customerService.getAddresses chưa có kiểu: chấp nhận cả [] lẫn { addresses: [] }
const layDanhSach = (r: unknown): DiaChi[] =>
  Array.isArray(r) ? r : ((r as { addresses?: DiaChi[] })?.addresses ?? []);

const cacLuaChon = (ds: string[], giaTri: string) => (giaTri && !ds.includes(giaTri) ? [giaTri, ...ds] : ds);

export function CheckoutPage() {
  const dieuHuong = useNavigate();
  const { state } = useLocation();
  const maGiam: string | undefined = state?.promotionCode; // CartPage truyền sang

  const [gio, setGio] = useState<GioHang | null>(null);
  const [cauHinh, setCauHinh] = useState<PaymentConfig | null>(null);
  const [form, setForm] = useState<Form>({ hoTen: '', sdt: '', diaChi: '', huyen: HUYEN[0], tinh: TINH[0] });
  const [giam, setGiam] = useState<KetQuaMaGiam | null>(null);
  const [pttt, setPttt] = useState<PaymentMethod>('COD');
  const [loi, setLoi] = useState('');
  const [dangXuLy, setDangXuLy] = useState(false);
  // Đơn đã tạo: nếu bước thanh toán lỗi, bấm "Đặt hàng" lại sẽ dùng CHÍNH đơn này (không tạo đơn thứ hai)
  const [don, setDon] = useState<DonHangMoi | null>(null);

  useEffect(() => {
    let huy = false;
    (async () => {
      try {
        const [g, raw, ch] = await Promise.all([
          cartService.layGioHang(),
          customerService.getAddresses().catch(() => []),
          paymentService.layCauHinh().catch(() => null),
        ]);
        if (huy) return;
        setGio(g);
        setCauHinh(ch);
        // Điền sẵn từ địa chỉ mặc định đã lưu (nếu có)
        const ds = layDanhSach(raw);
        const d = ds.find((x) => x.isDefault) ?? ds[0];
        if (d)
          setForm({
            hoTen: d.recipientName,
            sdt: d.phone,
            diaChi: [d.addressLine, d.ward].filter(Boolean).join(', '),
            huyen: d.district ?? HUYEN[0],
            tinh: d.province ?? TINH[0],
          });
        if (maGiam) {
          try { const k = await promotionService.kiemTraMa(maGiam); if (!huy) setGiam(k); }
          catch { /* mã hết hiệu lực: bỏ qua, đặt hàng không kèm mã */ }
        }
      } catch (e) {
        if (!huy) setLoi((e as Error).message);
      }
    })();
    return () => { huy = true; };
  }, [maGiam]);

  const dat = (k: keyof Form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function kiemTra() {
    if (form.hoTen.trim().length < 2) return 'Vui lòng nhập họ và tên.';
    if (!/^[0-9+\s]{8,15}$/.test(form.sdt.trim())) return 'Số điện thoại không hợp lệ.';
    if (form.diaChi.trim().length < 5) return 'Vui lòng nhập địa chỉ giao hàng.';
    return '';
  }

  async function datHang() {
    const loiNhap = don ? '' : kiemTra();
    if (loiNhap) { setLoi(loiNhap); return; }
    setDangXuLy(true);
    setLoi('');
    let donHienTai = don;
    try {
      donHienTai =
        don ??
        (await orderService.taoDon({
          recipientName: form.hoTen.trim(),
          phone: form.sdt.trim(),
          shippingAddress: [form.diaChi.trim(), form.huyen, form.tinh].join(', '),
          promotionCode: giam?.code,
        }));
      setDon(donHienTai);
      const tt = await paymentService.taoThanhToan({ orderId: donHienTai.id, method: pttt });
      if (tt.paymentUrl) {
        window.location.assign(tt.paymentUrl); // sang VNPay, giữ trạng thái "đang xử lý"
        return;
      }
      dieuHuong(`/payment/result?reference=${tt.reference}`, { replace: true }); // COD / mock / đơn 0đ
    } catch (e) {
      const them = donHienTai ? ` (Đơn #${donHienTai.code} đã được tạo, bấm “Đặt hàng” để thử lại.)` : '';
      setLoi((e as Error).message + them);
      setDangXuLy(false);
    }
  }

  if (!gio) return <div className="co-page">{loi ? <p className="voucher-error">{loi}</p> : 'Đang tải...'}</div>;

  const khongDatDuoc = gio.items.length === 0 || gio.items.some((i) => !i.available);
  const giamGia = giam?.discountAmount ?? 0;
  const tong = giam ? giam.total : gio.subtotal;
  const trucTuyenDuoc = cauHinh?.configured ?? false;
  const khoa = !!don; // đã tạo đơn: thông tin giao hàng được chốt

  return (
    <div className="co-page">
      <Link to="/cart" className="back-link">← Quay lại giỏ hàng</Link>
      <div className="checkout-head">
        <p className="section-kicker">BƯỚC CUỐI CÙNG</p>
        <h1>Thanh toán</h1>
      </div>

      <div className="checkout-grid">
        <section className="form-panel">
          <h2>Thông tin giao hàng</h2>
          <div className="form-grid">
            <label>Họ và tên
              <input disabled={khoa} placeholder="Nguyễn Văn An" value={form.hoTen} onChange={dat('hoTen')} />
            </label>
            <label>Số điện thoại
              <input disabled={khoa} placeholder="090 123 4567" value={form.sdt} onChange={dat('sdt')} />
            </label>
            <label className="full">Địa chỉ
              <input disabled={khoa} placeholder="Số nhà, tên đường" value={form.diaChi} onChange={dat('diaChi')} />
            </label>
            <label>Tỉnh / Thành phố
              <select disabled={khoa} value={form.tinh} onChange={dat('tinh')}>
                {cacLuaChon(TINH, form.tinh).map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
            <label>Quận / Huyện
              <select disabled={khoa} value={form.huyen} onChange={dat('huyen')}>
                {cacLuaChon(HUYEN, form.huyen).map((h) => <option key={h}>{h}</option>)}
              </select>
            </label>
          </div>

          <h2>Phương thức thanh toán</h2>
          <label className="payment-choice">
            <input type="radio" name="pay" checked={pttt === 'COD'} onChange={() => setPttt('COD')} />
            <span>
              <strong>Thanh toán khi nhận hàng</strong>
              <small>Thanh toán tiền mặt cho đơn vị vận chuyển</small>
            </span>
          </label>
          <label className="payment-choice">
            <input type="radio" name="pay" disabled={!trucTuyenDuoc} checked={pttt === 'VNPAY'} onChange={() => setPttt('VNPAY')} />
            <span>
              <strong>Thanh toán trực tuyến</strong>
              <small>Qua cổng thanh toán Sandbox{trucTuyenDuoc ? '' : ' (chưa khả dụng)'}</small>
            </span>
          </label>
        </section>

        <aside className="summary checkout-summary">
          <h2>Đơn hàng của bạn</h2>
          {gio.items.map((i) => (
            <div className="summary-product" key={i.id}>
              {i.imageUrl ? <img src={i.imageUrl} alt={i.productName} /> : <div className="ph" />}
              <span>
                <strong>{i.productName}</strong>
                <small>{i.color} · {i.size} · SL {i.quantity}</small>
              </span>
            </div>
          ))}
          <div className="sum-row"><span>Tạm tính</span><strong>{dinhDangTien(gio.subtotal)}</strong></div>
          <div className="sum-row"><span>Phí vận chuyển</span><strong>Miễn phí</strong></div>
          {giamGia > 0 && <div className="sum-row discount"><span>Giảm giá</span><strong>−{dinhDangTien(giamGia)}</strong></div>}
          <div className="sum-total"><span>Tổng cộng</span><strong>{dinhDangTien(tong)}</strong></div>

          {gio.items.length === 0 && !don && <p className="voucher-error">Giỏ hàng đang trống. <Link to="/cart">Về giỏ hàng</Link></p>}
          {gio.items.some((i) => !i.available) && !don && (
            <p className="voucher-error">Giỏ hàng có sản phẩm không còn khả dụng. <Link to="/cart">Quay lại giỏ hàng</Link> để xử lý.</p>
          )}
          {loi && <p className="voucher-error">{loi}</p>}

          <button className="checkout-button" disabled={dangXuLy || (khongDatDuoc && !don)} onClick={datHang}>
            {dangXuLy ? 'Đang xử lý...' : 'Đặt hàng'}
          </button>
        </aside>
      </div>
    </div>
  );
}
