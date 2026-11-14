import { useCallback, useEffect, useState } from 'react';
import { orderService } from '../../services/orderService';
import { dinhDangTien } from '../../services/request';
import type {
  Order,
  OrderStatus,
  PaymentStatus,
} from '../../types/order';

const orderStatusLabels: Record<OrderStatus, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  PROCESSING: 'Đang xử lý',
  SHIPPED: 'Đang giao hàng',
  DELIVERED: 'Đã giao hàng',
  CANCELLED: 'Đã hủy',
};

const paymentStatusLabels: Record<PaymentStatus, string> = {
  UNPAID: 'Chưa thanh toán',
  PENDING: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  FAILED: 'Thanh toán thất bại',
  REFUNDED: 'Đã hoàn tiền',
};

const canCancelOrder = (order: Order): boolean => {
  const canCancelStatus =
    order.status === 'PENDING' ||
    order.status === 'CONFIRMED';

  return canCancelStatus && order.paymentStatus !== 'PAID';
};

export function Page() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadOrders = useCallback(async () => {
    try {
      setError('');
      const data = await orderService.layLichSu();
      setOrders(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể tải lịch sử đơn hàng.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const handleCancelOrder = async (order: Order) => {
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn hủy đơn hàng ${order.id.slice(0, 8)} không?`,
    );

    if (!confirmed) return;

    try {
      setCancelingId(order.id);
      setError('');

      const updatedOrder = await orderService.huyDonHang(order.id);

      setOrders((currentOrders) =>
        currentOrders.map((item) =>
          item.id === order.id ? updatedOrder : item,
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể hủy đơn hàng. Vui lòng thử lại.',
      );
    } finally {
      setCancelingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        Đang tải đơn hàng...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-6">
      <h1 className="mb-6 text-2xl font-bold">
        Lịch sử đơn hàng
      </h1>

      {error && (
        <div className="mb-4 rounded-lg bg-red-100 p-3 text-red-700">
          {error}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
          Bạn chưa có đơn hàng nào.
        </div>
      ) : (
        <div className="space-y-5">
          {orders.map((order) => (
            <div
              key={order.id}
              className="overflow-hidden rounded-xl border bg-white shadow-sm"
            >
              <div className="flex flex-col justify-between gap-3 border-b bg-gray-50 p-4 md:flex-row md:items-center">
                <div>
                  <p className="font-semibold">
                    Đơn hàng #{order.id.slice(0, 8)}
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    Ngày đặt:{' '}
                    {new Date(order.createdAt).toLocaleString('vi-VN')}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
                    {orderStatusLabels[order.status]}
                  </span>

                  <span
                    className={`rounded-full px-3 py-1 text-sm font-medium ${
                      order.paymentStatus === 'PAID'
                        ? 'bg-green-100 text-green-700'
                        : order.paymentStatus === 'FAILED'
                          ? 'bg-red-100 text-red-700'
                          : order.paymentStatus === 'REFUNDED'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {paymentStatusLabels[order.paymentStatus]}
                  </span>
                </div>
              </div>

              <div className="space-y-2 p-4">
                <h2 className="font-semibold">
                  Thông tin nhận hàng
                </h2>

                <p>Người nhận: {order.recipientName}</p>
                <p>Số điện thoại: {order.phone}</p>
                <p>Địa chỉ: {order.shippingAddress}</p>

                {order.note && <p>Ghi chú: {order.note}</p>}
              </div>

              <div className="border-t p-4">
                <h2 className="mb-3 font-semibold">
                  Sản phẩm đã đặt
                </h2>

                <div className="space-y-3">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col justify-between gap-2 rounded-lg bg-gray-50 p-3 sm:flex-row sm:items-center"
                    >
                      <div>
                        <p className="font-medium">
                          {item.productName}
                        </p>

                        <p className="text-sm text-gray-500">
                          Size: {item.size} | Màu: {item.color}
                        </p>

                        <p className="text-sm text-gray-500">
                          Số lượng: {item.quantity}
                        </p>
                      </div>

                      <p className="font-medium">
                        {dinhDangTien(
                          Number(item.price) * item.quantity,
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col justify-between gap-3 border-t bg-gray-50 p-4 sm:flex-row sm:items-center">
                <div className="space-y-1 text-sm text-gray-600">
                  <p>
                    Tạm tính:{' '}
                    {dinhDangTien(Number(order.subtotalAmount))}
                  </p>

                  <p>
                    Giảm giá:{' '}
                    {dinhDangTien(Number(order.discountAmount))}
                  </p>

                  <p>
                    Phí vận chuyển:{' '}
                    {dinhDangTien(Number(order.shippingFee))}
                  </p>

                  <p className="text-lg font-bold text-red-600">
                    Tổng tiền:{' '}
                    {dinhDangTien(Number(order.totalAmount))}
                  </p>
                </div>

                {canCancelOrder(order) && (
                  <button
                    type="button"
                    onClick={() => void handleCancelOrder(order)}
                    disabled={cancelingId === order.id}
                    className="rounded-lg bg-red-600 px-5 py-2 font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {cancelingId === order.id
                      ? 'Đang hủy...'
                      : 'Hủy đơn hàng'}
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