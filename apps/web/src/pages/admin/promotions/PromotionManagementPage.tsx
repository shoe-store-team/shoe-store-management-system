import { useCallback, useEffect, useState } from 'react';
import { promotionService } from '../../../services/promotionService';
import type { KhuyenMai, LoaiGiam } from '../../../types/promotion';

const formTrong = {
  code: '', name: '', discountType: 'PERCENTAGE' as LoaiGiam, discountValue: '',
  maxDiscount: '', minOrderAmount: '', startsAt: '', endsAt: '', usageLimit: '',
};

export function PromotionManagementPage() {
  const [ds, setDs] = useState<KhuyenMai[]>([]);
  const [form, setForm] = useState(formTrong);
  const [loi, setLoi] = useState('');

  const taiLai = useCallback(() => {
    promotionService.layTatCa().then(setDs).catch((e: Error) => setLoi(e.message));
  }, []);
  useEffect(taiLai, [taiLai]);

  const dat = (k: keyof typeof formTrong, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const tao = async () => {
    setLoi('');
    try {
      await promotionService.tao({
        code: form.code,
        name: form.name,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : null,
        minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : 0,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : '',
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : '',
        usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
      });
      setForm(formTrong);
      taiLai();
    } catch (e) {
      setLoi((e as Error).message);
    }
  };

  const batTat = async (k: KhuyenMai) => {
    try {
      await promotionService.capNhat(k.id, { isActive: !k.isActive });
      taiLai();
    } catch (e) {
      setLoi((e as Error).message);
    }
  };

  return (
    <div className="noi-dung">
      <h2>Quản lý khuyến mãi</h2>
      {loi && <p style={{ color: '#b91c1c' }}>{loi}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, marginBottom: 16 }}>
        <input placeholder="Mã (VD: GIAM10)" value={form.code} onChange={(e) => dat('code', e.target.value)} />
        <input placeholder="Tên chương trình" value={form.name} onChange={(e) => dat('name', e.target.value)} />
        <select value={form.discountType} onChange={(e) => dat('discountType', e.target.value)}>
          <option value="PERCENTAGE">Giảm theo %</option>
          <option value="FIXED_AMOUNT">Giảm số tiền</option>
        </select>
        <input type="number" placeholder="Giá trị giảm" value={form.discountValue} onChange={(e) => dat('discountValue', e.target.value)} />
        <input type="number" placeholder="Giảm tối đa (chỉ với %)" value={form.maxDiscount} onChange={(e) => dat('maxDiscount', e.target.value)} />
        <input type="number" placeholder="Đơn tối thiểu" value={form.minOrderAmount} onChange={(e) => dat('minOrderAmount', e.target.value)} />
        <input type="datetime-local" value={form.startsAt} onChange={(e) => dat('startsAt', e.target.value)} />
        <input type="datetime-local" value={form.endsAt} onChange={(e) => dat('endsAt', e.target.value)} />
        <input type="number" placeholder="Giới hạn lượt dùng" value={form.usageLimit} onChange={(e) => dat('usageLimit', e.target.value)} />
        <button onClick={tao}>Thêm khuyến mãi</button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr><th align="left">Mã</th><th align="left">Tên</th><th>Giảm</th><th>Hiệu lực</th><th>Đã dùng</th><th>Trạng thái</th></tr>
        </thead>
        <tbody>
          {ds.map((k) => (
            <tr key={k.id} style={{ borderTop: '1px solid #ddd', textAlign: 'center' }}>
              <td align="left">{k.code}</td>
              <td align="left">{k.name}</td>
              <td>{k.discountType === 'PERCENTAGE' ? `${Number(k.discountValue)}%` : `${Number(k.discountValue).toLocaleString('vi-VN')}đ`}</td>
              <td>{new Date(k.startsAt).toLocaleDateString('vi-VN')} – {new Date(k.endsAt).toLocaleDateString('vi-VN')}</td>
              <td>{k.usageCount}{k.usageLimit !== null ? `/${k.usageLimit}` : ''}</td>
              <td><button onClick={() => batTat(k)}>{k.isActive ? 'Đang bật' : 'Đã tắt'}</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
