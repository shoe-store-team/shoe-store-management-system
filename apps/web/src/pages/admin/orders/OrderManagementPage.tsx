import { useEffect, useState } from 'react';
import { orderService } from '../../../services/orderService';
import { dinhDangTien } from '../../../services/request';
import type { Order, OrderStatus } from '../../../types/order';

const trangThaiDonHang: { value: OrderStatus; label: string }[] = [
  { value: 'PENDING', label: 'Chờ xác nhận' },
  { value: 'CONFIRMED', label: 'Đã xác nhận' },
  { value: 'PROCESSING', label: 'Đang xử lý' },
  { value: 'SHIPPED', label: 'Đang giao hàng' },
  { value: 'DELIVERED', label: 'Đã giao hàng' },
  { value: 'CANCELLED', label: 'Đã hủy' },
];

function hienThiTrangThai(status: OrderStatus) {
  return trangThaiDonHang.find((item) => item.value === status)?.label ?? status;
}

function hienThiNgay(ngay: string) {
  return new Date(ngay).toLocaleString('vi-VN');
}

export function OrderManagementPage() {
  const [donHang, setDonHang] = useState<Order[]>([]);
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState('');
  const [dangCapNhat, setDangCapNhat] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const taiDonHang = async () => {
      try {
        const data = await orderService.layTatCa();

        if (!cancelled) {
          setDonHang(data);
          setLoi('');
        }
      } catch (error) {
        if (!cancelled) {
          setLoi((error as Error).message || 'Không thể tải danh sách đơn hàng.');
        }
      } finally {
        if (!cancelled) {
          setDangTai(false);
        }
      }
    };

    void taiDonHang();

    return () => {
      cancelled = true;
    };
  }, []);

  const capNhatTrangThai = async (id: string, status: OrderStatus) => {
    try {
      setDangCapNhat(id);
      setLoi('');

      const donHangMoi = await orderService.capNhatTrangThai(id, status);

      setDonHang((danhSach) =>
        danhSach.map((item) => (item.id === id ? donHangMoi : item)),
      );
    } catch (error) {
      setLoi((error as Error).message || 'Không thể cập nhật trạng thái đơn hàng.');
    } finally {
      setDangCapNhat(null);
    }
  };

  const huyDonHang = async (id: string) => {
    const dongY = window.confirm('Bạn có chắc chắn muốn hủy đơn hàng này không?');

    if (!dongY) return;

    try {
      setDangCapNhat(id);
      setLoi('');

      const donHangMoi = await orderService.huyDonHang(id);

      setDonHang((danhSach) =>
        danhSach.map((item) => (item.id === id ? donHangMoi : item)),
      );
    } catch (error) {
      setLoi((error as Error).message || 'Không thể hủy đơn hàng.');
    } finally {
      setDangCapNhat(null);
    }
  };

  if (dangTai) {
    return <div className="noi-dung">Đang tải danh sách đơn hàng...</div>;
  }

  return (
    <div className="noi-dung">
      <h2>Quản lý đơn hàng</h2>

      <p>Tổng số đơn hàng: {donHang.length}</p>

      {loi && (
        <p style={{ color: '#dc2626', marginBottom: 16 }}>
          {loi}
        </p>
      )}

      {donHang.length === 0 ? (
        <p>Chưa có đơn hàng nào.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              minWidth: 850,
            }}
          >
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th style={oCot}>Mã đơn hàng</th>
                <th style={oCot}>Người nhận</th>
                <th style={oCot}>Số điện thoại</th>
                <th style={oCot}>Tổng tiền</th>
                <th style={oCot}>Ngày đặt</th>
                <th style={oCot}>Trạng thái</th>
                <th style={oCot}>Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {donHang.map((item) => (
                <tr key={item.id}>
                  <td style={oCot}>{item.id.slice(0, 8)}</td>
                  <td style={oCot}>{item.recipientName}</td>
                  <td style={oCot}>{item.phone}</td>
                  <td style={oCot}>
                    {dinhDangTien(Number(item.totalAmount))}
                  </td>
                  <td style={oCot}>{hienThiNgay(item.createdAt)}</td>

                  <td style={oCot}>
                    <select
                      value={item.status}
                      disabled={
                        dangCapNhat === item.id ||
                        item.status === 'CANCELLED'
                      }
                      onChange={(e) =>
                        capNhatTrangThai(
                          item.id,
                          e.target.value as OrderStatus,
                        )
                      }
                    >
                      {trangThaiDonHang.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>

                    <div style={{ fontSize: 12, marginTop: 4 }}>
                      {hienThiTrangThai(item.status)}
                    </div>
                  </td>

                  <td style={oCot}>
                    {item.status !== 'CANCELLED' &&
                      item.status !== 'DELIVERED' && (
                        <button
                          type="button"
                          disabled={dangCapNhat === item.id}
                          onClick={() => huyDonHang(item.id)}
                          style={{
                            color: '#fff',
                            background: '#dc2626',
                            border: 0,
                            borderRadius: 4,
                            padding: '6px 10px',
                            cursor: 'pointer',
                          }}
                        >
                          {dangCapNhat === item.id ? 'Đang xử lý...' : 'Hủy đơn'}
                        </button>
                      )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const oCot: React.CSSProperties = {
  padding: 12,
  borderBottom: '1px solid #ddd',
  textAlign: 'left',
};
