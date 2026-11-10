import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerService } from '../../services/customerService';
import { orderService } from '../../services/orderService';
import type { DonHangCuaToi } from '../../services/orderService';
import { dinhDangTien } from '../../services/request';
import { PayButton } from '../checkout/PayButton';
import '../checkout/checkout.css';

type Loc = 'ALL' | 'PENDING_PAYMENT' | 'PROCESSING' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED';
type Kind = 'pending' | 'paid' | 'processing' | 'shipping' | 'cancelled';
type HienThi = { loc: Exclude<Loc, 'ALL'>; label: string; kind: Kind; note: string; buoc: number };

const BO_LOC: [Loc, string][] = [
  ['ALL', 'Tất cả'],
  ['PENDING_PAYMENT', 'Chờ thanh toán'],
  ['PROCESSING', 'Đang xử lý'],
  ['SHIPPING', 'Đang giao'],
  ['DELIVERED', 'Đã giao'],
  ['CANCELLED', 'Đã hủy'],
];
const CAC_BUOC = ['Đã đặt hàng', 'Đã thanh toán', 'Đang xử lý', 'Đang giao', 'Đã giao'];

/** Quy (status, paymentStatus) của backend về bộ trạng thái của thiết kế (nhãn + ghi chú giữ nguyên). */
function hienThi(o: DonHangCuaToi): HienThi {
  switch (o.status) {
    case 'CANCELLED': return { loc: 'CANCELLED', label: 'Đã hủy', kind: 'cancelled', note: 'Đơn hàng đã được hủy', buoc: -1 };
    case 'DELIVERED': return { loc: 'DELIVERED', label: 'Đã giao', kind: 'paid', note: 'Giao hàng thành công', buoc: 4 };
    case 'SHIPPED': return { loc: 'SHIPPING', label: 'Đang giao', kind: 'shipping', note: 'Đơn hàng đang trên đường đến bạn', buoc: 3 };
    case 'PROCESSING': return { loc: 'PROCESSING', label: 'Đang xử lý', kind: 'processing', note: 'Cửa hàng đang chuẩn bị sản phẩm', buoc: 2 };
    case 'CONFIRMED':
      return o.paymentStatus === 'PAID'
        ? { loc: 'PROCESSING', label: 'Đã thanh toán', kind: 'paid', note: 'Thanh toán đã được xác nhận', buoc: 1 }
        : { loc: 'PROCESSING', label: 'Đang xử lý', kind: 'processing', note: 'Thanh toán khi nhận hàng', buoc: 0 }; // COD
    default:
      return o.paymentStatus === 'FAILED'
        ? { loc: 'PENDING_PAYMENT', label: 'Thanh toán thất bại', kind: 'cancelled', note: 'Giao dịch không thành công', buoc: 0 }
        : { loc: 'PENDING_PAYMENT', label: 'Chờ thanh toán', kind: 'pending', note: 'Vui lòng thanh toán trong 30 phút', buoc: 0 };
  }
}

const ngay = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');
const bienThe = (i: DonHangCuaToi['items'][number]) => `${i.color} · Size ${i.size}`;
const cachThanhToan = (m: DonHangCuaToi['paymentMethod']) =>
  m === 'COD' ? 'Thanh toán khi nhận hàng' : m ? 'Thanh toán trực tuyến · Sandbox' : 'Chưa chọn phương thức';

