import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { cartService } from '../../services/cartService';
import { productService } from '../../services/productService';
import { dinhDangTien } from '../../services/request';
import type { ChiTietSanPham } from '../../types/cart';

export function ProductDetailPage() {
  const { id } = useParams();
  const [sp, setSp] = useState<ChiTietSanPham | null>(null);
  const [loi, setLoi] = useState('');
  const [thongBao, setThongBao] = useState('');
  const [mau, setMau] = useState('');
  const [size, setSize] = useState<number | null>(null);
  const [soLuong, setSoLuong] = useState(1);

  useEffect(() => {
    if (!id) return;
    productService
      .layChiTiet(id)
      .then((data) => {
        setSp(data);
        setMau(data.variants[0]?.color ?? '');
      })
      .catch((e: Error) => setLoi(e.message));
  }, [id]);

  const cacMau = useMemo(() => [...new Set(sp?.variants.map((v) => v.color) ?? [])], [sp]);
  const cacSize = useMemo(() => sp?.variants.filter((v) => v.color === mau) ?? [], [sp, mau]);
  const bienThe = cacSize.find((v) => v.size === size) ?? null;

  const themVaoGio = async () => {
    if (!bienThe) return;
    setLoi('');
    setThongBao('');
    try {
      await cartService.them(bienThe.id, soLuong);
      setThongBao('Đã thêm vào giỏ hàng');
    } catch (e) {
      setLoi((e as Error).message);
    }
  };

  if (!sp) return <div className="noi-dung">{loi ? <p style={{ color: '#b91c1c' }}>{loi}</p> : 'Đang tải...'}</div>;

  const gia = bienThe?.price ?? sp.basePrice;
  const hetHang = bienThe !== null && bienThe.stock === 0;

  return (
    <div className="noi-dung">
      <Link to="/">← Quay lại cửa hàng</Link>
      <h2>{sp.name}</h2>
      {sp.category && <p>Danh mục: {sp.category.name}</p>}
      {sp.description && <p>{sp.description}</p>}
      <h3>{dinhDangTien(gia)}</h3>

      <p><strong>Màu</strong></p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {cacMau.map((m) => (
          <button key={m} onClick={() => { setMau(m); setSize(null); }}
            style={{ fontWeight: m === mau ? 700 : 400 }}>{m}</button>
        ))}
      </div>

      <p><strong>Size</strong></p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {cacSize.map((v) => (
          <button key={v.id} disabled={v.stock === 0} onClick={() => setSize(v.size)}
            style={{ fontWeight: v.size === size ? 700 : 400 }}>{v.size}</button>
        ))}
      </div>
      {bienThe && <p>{hetHang ? 'Hết hàng' : `Còn ${bienThe.stock} sản phẩm`}</p>}

      <p>
        Số lượng:{' '}
        <input type="number" min={1} max={bienThe?.stock ?? 1} value={soLuong}
          onChange={(e) => setSoLuong(Math.max(1, Number(e.target.value) || 1))} style={{ width: 70 }} />
      </p>
      <button disabled={!bienThe || hetHang} onClick={themVaoGio}>Thêm vào giỏ</button>
      {thongBao && <p style={{ color: '#15803d' }}>{thongBao} — <Link to="/cart">Xem giỏ hàng</Link></p>}
      {loi && <p style={{ color: '#b91c1c' }}>{loi}</p>}
    </div>
  );
}
