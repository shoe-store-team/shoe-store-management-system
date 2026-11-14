import { useCallback, useEffect, useState } from 'react';
import { dashboardService } from '../../services/dashboardService';
import { dinhDangTien } from '../../services/request';
import type { DashboardSummary } from '../../types/dashboard';
import './dashboard.css';

/**
 * Dashboard quản trị (M6). Mọi số liệu lấy từ GET /api/dashboard/summary (database thật).
 * App.tsx của nhóm import { Page as DashboardPage }, nên file export cả `Page` lẫn `DashboardPage`.
 */

type TrangThai =
  | { loai: 'dang-tai' }
  | { loai: 'loi'; thongBao: string }
  | { loai: 'xong'; data: DashboardSummary };

const TEN_TRANG_THAI: Record<string, string> = {
  PENDING: 'Chờ xử lý',
  CONFIRMED: 'Đã xác nhận',
  PROCESSING: 'Đang chuẩn bị',
  SHIPPED: 'Đang giao',
  DELIVERED: 'Hoàn tất',
  CANCELLED: 'Đã huỷ',
};
const TEN_GD: Record<string, string> = { PAID: 'Thành công', PENDING: 'Đang chờ', FAILED: 'Thất bại', REFUNDED: 'Đã hoàn' };
const KHOANG = [7, 30, 90] as const;

const phanTram = (x: number) => `${(x * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`;
const so = (x: number) => x.toLocaleString('vi-VN');
const ngayNgan = (ymd: string) => `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}`;
/** YYYY-MM-DD theo giờ Việt Nam */
const homNayVN = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
const truNgay = (ymd: string, n: number) =>
  new Date(new Date(`${ymd}T00:00:00Z`).getTime() - n * 86_400_000).toISOString().slice(0, 10);

export function DashboardPage() {
  const [soNgay, setSoNgay] = useState<number>(30);
  const [den, setDen] = useState(homNayVN());
  const [trangThai, setTrangThai] = useState<TrangThai>({ loai: 'dang-tai' });

  const tai = useCallback(
    async (daHuy: () => boolean) => {
      setTrangThai({ loai: 'dang-tai' });
      try {
        const data = await dashboardService.layTongQuan({ from: truNgay(den, soNgay - 1), to: den });
        if (!daHuy()) setTrangThai({ loai: 'xong', data });
      } catch (e) {
        if (!daHuy()) setTrangThai({ loai: 'loi', thongBao: (e as Error).message });
      }
    },
    [den, soNgay],
  );

  useEffect(() => {
    let huy = false;
    void tai(() => huy);
    return () => { huy = true; };
  }, [tai]);

  return (
    <div className="db-page">
      <div className="db-head">
        <div>
          <h1>Tổng quan cửa hàng</h1>
          <p>
            {trangThai.loai === 'xong'
              ? `Từ ${ngayNgan(trangThai.data.range.from)} đến ${ngayNgan(trangThai.data.range.to)} · cập nhật ${new Date(trangThai.data.generatedAt).toLocaleTimeString('vi-VN')}`
              : 'Số liệu lấy trực tiếp từ database'}
          </p>
        </div>
        <div className="db-filters">
          {KHOANG.map((n) => (
            <button key={n} className={soNgay === n ? 'on' : ''} onClick={() => setSoNgay(n)}>{n} ngày</button>
          ))}
          <label>
            đến{' '}
            <input type="date" value={den} max={homNayVN()} onChange={(e) => e.target.value && setDen(e.target.value)} />
          </label>
          <button onClick={() => void tai(() => false)}>Làm mới</button>
        </div>
      </div>

      {trangThai.loai === 'dang-tai' && <div className="db-card"><p className="db-empty">Đang tải số liệu...</p></div>}
      {trangThai.loai === 'loi' && <div className="db-error">Không tải được thống kê: {trangThai.thongBao}</div>}
      {trangThai.loai === 'xong' && <NoiDung d={trangThai.data} />}
    </div>
  );
}