const Anh = ({ src, alt }: { src: string | null; alt: string }) => (src ? <img src={src} alt={alt} /> : <div className="ph" />);
const MuiTen = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export function OrderHistoryPage() {
  const dieuHuong = useNavigate();
  const [ds, setDs] = useState<DonHangCuaToi[] | null>(null);
  const [ten, setTen] = useState('');
  const [loc, setLoc] = useState<Loc>('ALL');
  const [chon, setChon] = useState<string | null>(null);
  const [loi, setLoi] = useState('');

  const tai = useCallback(() => {
    orderService.layDonCuaToi().then(setDs).catch((e: Error) => setLoi(e.message));
  }, []);
  useEffect(tai, [tai]);
  useEffect(() => {
    customerService.getProfile().then((p: { name?: string }) => setTen(p?.name ?? '')).catch(() => undefined);
  }, []);

  async function huy(id: string) {
    if (!window.confirm('Bạn chắc chắn muốn hủy đơn hàng này?')) return;
    try {
      setLoi('');
      await orderService.huyDon(id);
      tai();
    } catch (e) {
      setLoi((e as Error).message);
    }
  }

  function dangXuat() {
    localStorage.removeItem('token');
    window.location.assign('/login'); // tải lại trang để các store đọc lại trạng thái đăng nhập
  }

  const donChon = ds?.find((o) => o.id === chon) ?? null;

  return (
    <div className="co-page">
      <div className="account-top">
        <div>
          <p className="section-kicker">TÀI KHOẢN CỦA TÔI</p>
          <h1>Xin chào, {ten || 'bạn'}</h1>
        </div>
        <button onClick={dangXuat}>Đăng xuất</button>
      </div>

      <div className="account-grid">
        <aside>
          <button className="active">Đơn hàng của tôi</button>
          <button onClick={() => dieuHuong('/profile')}>Hồ sơ cá nhân</button>
          <button onClick={() => dieuHuong('/profile')}>Sổ địa chỉ</button>
          <button>Ưu đãi của tôi</button>
        </aside>

        <section>
          {loi && <p className="voucher-error">{loi}</p>}
          {!ds ? (
            !loi && <p className="muted">Đang tải...</p>
          ) : donChon ? (
            <ChiTietDon don={donChon} onBack={() => setChon(null)} onCancel={() => huy(donChon.id)} />
          ) : (
            <>
              <div className="order-list-head">
                <h2>Lịch sử đơn hàng</h2>
                <span>{ds.length} đơn hàng</span>
              </div>
              <div className="order-filters">
                {BO_LOC.map(([ma, nhan]) => (
                  <button key={ma} className={loc === ma ? 'active' : ''} onClick={() => setLoc(ma)}>{nhan}</button>
                ))}
              </div>
              <div className="customer-orders">
                {ds.length === 0 && <p className="muted">Chưa có đơn hàng nào.</p>}
                {ds.filter((o) => loc === 'ALL' || hienThi(o).loc === loc).map((o) => {
                  const st = hienThi(o);
                  const dau = o.items[0];
                  const them = o.items.length - 1;
                  return (
                    <article className="order-card" key={o.id}>
                      <div className="order-card-head">
                        <div>
                          <strong>#{o.code}</strong>
                          <span>Đặt ngày {ngay(o.createdAt)}</span>
                        </div>
                        <span className={`status ${st.kind}`}><i />{st.label}</span>
                      </div>
                      <div className="order-card-body">
                        <Anh src={dau?.imageUrl ?? null} alt={dau?.productName ?? ''} />
                        <div>
                          <strong>{dau?.productName}</strong>
                          <span>{dau && bienThe(dau)} · Số lượng {dau?.quantity}{them > 0 ? ` · +${them} sản phẩm khác` : ''}</span>
                          <small>{st.note}</small>
                        </div>
                        <strong>{dinhDangTien(o.totalAmount)}</strong>
                      </div>
                      <div className="order-card-foot">
                        {o.status === 'PENDING' && o.paymentStatus !== 'FAILED' && (
                          <PayButton orderId={o.id} label="Thanh toán ngay" className="pay-button" />
                        )}
                        <button onClick={() => setChon(o.id)}>Xem chi tiết <MuiTen /></button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function ChiTietDon({ don, onBack, onCancel }: { don: DonHangCuaToi; onBack: () => void; onCancel: () => void }) {
  const st = hienThi(don);
  const thanhToanLai = don.status === 'PENDING' && don.paymentStatus !== 'PAID'; // chờ thanh toán / thất bại
  // Backend hiện chỉ cho hủy đơn chưa thanh toán (đơn đã trả tiền cần hoàn tiền, chưa hỗ trợ)
  const choHuy = don.status === 'PENDING' && don.paymentStatus !== 'PAID';

  return (
    <div className="order-detail">
      <button className="back-link" onClick={onBack}>← Quay lại danh sách</button>
      <div className="order-detail-head">
        <div>
          <span>ĐƠN HÀNG</span>
          <h2>#{don.code}</h2>
          <small>Đặt ngày {ngay(don.createdAt)}</small>
        </div>
        <span className={`status ${st.kind}`}><i />{st.label}</span>
      </div>

      {don.status === 'CANCELLED' ? (
        <div className="cancel-note">
          <strong>Đơn hàng đã hủy</strong>
          <span>Đơn này không còn được tiếp tục xử lý.</span>
        </div>
      ) : (
        <div className="order-timeline">
          {CAC_BUOC.map((b, idx) => (
            <div key={b} className={idx <= st.buoc ? 'done' : ''}>
              <i>{idx < st.buoc ? '✓' : idx + 1}</i>
              <span>{b}</span>
            </div>
          ))}
        </div>
      )}

      <div className="order-detail-grid">
        <div>
          <h3>Sản phẩm</h3>
          {don.items.map((i) => (
            <div className="detail-order-product" key={i.id}>
              <Anh src={i.imageUrl} alt={i.productName} />
              <span>
                <strong>{i.productName}</strong>
                <small>{bienThe(i)}</small>
                <small>Số lượng: {i.quantity}</small>
              </span>
              <strong>{dinhDangTien(i.price * i.quantity)}</strong>
            </div>
          ))}
        </div>
        <div>
          <h3>Thông tin nhận hàng</h3>
          <p>
            <strong>{don.recipientName}</strong><br />
            {don.phone}<br />
            {don.shippingAddress}
          </p>
        </div>
      </div>

      <div className="order-payment">
        <div><span>Phương thức thanh toán</span><strong>{cachThanhToan(don.paymentMethod)}</strong></div>
        <div><span>Tổng thanh toán</span><strong>{dinhDangTien(don.totalAmount)}</strong></div>
      </div>

      <div className="order-detail-actions">
        {thanhToanLai && <PayButton orderId={don.id} label="Thanh toán lại" className="pay-button" />}
        {choHuy && <button className="cancel-button" onClick={onCancel}>Hủy đơn hàng</button>}
        <button>Liên hệ hỗ trợ</button>
      </div>
    </div>
  );
}
