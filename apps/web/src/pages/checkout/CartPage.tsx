import { useCallback, useEffect, useState } from 'react';
import { cartService } from '../../services/cartService';
import { promotionService } from '../../services/promotionService';
import { dinhDangTien } from '../../services/request';
import type { GioHang } from '../../types/cart';
import type { KetQuaMaGiam } from '../../types/promotion';

export function CartPage() {
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

  if (!gio) return <div className="noi-dung">{loi ? <p style={{ color: '#b91c1c' }}>{loi}</p> : 'Đang tải...'}</div>;

  const khongThanhToanDuoc = gio.items.length === 0 || gio.items.some((i) => !i.available);
  const tongCuoi = giam ? giam.total : gio.subtotal;

  return (
    <div className="noi-dung">
      <h2>Giỏ hàng</h2>
      {loi && <p style={{ color: '#b91c1c' }}>{loi}</p>}
      {gio.items.length === 0 ? (
        <p>Giỏ hàng đang trống.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr><th align="left">Sản phẩm</th><th>Size</th><th>Màu</th><th>Đơn giá</th><th>Số lượng</th><th>Thành tiền</th><th /></tr>
          </thead>
          <tbody>
            {gio.items.map((i) => (
              <tr key={i.id} style={{ borderTop: '1px solid #ddd', textAlign: 'center' }}>
                <td align="left">
                  {i.productName}
                  {!i.available && <div style={{ color: '#b91c1c', fontSize: 12 }}>Hết hàng hoặc không đủ tồn kho (còn {i.stock})</div>}
                </td>
                <td>{i.size}</td>
                <td>{i.color}</td>
                <td>{dinhDangTien(i.unitPrice)}</td>
                <td>
                  <button disabled={i.quantity <= 1} onClick={() => capNhatGio(() => cartService.capNhatSoLuong(i.id, i.quantity - 1))}>−</button>
                  {' '}{i.quantity}{' '}
                  <button disabled={i.quantity >= i.stock} onClick={() => capNhatGio(() => cartService.capNhatSoLuong(i.id, i.quantity + 1))}>+</button>
                </td>
                <td>{dinhDangTien(i.lineTotal)}</td>
                <td><button onClick={() => capNhatGio(() => cartService.xoa(i.id))}>Xóa</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ marginTop: 24 }}>
        <input placeholder="Mã giảm giá" value={ma} onChange={(e) => setMa(e.target.value)} />{' '}
        <button disabled={!ma.trim() || gio.items.length === 0} onClick={() => kiemTraLai(ma)}>Áp dụng</button>
        {loiMa && <p style={{ color: '#b91c1c' }}>{loiMa}</p>}
      </div>

      <div style={{ marginTop: 16, textAlign: 'right' }}>
        <p>Tạm tính: {dinhDangTien(gio.subtotal)}</p>
        {giam && <p style={{ color: '#15803d' }}>Mã {giam.code}: −{dinhDangTien(giam.discountAmount)}</p>}
        <h3>Tổng cộng: {dinhDangTien(tongCuoi)}</h3>
        {/* Người 4 nối trang thanh toán ở đây (gửi kèm mã giảm giá đang áp dụng) */}
        <button disabled={khongThanhToanDuoc}>Tiến hành thanh toán</button>
      </div>
    </div>
  );
}