function NoiDung({ d }: { d: DashboardSummary }) {
  const { kpi } = d;
  const chuaCoDon = kpi.totalOrders === 0 && kpi.revenue === 0;

  return (
    <>
      <div className="db-kpis">
        <Kpi ten="Doanh thu đã thu" giaTri={dinhDangTien(kpi.revenue)} phu={`${so(kpi.paidOrders)} đơn đã thanh toán`} />
        <Kpi ten="Tổng đơn" giaTri={so(kpi.totalOrders)} phu={`${so(kpi.completedOrders)} đơn hoàn tất`} />
        <Kpi ten="Giá trị TB / đơn" giaTri={dinhDangTien(kpi.averageOrderValue)} phu="trên đơn đã thu tiền" />
        <Kpi ten="Tỷ lệ huỷ" giaTri={phanTram(kpi.cancelRate)} phu={`${so(kpi.cancelledOrders)} đơn bị huỷ`} />
        <Kpi ten="COD chờ thu" giaTri={dinhDangTien(kpi.codPendingAmount)} phu={`${so(kpi.codPendingCount)} đơn chưa giao xong`} />
        {kpi.refundRequiredCount > 0 && (
          <Kpi ten="Cần hoàn tiền" giaTri={so(kpi.refundRequiredCount)} phu="đơn huỷ nhưng tiền đã về" canhBao />
        )}
      </div>

      {chuaCoDon && (
        <div className="db-card">
          <p className="db-empty">Chưa có đơn hàng nào trong khoảng thời gian này. Thử chọn 90 ngày hoặc tạo đơn thử.</p>
        </div>
      )}

      <div className="db-grid">
        <div>
          <div className="db-card">
            <h2>Doanh thu đã thu theo ngày</h2>
            <BieuDoDoanhThu rows={d.revenueByDay} />
          </div>

          {d.refundRequired.length > 0 && (
            <div className="db-card">
              <h2 className="db-warn">⚠ Đơn đã huỷ nhưng đã nhận tiền (cần hoàn tiền thủ công)</h2>
              <table className="db-table">
                <thead><tr><th>Mã đơn</th><th>Ngày đặt</th><th className="num">Số tiền</th></tr></thead>
                <tbody>
                  {d.refundRequired.map((r) => (
                    <tr key={r.orderId}>
                      <td>#{r.orderCode}</td>
                      <td>{new Date(r.createdAt).toLocaleDateString('vi-VN')}</td>
                      <td className="num">{dinhDangTien(r.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="db-card">
            <h2>Giao dịch thanh toán</h2>
            {Object.keys(d.paymentsByMethod).length === 0 ? (
              <p className="db-empty">Chưa có giao dịch.</p>
            ) : (
              <table className="db-table">
                <thead>
                  <tr><th>Phương thức</th>{Object.keys(TEN_GD).map((s) => <th key={s} className="num">{TEN_GD[s]}</th>)}</tr>
                </thead>
                <tbody>
                  {Object.entries(d.paymentsByMethod).map(([m, row]) => (
                    <tr key={m}>
                      <td>{m === 'COD' ? 'Thanh toán khi nhận hàng' : m}</td>
                      {Object.keys(TEN_GD).map((s) => <td key={s} className="num">{so(row[s] ?? 0)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div>
          <div className="db-card">
            <h2>Đơn hàng theo trạng thái</h2>
            <DonTheoTrangThai counts={d.ordersByStatus} />
          </div>

          <div className="db-card">
            <h2>Sắp hết hàng (≤ {d.lowStockThreshold})</h2>
            {d.lowStock.length === 0 ? (
              <p className="db-empty">Không có sản phẩm nào sắp hết.</p>
            ) : (
              <table className="db-table">
                <thead><tr><th>Sản phẩm</th><th className="num">Tồn</th></tr></thead>
                <tbody>
                  {d.lowStock.map((v) => (
                    <tr key={v.variantId}>
                      <td>{v.productName || v.variantId.slice(0, 8)}</td>
                      <td className={`num ${v.stock === 0 ? 'db-warn' : ''}`}>{so(v.stock)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function Kpi({ ten, giaTri, phu, canhBao }: { ten: string; giaTri: string; phu: string; canhBao?: boolean }) {
  return (
    <div className="db-kpi">
      <span>{ten}</span>
      <strong className={canhBao ? 'db-warn' : ''}>{giaTri}</strong>
      <small>{phu}</small>
    </div>
  );
}

function BieuDoDoanhThu({ rows }: { rows: DashboardSummary['revenueByDay'] }) {
  const max = Math.max(0, ...rows.map((r) => r.revenue));
  if (max === 0) return <p className="db-empty">Chưa có khoản thanh toán nào trong khoảng này.</p>;
  return (
    <>
      <div className="db-chart" role="img" aria-label="Biểu đồ doanh thu theo ngày">
        {rows.map((r) => (
          <div className="col" key={r.date}>
            <div className="bar" style={{ height: `${(r.revenue / max) * 100}%` }} />
            <div className="tip">
              {ngayNgan(r.date)}: {dinhDangTien(r.revenue)} · {r.orders} đơn
            </div>
          </div>
        ))}
      </div>
      <div className="db-axis">
        <span>{ngayNgan(rows[0].date)}</span>
        <span>Cao nhất {dinhDangTien(max)}</span>
        <span>{ngayNgan(rows[rows.length - 1].date)}</span>
      </div>
      <details className="db-raw">
        <summary>Xem dạng bảng</summary>
        <table className="db-table">
          <thead><tr><th>Ngày</th><th className="num">Đơn</th><th className="num">Doanh thu</th></tr></thead>
          <tbody>
            {rows.filter((r) => r.orders > 0).map((r) => (
              <tr key={r.date}><td>{ngayNgan(r.date)}</td><td className="num">{r.orders}</td><td className="num">{dinhDangTien(r.revenue)}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </>
  );
}

function DonTheoTrangThai({ counts }: { counts: Record<string, number> }) {
  const max = Math.max(0, ...Object.values(counts));
  if (max === 0) return <p className="db-empty">Chưa có đơn hàng.</p>;
  return (
    <>
      {Object.keys(TEN_TRANG_THAI).map((s) => (
        <div key={s} className={`db-hbar ${s === 'CANCELLED' ? 'cancel' : ''}`}>
          <span>{TEN_TRANG_THAI[s]}</span>
          <div className="track"><div className="fill" style={{ width: `${((counts[s] ?? 0) / max) * 100}%` }} /></div>
          <b>{so(counts[s] ?? 0)}</b>
        </div>
      ))}
    </>
  );
}

export { DashboardPage as Page };
export default DashboardPage;
