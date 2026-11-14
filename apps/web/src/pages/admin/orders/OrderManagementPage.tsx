import { useCallback, useEffect, useState } from 'react';
import { orderService } from '../../../services/orderService';
import { dinhDangTien } from '../../../services/request';
import type {
  Order,
  OrderStatus,
  PaymentStatus,
} from '../../../types/order';

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

const nextStatus: Partial<Record<OrderStatus, OrderStatus>> = {
  PENDING: 'CONFIRMED',
  CONFIRMED: 'PROCESSING',
  PROCESSING: 'SHIPPED',
  SHIPPED: 'DELIVERED',
};

// Chỉ được hủy đơn đang chờ xác nhận hoặc đã xác nhận,
// đồng thời đơn chưa được thanh toán.
const canCancelOrder = (order: Order): boolean => {
  return (
    (order.status === 'PENDING' || order.status === 'CONFIRMED') &&
    order.paymentStatus !== 'PAID' &&
    order.paymentStatus !== 'REFUNDED'
  );
};

// Chỉ cho phép tiến hành đơn đã thanh toán
// hoặc đơn COD chưa thanh toán.
const canProgressOrder = (order: Order): boolean => {
  const isPaid = order.paymentStatus === 'PAID';

  const isCodUnpaid =
    order.paymentStatus === 'UNPAID' &&
    order.payments?.some((payment) => payment.method === 'COD') === true;

  return isPaid || isCodUnpaid;
};

export function Page() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      setError('');

      const data = await orderService.layTatCa();
      setOrders(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể tải danh sách đơn hàng.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const handleUpdateStatus = async (
    order: Order,
    status: OrderStatus,
  ) => {
    try {
      setUpdatingId(order.id);
      setError('');

      const updatedOrder = await orderService.capNhatTrangThai(
        order.id,
        status,
      );

      setOrders((currentOrders) =>
        currentOrders.map((item) =>
          item.id === order.id ? updatedOrder : item,
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể cập nhật trạng thái đơn hàng.',
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCancelOrder = async (order: Order) => {
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn hủy đơn hàng ${order.id.slice(0, 8)} không?`,
    );

    if (!confirmed) return;

    try {
      setUpdatingId(order.id);
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
          : 'Không thể hủy đơn hàng.',
      );
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        Đang tải danh sách đơn hàng...
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">
            Quản lý đơn hàng
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Theo dõi và cập nhật trạng thái các đơn hàng.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadOrders()}
          disabled={updatingId !== null}
          className="rounded-lg border px-4 py-2 hover:bg-gray-50 disabled:opacity-50"
        >
          Làm mới
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-100 p-3 text-red-700">
          {error}
        </div>
      )}

      <div className="mb-4 rounded-lg border bg-white p-4">
        <p className="text-sm text-gray-500">
          Tổng số đơn hàng
        </p>

        <p className="text-2xl font-bold">
          {orders.length}
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
          Chưa có đơn hàng nào.
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const next = nextStatus[order.status];

            // Tất cả bước chuyển trạng thái đều phải thỏa điều kiện thanh toán.
            const canAdvance =
              Boolean(next) && canProgressOrder(order);

            return (
              <div
                key={order.id}
                className="overflow-hidden rounded-xl border bg-white shadow-sm"
              >
                <div className="flex flex-col justify-between gap-3 border-b bg-gray-50 p-4 md:flex-row md:items-center">
                  <div>
                    <h2 className="font-bold">
                      Đơn hàng #{order.id.slice(0, 8)}
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleString('vi-VN')}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700">
                      {orderStatusLabels[order.status]}
                    </span>

                    <span
                      className={`rounded-full px-3 py-1 text-sm ${
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

                <div className="grid gap-4 p-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <h3 className="mb-2 font-semibold">
                      Thông tin khách hàng
                    </h3>

                    <p>Người nhận: {order.recipientName}</p>
                    <p>Số điện thoại: {order.phone}</p>
                    <p>Địa chỉ: {order.shippingAddress}</p>

                    {order.note && (
                      <p>Ghi chú: {order.note}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <h3 className="mb-2 font-semibold">
                      Thông tin thanh toán
                    </h3>

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

                    <p className="font-bold text-red-600">
                      Tổng tiền:{' '}
                      {dinhDangTien(Number(order.totalAmount))}
                    </p>
                  </div>
                </div>

                <div className="border-t p-4">
                  <h3 className="mb-3 font-semibold">
                    Sản phẩm trong đơn
                  </h3>

                  <div className="space-y-2">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col justify-between gap-1 rounded-lg bg-gray-50 p-3 sm:flex-row sm:items-center"
                      >
                        <div>
                          <p className="font-medium">
                            {item.productName}
                          </p>

                          <p className="text-sm text-gray-500">
                            Size: {item.size} | Màu: {item.color} |
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

                <div className="flex flex-col gap-3 border-t bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-gray-600">
                    Trạng thái hiện tại:{' '}
                    <strong>
                      {orderStatusLabels[order.status]}
                    </strong>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {canAdvance && next && (
                      <button
                        type="button"
                        disabled={updatingId !== null}
                        onClick={() =>
                          void handleUpdateStatus(order, next)
                        }
                        className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {updatingId === order.id
                          ? 'Đang cập nhật...'
                          : `Chuyển sang: ${orderStatusLabels[next]}`}
                      </button>
                    )}

                    {canCancelOrder(order) && (
                      <button
                        type="button"
                        disabled={updatingId !== null}
                        onClick={() => void handleCancelOrder(order)}
                        className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        {updatingId === order.id
                          ? 'Đang xử lý...'
                          : 'Hủy đơn hàng'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}