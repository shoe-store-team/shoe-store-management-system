import { useEffect, useState } from 'react';

import { cartService } from '../../services/cartService';
import { orderService } from '../../services/orderService';
import { dinhDangTien } from '../../services/request';

import type { GioHang } from '../../types/cart';
import type {
  CreateOrderDto,
  Order,
  PaymentMethod,
} from '../../types/order';

export function CheckoutPage() {
  const [gioHang, setGioHang] = useState<GioHang | null>(null);

  const [recipientName, setRecipientName] = useState('');
  const [phone, setPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [note, setNote] = useState('');

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>('COD');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState<Order | null>(null);

  // Lay thong tin gio hang
  useEffect(() => {
    cartService
      .layGioHang()
      .then(setGioHang)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Xu ly dat hang
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError('');

    if (!recipientName.trim()) {
      setError('Vui long nhap ten nguoi nhan');
      return;
    }

    if (!/^0\d{9}$/.test(phone.trim())) {
      setError('So dien thoai phai co 10 chu so va bat dau bang 0');
      return;
    }

    if (!shippingAddress.trim()) {
      setError('Vui long nhap dia chi giao hang');
      return;
    }

    if (!gioHang || gioHang.items.length === 0) {
      setError('Gio hang cua ban dang trong');
      return;
    }

    if (gioHang.items.some((item) => !item.available)) {
      setError('Gio hang co san pham khong du dieu kien dat hang');
      return;
    }

    try {
      setSubmitting(true);

      const data: CreateOrderDto = {
        recipientName: recipientName.trim(),
        phone: phone.trim(),
        shippingAddress: shippingAddress.trim(),
        note: note.trim(),
        paymentMethod,
      };

      const result = await orderService.taoDonHang(data);

      setOrder(result);
    } catch (e) {
      setError((e as Error).message || 'Dat hang that bai');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="noi-dung">Dang tai gio hang...</div>;
  }

  if (order) {
    return (
      <div className="noi-dung">
        <h2>Dat hang thanh cong!</h2>

        <p>Ma don hang: {order.id}</p>

        <p>
          Tong thanh toan:{' '}
          {dinhDangTien(Number(order.totalAmount))}
        </p>

        <p>Trang thai: {order.status}</p>

        <button onClick={() => (window.location.href = '/')}>
          Tiep tuc mua sam
        </button>
      </div>
    );
  }

  if (!gioHang || gioHang.items.length === 0) {
    return (
      <div className="noi-dung">
        <h2>Gio hang dang trong</h2>
        <p>Vui long them san pham vao gio hang truoc khi thanh toan.</p>
      </div>
    );
  }

  const tongTien = gioHang.subtotal;

  return (
    <div className="noi-dung">
      <h2>Thanh toan don hang</h2>

      {error && (
        <p style={{ color: 'red', marginBottom: 16 }}>
          {error}
        </p>
      )}

      <div style={{ marginBottom: 24 }}>
        <h3>Thong tin san pham</h3>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th align="left">San pham</th>
              <th>Size</th>
              <th>Mau</th>
              <th>So luong</th>
              <th>Don gia</th>
              <th>Thanh tien</th>
            </tr>
          </thead>

          <tbody>
            {gioHang.items.map((item) => (
              <tr key={item.id}>
                <td>{item.productName}</td>
                <td align="center">{item.size}</td>
                <td align="center">{item.color}</td>
                <td align="center">{item.quantity}</td>
                <td align="center">
                  {dinhDangTien(item.unitPrice)}
                </td>
                <td align="center">
                  {dinhDangTien(item.lineTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3 style={{ textAlign: 'right', marginTop: 20 }}>
          Tong tien: {dinhDangTien(tongTien)}
        </h3>
      </div>

      <form onSubmit={handleSubmit}>
        <h3>Thong tin nguoi nhan</h3>

        <div style={{ marginBottom: 16 }}>
          <label>Ho va ten nguoi nhan</label>

          <input
            type="text"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder="Nhap ho va ten"
            required
            style={{ display: 'block', width: '100%', padding: 10 }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label>So dien thoai</label>

          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Nhap so dien thoai"
            required
            style={{ display: 'block', width: '100%', padding: 10 }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label>Dia chi giao hang</label>

          <textarea
            value={shippingAddress}
            onChange={(e) => setShippingAddress(e.target.value)}
            placeholder="Nhap dia chi giao hang"
            required
            rows={3}
            style={{ display: 'block', width: '100%', padding: 10 }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label>Ghi chu</label>

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ghi chu cho don hang (neu co)"
            rows={2}
            style={{ display: 'block', width: '100%', padding: 10 }}
          />
        </div>

        <h3>Phuong thuc thanh toan</h3>

        <div style={{ marginBottom: 20 }}>
          <select
            value={paymentMethod}
            onChange={(e) =>
              setPaymentMethod(e.target.value as PaymentMethod)
            }
            style={{ padding: 10, width: '100%' }}
          >
            <option value="COD">
              Thanh toan khi nhan hang (COD)
            </option>

            <option value="VNPAY">Thanh toan qua VNPAY</option>

            <option value="MOMO">Thanh toan qua MOMO</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: '12px 24px',
            cursor: submitting ? 'not-allowed' : 'pointer',
          }}
        >
          {submitting ? 'Dang dat hang...' : 'Xac nhan dat hang'}
        </button>
      </form>
    </div>
  );
}