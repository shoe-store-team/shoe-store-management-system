import { useCallback, useEffect, useState } from 'react';

import { orderService } from '../../../services/orderService';
import { dinhDangTien } from '../../../services/request';

import type { Order, OrderStatus } from '../../../types/order';

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

const danhSachTrangThai: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
];

export function OrderManagementPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [keyword, setKeyword] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Tai danh sach don hang
  const taiDonHang = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const data = await orderService.layTatCa();
      setOrders(data);
    } catch (e) {
      setError((e as Error).message || 'Khong the tai danh sach don hang');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    taiDonHang();
  }, [taiDonHang]);

  // Cap nhat trang thai don hang
  const capNhatTrangThai = async (
    order: Order,
    newStatus: OrderStatus,
  ) => {
    if (order.status === newStatus) return;

    const dongY = window.confirm(
      `Ban co chac chan muon chuyen don hang sang "${tenTrangThai[newStatus]}"?`,
    );

    if (!dongY) return;

    try {
      setUpdatingId(order.id);
      setError('');

      const updatedOrder = await orderService.capNhatTrangThai(
        order.id,
        newStatus,
      );

      setOrders((current) =>
        current.map((item) =>
          item.id === order.id ? updatedOrder : item,
        ),
      );

      window.alert('Cap nhat trang thai thanh cong!');
    } catch (e) {
      setError((e as Error).message || 'Cap nhat trang thai that bai');
    } finally {
      setUpdatingId(null);
    }
  };

  // Loc don hang
  const filteredOrders = orders.filter((order) => {
    const search = keyword.toLowerCase().trim();

    const matchKeyword =
      order.id.toLowerCase().includes(search) ||
      order.recipientName.toLowerCase().includes(search) ||
      order.phone.includes(search);

    const matchStatus =
      filterStatus === 'ALL' || order.status === filterStatus;

    return matchKeyword && matchStatus;
  });

  if (loading) {
    return <div className="noi-dung">Dang tai don hang...</div>;
  }

  return (
    <div className="noi-dung">
      <h2>Quan ly don hang</h2>

      {error && (
        <p style={{ color: '#dc2626', marginBottom: 16 }}>
          {error}
        </p>
      )}

      {/* Thong ke */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 12,
          marginBottom: 24,
        }}
      >
        {danhSachTrangThai.map((status) => (
          <div
            key={status}
            style={{
              border: '1px solid #ddd',
              borderRadius: 8,
              padding: 16,
            }}
          >
            <strong style={{ color: mauTrangThai[status] }}>
              {tenTrangThai[status]}
            </strong>

            <h2>
              {orders.filter((order) => order.status === status).length}
            </h2>
          </div>
        ))}
      </div>

      {/* Tim kiem va loc */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 20,
        }}
      >
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Tim theo ma don, ten nguoi nhan, so dien thoai..."
          style={{
            padding: 10,
            flex: 1,
            minWidth: 220,
          }}
        />

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ padding: 10 }}
        >
          <option value="ALL">Tat ca trang thai</option>

          {danhSachTrangThai.map((status) => (
            <option key={status} value={status}>
              {tenTrangThai[status]}
            </option>
          ))}
        </select>

        <button onClick={taiDonHang} style={{ padding: '10px 18px' }}>
          Lam moi
        </button>
      </div>

      {/* Danh sach don hang */}
      <p>
        Tim thay <strong>{filteredOrders.length}</strong> don hang
      </p>

      {filteredOrders.length === 0 ? (
        <p>Khong tim thay don hang nao.</p>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              style={{
                border: '1px solid #ddd',
                borderRadius: 8,
                padding: 20,
              }}
            >
              {/* Thong tin don hang */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div>
                  <h3>Don hang: {order.id}</h3>

                  <p>
                    Ngay dat:{' '}
                    {new Date(order.createdAt).toLocaleString('vi-VN')}
                  </p>
                </div>

                <strong style={{ color: mauTrangThai[order.status] }}>
                  {tenTrangThai[order.status]}
                </strong>
              </div>

              <hr />

              {/* Thong tin nguoi nhan */}
              <h4>Thong tin nguoi nhan</h4>

              <p>Ho ten: {order.recipientName}</p>
              <p>So dien thoai: {order.phone}</p>
              <p>Dia chi: {order.shippingAddress}</p>

              {order.note && <p>Ghi chu: {order.note}</p>}

              <hr />

              {/* San pham */}
              <h4>Danh sach san pham</h4>

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

              {/* Thanh toan */}
              <p>
                Trang thai thanh toan: <strong>{order.paymentStatus}</strong>
              </p>

              <h3 style={{ textAlign: 'right' }}>
                Tong tien: {dinhDangTien(Number(order.totalAmount))}
              </h3>

              {/* Cap nhat trang thai */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  gap: 10,
                  flexWrap: 'wrap',
                  marginTop: 16,
                }}
              >
                <label>Cap nhat trang thai:</label>

                <select
                  value={order.status}
                  disabled={
                    updatingId === order.id ||
                    order.status === 'CANCELLED' ||
                    order.status === 'DELIVERED'
                  }
                  onChange={(e) =>
                    capNhatTrangThai(
                      order,
                      e.target.value as OrderStatus,
                    )
                  }
                  style={{ padding: 10 }}
                >
                  {danhSachTrangThai.map((status) => (
                    <option key={status} value={status}>
                      {tenTrangThai[status]}
                    </option>
                  ))}
                </select>

                {updatingId === order.id && <span>Dang cap nhat...</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}