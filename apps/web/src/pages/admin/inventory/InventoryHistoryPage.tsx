import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./InventoryHistoryPage.css";
import { authStore } from "../../../stores/authStore";

const API_URL = "http://localhost:3000/api/inventory";

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
  orderId?: string | null;
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
  IMPORT: "Nhập kho",
  EXPORT: "Xuất kho",
  COUNT: "Kiểm kê",
  ADJUSTMENT: "Điều chỉnh",
  ORDER_OUT: "Xuất theo đơn hàng",
  ORDER_RETURN: "Hoàn tồn đơn hàng / Khách trả",
};

async function request<T>(path: string): Promise<T> {
  const token = authStore.getToken();

  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Yêu cầu không thành công.");
  }

  return result;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function InventoryHistoryPage() {
  const [documents, setDocuments] = useState<HistoryDocument[]>([]);
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    request<HistoryDocument[]>("/history")
      .then(setDocuments)
      .catch((cause: unknown) =>
        setError(
          cause instanceof Error ? cause.message : "Không thể tải lịch sử kho.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const filteredDocuments =
    typeFilter === "ALL"
      ? documents
      : documents.filter((d) => d.type === typeFilter);

  const importDocsCount = documents.filter(
    (d) => d.type === "IMPORT" || d.type === "ORDER_RETURN",
  ).length;
  const exportDocsCount = documents.filter(
    (d) => d.type === "EXPORT" || d.type === "ORDER_OUT",
  ).length;
  const auditDocsCount = documents.filter(
    (d) => d.type === "COUNT" || d.type === "ADJUSTMENT",
  ).length;

  return (
    <section className="inventory-history">
      <header className="inv-page-header">
        <div>
          <p className="inv-eyebrow">INVENTORY MANAGEMENT · AUDIT LOG</p>
          <h2>Lịch sử kho</h2>
          <p>Các phiếu đã xác nhận và biến động tồn kho theo từng biến thể.</p>
        </div>
        <span className="inv-header-badge">
          {documents.length} phiếu hoàn tất
        </span>
      </header>

      <nav className="inventory-nav" aria-label="Điều hướng kho">
        <Link to="/admin/inventory/check">◈ Kiểm kê</Link>
        <Link to="/admin/inventory/import">＋ Nhập kho</Link>
        <Link to="/admin/inventory/export">－ Xuất kho</Link>
        <Link to="/admin/inventory/adjustment">⇄ Điều chỉnh</Link>
        <Link to="/admin/inventory/history" className="active">
          ☰ Lịch sử
        </Link>
      </nav>

      <div className="inv-stat-grid">
        <article className="inv-stat-card">
          <span className="inv-stat-icon">☰</span>
          <small>TỔNG CHỨNG TỪ</small>
          <strong>{documents.length}</strong>
          <em>Phiếu đã xác nhận</em>
        </article>
        <article className="inv-stat-card">
          <span className="inv-stat-icon sage">＋</span>
          <small>NHẬP / HOÀN ĐƠN</small>
          <strong>{importDocsCount}</strong>
          <em>Phiếu tăng tồn</em>
        </article>
        <article className="inv-stat-card">
          <span className="inv-stat-icon rose">－</span>
          <small>XUẤT / ĐƠN BÁN</small>
          <strong>{exportDocsCount}</strong>
          <em>Phiếu giảm tồn</em>
        </article>
        <article className="inv-stat-card">
          <span className="inv-stat-icon sand">⇄</span>
          <small>KIỂM KÊ & ĐIỀU CHỈNH</small>
          <strong>{auditDocsCount}</strong>
          <em>Biên bản đối soát</em>
        </article>
      </div>

      {error && (
        <p className="inventory-alert inventory-error" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <div className="inventory-card">
          <p className="inventory-empty">Đang tải lịch sử...</p>
        </div>
      ) : documents.length === 0 ? (
        <div className="inventory-card">
          <p className="inventory-empty">Chưa có phiếu kho nào được xác nhận.</p>
        </div>
      ) : (
        <div className="inventory-card">
          <div className="inv-section-title">
            <div>
              <h3>Sổ cái chứng từ kho</h3>
              <p>Hiển thị {filteredDocuments.length} phiếu hoàn tất</p>
            </div>
            <div style={{ minWidth: 210 }}>
              <select
                aria-label="Lọc theo loại phiếu"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="ALL">Tất cả loại phiếu ({documents.length})</option>
                <option value="IMPORT">Nhập kho</option>
                <option value="EXPORT">Xuất kho</option>
                <option value="COUNT">Kiểm kê</option>
                <option value="ADJUSTMENT">Điều chỉnh</option>
                <option value="ORDER_OUT">Xuất theo đơn hàng</option>
                <option value="ORDER_RETURN">Hoàn tồn đơn hàng</option>
              </select>
            </div>
          </div>

          <div className="inventory-table">
            <table>
              <thead>
                <tr>
                  <th>Mã phiếu / loại</th>
                  <th>Ngày hoàn tất</th>
                  <th>Lý do</th>
                  <th>Người lập / xác nhận</th>
                  <th>Sản phẩm và biến động</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.map((document) => (
                  <tr key={document.id}>
                    <td>
                      <strong>{document.code}</strong>
                      <div>
                        <span className={`inv-doc-badge ${document.type}`}>
                          {typeLabels[document.type] || document.type}
                        </span>
                      </div>
                    </td>
                    <td>{formatDate(document.completedAt)}</td>
                    <td>
                      {document.reason || "—"}
                      {document.orderId && (
                        <p className="mo-ta">
                          Mã đơn: #{document.orderId.slice(0, 8)}
                        </p>
                      )}
                      {document.note && <p className="mo-ta">{document.note}</p>}
                    </td>
                    <td>
                      <strong>
                        {document.createdBy.name || document.createdBy.email}
                      </strong>
                      <p className="mo-ta">
                        Xác nhận:{" "}
                        {document.confirmedBy?.name ||
                          document.confirmedBy?.email ||
                          "—"}
                      </p>
                    </td>
                    <td>
                      {document.items.map((item) => {
                        const change =
                          (item.stockAfter ?? 0) - (item.stockBefore ?? 0);
                        return (
                          <div key={item.id} style={{ padding: "5px 0" }}>
                            <strong>{item.variant.product.name}</strong> · size{" "}
                            {item.variant.size} · {item.variant.color}
                            <p className="mo-ta">
                              <span className="inv-stock-pill">
                                {item.stockBefore ?? "—"} →{" "}
                                {item.stockAfter ?? "—"}
                              </span>{" "}
                              <span
                                className={`inv-stock-pill ${
                                  change > 0
                                    ? "positive"
                                    : change < 0
                                      ? "negative"
                                      : "neutral"
                                }`}
                              >
                                {change > 0
                                  ? `+${change}`
                                  : change < 0
                                    ? `${change}`
                                    : "không đổi"}
                              </span>
                              {item.unitCost !== null &&
                                ` · Đơn giá: ${Number(item.unitCost).toLocaleString("vi-VN")} đ`}
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
        </div>
      )}

      <p className="inv-footnote">
        Shoe Store Admin · Truy vết đầy đủ số lượng tồn trước và sau mỗi giao dịch.
      </p>
    </section>
  );
}
