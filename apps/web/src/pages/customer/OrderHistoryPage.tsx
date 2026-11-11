import { useEffect, useState } from 'react';
import { orderService } from '../../services/orderService';
import { dinhDangTien } from '../../services/request';
import type { Order, OrderStatus } from '../../types/order';

const trangThaiDonHang: Record<OrderStatus, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  PROCESSING: 'Đang xử lý',
  SHIPPED: 'Đang giao hàng',
  DELIVERED: 'Đã giao hàng',
  CANCELLED: 'Đã hủy',
};

export function OrderHistoryPage() {
  const [donHang, setDonHang] = useState<Order[]>([]);
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState('');
  const [dangHuy, setDangHuy] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const taiLichSu = async () => {
      try {
        const data = await orderService.layLichSu();

        if (!cancelled) {
          setDonHang(data);
          setLoi('');
        }
      } catch (error) {
        if (!cancelled) {
          setLoi((error as Error).message || 'Không thể tải lịch sử đơn hàng.');
        }
      } finally {
        if (!cancelled) {
          setDangTai(false);
        }
      }
    };

    void taiLichSu();

    return () => {
      cancelled = true;
    };
  }, []);

  const huyDonHang = async (id: string) => {
    const dongY = window.confirm('Bạn có chắc chắn muốn hủy đơn hàng này không?');

    if (!dongY) return;

    try {
      setDangHuy(id);
      setLoi('');

      const donHangMoi = await orderService.huyDonHang(id);

      setDonHang((danhSach) =>
        danhSach.map((item) => (item.id === id ? donHangMoi : item)),
      );
    } catch (error) {
      setLoi((error as Error).message || 'Không thể hủy đơn hàng.');
    } finally {
      setDangHuy(null);
    }
  };

  if (dangTai) {
    return <div className="noi-dung">Đang tải lịch sử đơn hàng...</div>;
  }

  return (
    <div className="noi-dung">
      <h2>Lịch sử mua hàng</h2>

      {loi && (
        <p style={{ color: '#dc2626', marginBottom: 16 }}>
          {loi}
        </p>
      )}

      {donHang.length === 0 ? (
        <p>Bạn chưa có đơn hàng nào.</p>
      ) : (
        <div>
          {donHang.map((item) => (
            <div
              key={item.id}
              style={{
                border: '1px solid #ddd',
                borderRadius: 8,
                padding: 16,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div>
                  <h3>Đơn hàng #{item.id.slice(0, 8)}</h3>
                  <p>Ngày đặt: {new Date(item.createdAt).toLocaleString('vi-VN')}</p>
                </div>

                <div>
                  <strong>
                    Trạng thái: {trangThaiDonHang[item.status]}
                  </strong>
                </div>
              </div>

              <hr />

              <h4>Thông tin nhận hàng</h4>
              <p>Người nhận: {item.recipientName}</p>
              <p>Số điện thoại: {item.phone}</p>
              <p>Địa chỉ: {item.shippingAddress}</p>

              <h4>Sản phẩm đã đặt</h4>

              {item.items.map((sanPham) => (
                <div
                  key={sanPham.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 8,
                    padding: '8px 0',
                    borderBottom: '1px solid #eee',
                  }}
                >
                  <div>
                    <strong>{sanPham.productName}</strong>
                    <p>
                      Size: {sanPham.size} | Màu: {sanPham.color}
                    </p>
                    <p>Số lượng: {sanPham.quantity}</p>
                  </div>

                  <div>
                    {dinhDangTien(
                      Number(sanPham.price) * sanPham.quantity,
                    )}
                  </div>
                </div>
              ))}

              <div style={{ textAlign: 'right', marginTop: 16 }}>
                <h3>
                  Tổng tiền: {dinhDangTien(Number(item.totalAmount))}
                </h3>

                {item.status === 'PENDING' && (
                  <button
                    type="button"
                    disabled={dangHuy === item.id}
                    onClick={() => huyDonHang(item.id)}
                    style={{
                      background: '#dc2626',
                      color: '#fff',
                      border: 0,
                      borderRadius: 4,
                      padding: '8px 16px',
                      cursor: 'pointer',
                    }}
                  >
                    {dangHuy === item.id ? 'Đang hủy...' : 'Hủy đơn hàng'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}