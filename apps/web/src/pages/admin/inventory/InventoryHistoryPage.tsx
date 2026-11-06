import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const API_URL = 'http://localhost:3000/api/inventory';

type HistoryItem = {
  id: string;
  quantity: number;
  countedStock: number | null;
  stockBefore: number | null;
  stockAfter: number | null;
  unitCost: number | string | null;
  variant: {
    size: number;
    color: string;
    product: { name: string };
  };
};

type HistoryDocument = {
  id: string;
  code: string;
  type: string;
  reason: string | null;
  note: string | null;
  completedAt: string | null;
  createdBy: { name: string | null; email: string };
  confirmedBy: { name: string | null; email: string } | null;
  items: HistoryItem[];
};

const typeLabels: Record<string, string> = {
  IMPORT: 'Nhập kho',
  EXPORT: 'Xuất kho',
  COUNT: 'Kiểm kê',
  ADJUSTMENT: 'Điều chỉnh',
  ORDER_OUT: 'Xuất theo đơn hàng',
  ORDER_RETURN: 'Khách trả hàng',
};

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`);
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Yêu cầu không thành công.');
  return result;
}

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function InventoryHistoryPage() {
  const [documents, setDocuments] = useState<HistoryDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    request<HistoryDocument[]>('/history')
      .then(setDocuments)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Không thể tải lịch sử kho.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="noi-dung">
      <header className="tieu-de">
        <div><h2>Lịch sử kho</h2><p>Các phiếu đã xác nhận và biến động tồn kho theo từng biến thể.</p></div>
        <span className="tong-san-pham">{documents.length} phiếu hoàn tất</span>
      </header>
      <nav aria-label="Điều hướng kho" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <Link to="/admin/inventory/check">Kiểm kê</Link>
        <Link to="/admin/inventory/history">Lịch sử</Link>
        <Link to="/admin/inventory/adjustment">Điều chỉnh</Link>
        <Link to="/admin/inventory/export">Xuất kho</Link>
        <Link to="/admin/inventory/import">Nhập kho</Link>
      </nav>
      {error && <p className="thong-bao-loi" role="alert">{error}</p>}
      {loading ? <p>Đang tải lịch sử...</p> : documents.length === 0 ? (
        <p className="khong-co-du-lieu">Chưa có phiếu kho nào được xác nhận.</p>
      ) : (
        <div className="bang-bao">
          <table>
            <thead>
              <tr><th>Mã phiếu / loại</th><th>Ngày hoàn tất</th><th>Lý do</th><th>Người lập / xác nhận</th><th>Sản phẩm và biến động</th></tr>
            </thead>
            <tbody>
              {documents.map((document) => (
                <tr key={document.id}>
                  <td><strong>{document.code}</strong><p className="mo-ta">{typeLabels[document.type] || document.type}</p></td>
                  <td>{formatDate(document.completedAt)}</td>
                  <td>{document.reason || '—'}{document.note && <p className="mo-ta">{document.note}</p>}</td>
                  <td>
                    {document.createdBy.name || document.createdBy.email}
                    <p className="mo-ta">Xác nhận: {document.confirmedBy?.name || document.confirmedBy?.email || '—'}</p>
                  </td>
                  <td>
                    {document.items.map((item) => {
                      const change = (item.stockAfter ?? 0) - (item.stockBefore ?? 0);
                      return (
                        <div key={item.id} style={{ padding: '4px 0' }}>
                          <strong>{item.variant.product.name}</strong> · size {item.variant.size} · {item.variant.color}
                          <p className="mo-ta">
                            {item.stockBefore ?? '—'} → {item.stockAfter ?? '—'}
                            {change > 0 ? ` (+${change})` : change < 0 ? ` (${change})` : ' (không đổi)'}
                            {item.unitCost !== null && ` · Đơn giá: ${Number(item.unitCost).toLocaleString('vi-VN')} đ`}
                          </p>
                        </div>
                      );
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
