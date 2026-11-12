import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import "./StockExportPage.css";
import { authStore } from "../../../stores/authStore";

const API_URL = "http://localhost:3000/api/inventory";

type Variant = {
  id: string;
  size: number;
  color: string;
  stock: number;
  product: { name: string };
};
// type Operator = {
//   id: string;
//   name: string | null;
//   email: string;
//   role: string;
// };
type Line = { variantId: string; quantity: number };
type Document = { id: string; code: string };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = authStore.getToken();

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...init?.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Yêu cầu không thành công.");
  }

  return result;
}

function variantLabel(variant: Variant) {
  return `${variant.product.name} · size ${variant.size} · ${variant.color}`;
}

export function StockExportPage() {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [draft, setDraft] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
  request<Variant[]>("/variants")
    .then((availableVariants) => {
      setVariants(availableVariants);
      setSelectedVariantId(availableVariants[0]?.id ?? "");
    })
    .catch((cause: unknown) =>
      setError(
        cause instanceof Error ? cause.message : "Không thể tải dữ liệu kho.",
      ),
    )
    .finally(() => setLoading(false));
}, []);

  function addLine() {
    if (
      !selectedVariantId ||
      lines.some((line) => line.variantId === selectedVariantId)
    )
      return;
    const selected = variants.find((v) => v.id === selectedVariantId);
    if (selected && selected.stock <= 0) {
      setError(
        `Sản phẩm "${variantLabel(selected)}" đã hết hàng trong kho (tồn = 0), không thể xuất!`,
      );
      return;
    }
    setError("");
    setLines((current) => [
      ...current,
      { variantId: selectedVariantId, quantity: 1 },
    ]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
   if (lines.length === 0) {
  setError("Hãy thêm ít nhất một biến thể.");
  return;
}

    const insufficientLine = lines.find((line) => {
      const variant = variants.find((v) => v.id === line.variantId);
      return !variant || line.quantity > variant.stock;
    });
    if (insufficientLine) {
      const variant = variants.find((v) => v.id === insufficientLine.variantId);
      setError(
        variant
          ? `Tồn kho không đủ: "${variantLabel(variant)}" chỉ còn ${variant.stock} sản phẩm (đang yêu cầu xuất ${insufficientLine.quantity}).`
          : "Có sản phẩm không đủ tồn kho để xuất.",
      );
      return;
    }

    setSaving(true);
    try {
      let document = draft;
      if (!document) {
        document = await request<Document>("/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "EXPORT",
            reason,
            note,
            items: lines.map((line) => line),
          }),
        });
        setDraft(document);
        setMessage(
          `Đã tạo phiếu nháp ${document.code}. Xác nhận để trừ tồn kho.`,
        );
        return;
      }

      await request(`/documents/${document.id}/items`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: lines }),
      });
      await request(`/documents/${document.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      setDraft(null);
      setLines([]);
      setReason("");
      setNote("");
      setMessage(
        `Đã xác nhận phiếu ${document.code}; tồn kho đã được cập nhật.`,
      );
      setVariants(await request<Variant[]>("/variants"));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể xử lý phiếu xuất.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function cancelDraft() {
    if (!draft) return;

    const confirmed = window.confirm(
      `Bạn có chắc muốn hủy phiếu xuất ${draft.code}?`,
    );
    if (!confirmed) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await request(`/documents/${draft.id}/cancel`, {
        method: "POST",
      });

      setDraft(null);
      setLines([]);
      setReason("");
      setNote("");

      setMessage(`Đã hủy phiếu xuất ${draft.code} thành công.`);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể hủy phiếu xuất.",
      );
    } finally {
      setSaving(false);
    }
  }

  const totalSystemStock = variants.reduce((sum, v) => sum + v.stock, 0);
  const totalExportQty = lines.reduce((sum, l) => sum + (l.quantity || 0), 0);
  const outOfStockCount = variants.filter((v) => v.stock === 0).length;

  return (
    <section className="stock-export">
      <header className="inv-page-header">
        <div>
          <p className="inv-eyebrow">INVENTORY MANAGEMENT · STOCK OUT</p>
          <h2>Xuất kho</h2>
          <p>Kiểm tra tồn khả dụng trước khi xác nhận xuất hàng; hệ thống tự động chặn xuất vượt tồn.</p>
        </div>
        <span className={`inv-header-badge ${draft ? "is-draft" : ""}`}>
          {draft ? `● Phiếu nháp: ${draft.code}` : "Kiểm soát tồn kho nguyên tử"}
        </span>
      </header>

      <nav className="inventory-nav" aria-label="Điều hướng kho">
        <Link to="/admin/inventory/check">◈ Kiểm kê</Link>
        <Link to="/admin/inventory/import">＋ Nhập kho</Link>
        <Link to="/admin/inventory/export" className="active">
          － Xuất kho
        </Link>
        <Link to="/admin/inventory/adjustment">⇄ Điều chỉnh</Link>
        <Link to="/admin/inventory/history">☰ Lịch sử</Link>
      </nav>

      <div className="inv-stat-grid">
        <article className="inv-stat-card">
          <span className="inv-stat-icon">◈</span>
          <small>BIẾN THỂ KHẢ DỤNG</small>
          <strong>{variants.length - outOfStockCount}</strong>
          <em>Trên tổng {variants.length} biến thể</em>
        </article>
        <article className="inv-stat-card">
          <span className="inv-stat-icon sage">▦</span>
          <small>TỒN KHO HIỆN TẠI</small>
          <strong>{totalSystemStock.toLocaleString("vi-VN")}</strong>
          <em>Trước khi xuất</em>
        </article>
        <article className="inv-stat-card">
          <span className="inv-stat-icon sand">－</span>
          <small>TỔNG SỐ LƯỢNG XUẤT</small>
          <strong>-{totalExportQty.toLocaleString("vi-VN")}</strong>
          <em>{lines.length} dòng biến thể</em>
        </article>
        <article className="inv-stat-card">
          <span className="inv-stat-icon rose">!</span>
          <small>HẾT HÀNG (TỒN = 0)</small>
          <strong>{outOfStockCount}</strong>
          <em>Cần nhập bổ sung</em>
        </article>
      </div>

      {error && (
        <p className="inventory-alert inventory-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="inventory-alert inventory-success" role="status">
          {message}
        </p>
      )}

      {loading ? (
        <div className="inventory-card">
          <p className="inventory-empty">Đang tải dữ liệu kho...</p>
        </div>
      ) : (
        <form className="inventory-card" onSubmit={submit}>
          <div className="inv-section-title">
            <div>
              <h3>Thông tin phiếu xuất kho</h3>
              <p>Xuất chuyển kho, xuất hủy hàng lỗi hoặc xuất theo yêu cầu nội bộ.</p>
            </div>
          </div>

          <div className="export-form">
           
            <label>
              Lý do xuất
              <input
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Ví dụ: Xuất hàng trưng bày / chuyển chi nhánh"
                disabled={Boolean(draft)}
              />
            </label>
            <label>
              Ghi chú
              <input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Người nhận, bộ phận yêu cầu..."
                disabled={Boolean(draft)}
              />
            </label>
          </div>

        

          <div className="inv-picker-box">
            <label>
              Biến thể
              <select
                value={selectedVariantId}
                onChange={(event) => setSelectedVariantId(event.target.value)}
                disabled={Boolean(draft)}
              >
                {variants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variantLabel(variant)} — còn {variant.stock}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={addLine}
              disabled={!variants.length || Boolean(draft)}
            >
              ＋ Thêm sản phẩm
            </button>
          </div>

          <div className="inventory-table">
            <table>
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>Tồn hiện tại</th>
                  <th>Số lượng xuất</th>
                  <th>Tồn sau xuất</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const variant = variants.find(
                    (entry) => entry.id === line.variantId,
                  );
                  if (!variant) return null;
                  const afterStock = variant.stock - line.quantity;
                  return (
                    <tr key={line.variantId}>
                      <td>
                        <div className="inv-variant-cell">
                          <strong>{variant.product.name}</strong>
                          <span className="inv-variant-meta">
                            <span className="inv-chip">Size {variant.size}</span>
                            <span className="inv-chip">{variant.color}</span>
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="inv-stock-pill">{variant.stock}</span>
                      </td>
                      <td>
                        <input
                          aria-label="Số lượng xuất"
                          type="number"
                          min="1"
                          max={variant.stock}
                          step="1"
                          value={line.quantity}
                          onChange={(event) =>
                            setLines((current) =>
                              current.map((entry) =>
                                entry.variantId === line.variantId
                                  ? {
                                      ...entry,
                                      quantity: Number(event.target.value),
                                    }
                                  : entry,
                              ),
                            )
                          }
                          required
                        />
                      </td>
                      <td>
                        <span
                          className={`inv-stock-pill ${
                            afterStock < 0 ? "negative" : "neutral"
                          }`}
                        >
                          {afterStock} (-{line.quantity})
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn-secondary"
                          type="button"
                          disabled={Boolean(draft)}
                          onClick={() =>
                            setLines((current) =>
                              current.filter(
                                (entry) => entry.variantId !== line.variantId,
                              ),
                            )
                          }
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {lines.length === 0 && (
                  <tr>
                    <td className="inventory-empty" colSpan={5}>
                      Chưa có sản phẩm trong phiếu. Hãy chọn biến thể phía trên và bấm "Thêm sản phẩm".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="inv-footer-bar">
            <button
              type="submit"
              disabled={saving || !lines.length}
            >
              {saving
                ? "Đang xử lý..."
                : draft
                  ? `✓ Xác nhận phiếu ${draft.code}`
                  : "Tạo phiếu nháp"}
            </button>

            {draft && (
              <div className="draft-actions">
                <p>Phiếu nháp được lưu. Bạn có thể sửa số lượng rồi xác nhận.</p>
                <button
                  type="button"
                  className="btn-danger-outline"
                  onClick={cancelDraft}
                  disabled={saving}
                >
                  {saving ? "Đang hủy..." : "Hủy phiếu xuất"}
                </button>
              </div>
            )}
          </div>
        </form>
      )}

      <p className="inv-footnote">
        Shoe Store Admin · Tự động ngăn chặn xuất vượt tồn kho khả dụng.
      </p>
    </section>
  );
}
