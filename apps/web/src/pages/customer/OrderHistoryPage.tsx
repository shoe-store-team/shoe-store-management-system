import { useCallback, useEffect, useState } from 'react';

import { orderService } from '../../services/orderService';
import { dinhDangTien } from '../../services/request';

import type { Order, OrderStatus } from '../../types/order';

const tenTrangThai: Record<OrderStatus, string> = {
  PENDING: 'Cho xac nhan',
  CONFIRMED: 'Da xac nhan',
  PROCESSING: 'Dang xu ly',
  SHIPPED: 'Dang giao hang',
  DELIVERED: 'Da giao hang',
  CANCELLED: 'Da huy',
};

const mauTrangThai: Record<OrderStatus, string> = {
  PENDING: '#f59e0b',
  CONFIRMED: '#2563eb',
  PROCESSING: '#8b5cf6',
  SHIPPED: '#0891b2',
  DELIVERED: '#16a34a',
  CANCELLED: '#dc2626',
};

export function OrderHistoryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  const taiLichSu = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const data = await orderService.layLichSu();
      setOrders(data);
    } catch (e) {
      setError((e as Error).message || 'Khong the tai lich su don hang');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    taiLichSu();
  }, [taiLichSu]);

  const huyDonHang = async (id: string) => {
    const dongY = window.confirm('Ban co chac chan muon huy don hang nay?');

    if (!dongY) return;

    try {
      setCancelingId(id);
      setError('');

      const updatedOrder = await orderService.huyDonHang(id);

      setOrders((current) =>
        current.map((order) =>
          order.id === id ? updatedOrder : order,
        ),
      );

      window.alert('Huy don hang thanh cong!');
    } catch (e) {
      setError((e as Error).message || 'Huy don hang that bai');
    } finally {
      setCancelingId(null);
    }
  };

  if (loading) {
    return <div className="noi-dung">Dang tai lich su don hang...</div>;
  }

  return (
    <div className="noi-dung">
      <h2>Lich su don hang</h2>

      {error && (
        <p style={{ color: '#dc2626', marginBottom: 16 }}>
          {error}
        </p>
      )}

      <button
        onClick={taiLichSu}
        style={{ padding: '8px 16px', marginBottom: 20 }}
      >
        Lam moi
      </button>

      {orders.length === 0 ? (
        <p>Ban chua co don hang nao.</p>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {orders.map((order) => (
            <div
              key={order.id}
              style={{
                border: '1px solid #ddd',
                borderRadius: 8,
                padding: 20,
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
                  <strong>Ma don hang: {order.id}</strong>

                  <p>
                    Ngay dat:{' '}
                    {new Date(order.createdAt).toLocaleString('vi-VN')}
                  </p>
                </div>

                <span
                  style={{
                    color: mauTrangThai[order.status],
                    fontWeight: 'bold',
                  }}
                >
                  {tenTrangThai[order.status]}
                </span>
              </div>

              <hr />

              <h4>San pham</h4>

              {order.items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    marginBottom: 8,
                  }}
                >
                  <span>
                    {item.productName} - Size {item.size} - {item.color}
                    {' x '}
                    {item.quantity}
                  </span>

                  <span>
                    {dinhDangTien(
                      Number(item.price) * item.quantity,
                    )}
                  </span>
                </div>
              ))}

              <hr />

              <p>
                Nguoi nhan: <strong>{order.recipientName}</strong>
              </p>

              <p>
                So dien thoai: {order.phone}
              </p>

              <p>
                Dia chi: {order.shippingAddress}
              </p>

              <p>
                Trang thai thanh toan: {order.paymentStatus}
              </p>

              <h3 style={{ textAlign: 'right' }}>
                Tong tien: {dinhDangTien(Number(order.totalAmount))}
              </h3>

              {order.status === 'PENDING' && (
                <div style={{ textAlign: 'right' }}>
                  <button
                    onClick={() => huyDonHang(order.id)}
                    disabled={cancelingId === order.id}
                    style={{
                      backgroundColor: '#dc2626',
                      color: 'white',
                      border: 'none',
                      borderRadius: 5,
                      padding: '10px 18px',
                      cursor: 'pointer',
                    }}
                  >
                    {cancelingId === order.id
                      ? 'Dang huy...'
                      : 'Huy don hang'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}