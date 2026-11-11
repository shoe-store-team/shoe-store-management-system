import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cartService } from '../../services/cartService';
import { promotionService } from '../../services/promotionService';
import { dinhDangTien } from '../../services/request';
import type { GioHang } from '../../types/cart';
import type { KetQuaMaGiam } from '../../types/promotion';
import './CartPage.css';

export function CartPage() {
  const dieuHuong = useNavigate();
  const [gio, setGio] = useState<GioHang | null>(null);
  const [loi, setLoi] = useState('');
  const [ma, setMa] = useState('');
  const [giam, setGiam] = useState<KetQuaMaGiam | null>(null);
  const [loiMa, setLoiMa] = useState('');

  // Tính lại giảm giá mỗi khi giỏ đổi; mã không còn hợp lệ thì gỡ ra
  const kiemTraLai = useCallback(async (code: string) => {
    try {
      setGiam(await promotionService.kiemTraMa(code));
      setLoiMa('');
    } catch (e) {
      setGiam(null);
      setLoiMa((e as Error).message);
    }
  }, []);

  const capNhatGio = useCallback(
    async (thaoTac: () => Promise<GioHang>) => {
      try {
        setLoi('');
        setGio(await thaoTac());
        if (giam) await kiemTraLai(giam.code);
      } catch (e) {
        setLoi((e as Error).message);
      }
    },
    [giam, kiemTraLai],
  );

  useEffect(() => {
    cartService.layGioHang().then(setGio).catch((e: Error) => setLoi(e.message));
  }, []);

  if (!gio) {
    return (
      <div className="gh-wrap">
        {loi ? <div className="gh-alert gh-alert--loi">{loi}</div> : <div className="gh-dang-tai">Đang tải giỏ hàng...</div>}
      </div>
    );
  }

  const khongThanhToanDuoc = gio.items.length === 0 || gio.items.some((i) => !i.available);
  const coSanPhamLoi = gio.items.some((i) => !i.available);
  const tongCuoi = giam ? giam.total : gio.subtotal;
  const boMa = () => {
    setGiam(null);
    setLoiMa('');
    setMa('');
  };

  return (
    <div className="gh-wrap">
      <h1 className="gh-tieu-de">
        Giỏ hàng <span className="gh-tieu-de__dem">({gio.itemCount} sản phẩm)</span>
      </h1>

      {loi && (
        <div className="gh-alert gh-alert--loi" role="alert">
          {loi}
        </div>
      )}

      {gio.items.length === 0 ? (
        <div className="gh-trong">
          <p>Giỏ hàng của bạn đang trống.</p>
          <Link to="/" className="gh-nut gh-nut--chinh">
            Tiếp tục mua sắm
          </Link>
        </div>
      ) : (
        <div className="gh-grid">
          <ul className="gh-danh-sach">
            {gio.items.map((i) => (
              <li key={i.id} className={`gh-item${i.available ? '' : ' is-loi'}`}>
                <Link to={`/product/${i.productId}`} className="gh-item__anh">
                  {i.imageUrl ? <img src={i.imageUrl} alt={i.productName} /> : <span>Chưa có ảnh</span>}
                </Link>

                <div className="gh-item__thong-tin">
                  <Link to={`/product/${i.productId}`} className="gh-item__ten">
                    {i.productName}
                  </Link>
                  <div className="gh-item__phan-loai">
                    Màu: {i.color} · Size: {i.size}
                  </div>
                  <div className="gh-item__don-gia">{dinhDangTien(i.unitPrice)}</div>
                  {!i.available && (
                    <div className="gh-item__canh-bao" role="alert">
                      {i.unavailableReason === 'INACTIVE'
                        ? 'Sản phẩm đã ngừng bán, vui lòng xóa khỏi giỏ hàng'
                        : `Không đủ tồn kho (còn ${i.stock})`}
                    </div>
                  )}
                </div>

                <div className="gh-item__thao-tac">
                  <div className="gh-so-luong">
                    <button
                      type="button"
                      aria-label="Giảm số lượng"
                      disabled={i.quantity <= 1}
                      onClick={() => capNhatGio(() => cartService.capNhatSoLuong(i.id, i.quantity - 1))}
                    >
                      −
                    </button>
                    <span>{i.quantity}</span>
                    <button
                      type="button"
                      aria-label="Tăng số lượng"
                      disabled={i.quantity >= i.stock}
                      onClick={() => capNhatGio(() => cartService.capNhatSoLuong(i.id, i.quantity + 1))}
                    >
                      +
                    </button>
                  </div>
                  <div className="gh-item__thanh-tien">{dinhDangTien(i.lineTotal)}</div>
                  <button type="button" className="gh-xoa" onClick={() => capNhatGio(() => cartService.xoa(i.id))}>
                    Xóa
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <aside className="gh-tong-ket">
            <h2>Tóm tắt đơn hàng</h2>

            <div className="gh-ma">
              <label htmlFor="gh-ma-giam">Mã giảm giá</label>
              <div className="gh-ma__hang">
                <input
                  id="gh-ma-giam"
                  placeholder="Nhập mã"
                  value={ma}
                  onChange={(e) => setMa(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && ma.trim()) kiemTraLai(ma);
                  }}
                />
                {giam ? (
                  <button type="button" className="gh-nut" onClick={boMa}>
                    Bỏ mã
                  </button>
                ) : (
                  <button type="button" className="gh-nut gh-nut--chinh" disabled={!ma.trim()} onClick={() => kiemTraLai(ma)}>
                    Áp dụng
                  </button>
                )}
              </div>
              {giam && <div className="gh-ma__ok">Đã áp dụng mã {giam.code}</div>}
              {loiMa && <div className="gh-ma__loi">{loiMa}</div>}
            </div>

      <div style={{ marginTop: 16, textAlign: 'right' }}>
        <p>Tạm tính (trước giảm giá): {dinhDangTien(gio.subtotal)}</p>
        {giam && <p style={{ color: '#15803d' }}>Mã {giam.code}: −{dinhDangTien(giam.discountAmount)}</p>}
        <h3>Tổng dự kiến: {dinhDangTien(tongCuoi)}</h3>
        <button
          disabled={khongThanhToanDuoc}
          onClick={() => dieuHuong('/checkout', { state: { promotionCode: giam?.code } })}
        >
          Tiến hành thanh toán
        </button>
      </div>
    </div>
  );
}
