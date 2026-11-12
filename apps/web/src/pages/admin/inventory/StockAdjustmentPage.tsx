import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import "./StockAdjustmentPage.css";
import { authStore } from "../../../stores/authStore";

const API_URL = "http://localhost:3000/api/inventory";

type Variant = {
  id: string;
  size: number;
  color: string;
  stock: number;
  product: { name: string };
};

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

export function StockAdjustmentPage() {
  const [variants, setVariants] = useState<Variant[]>([]);
  // const [operators, setOperators] = useState<Operator[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  // const [operatorId, setOperatorId] = useState("");
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
    const variant = variants.find((entry) => entry.id === selectedVariantId);
    if (!variant || lines.some((line) => line.variantId === variant.id)) return;
    setLines((current) => [
      ...current,
      { variantId: variant.id, quantity: variant.stock },
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

    setSaving(true);
    try {
      let document = draft;
      if (!document) {
        document = await request<Document>("/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "ADJUSTMENT",
            reason,
            note,
            items: lines,
          }),
        });
        setDraft(document);
        setMessage(
          `Đã tạo phiếu nháp ${document.code}. Xác nhận để áp dụng tồn kho mới.`,
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
        cause instanceof Error
          ? cause.message
          : "Không thể xử lý phiếu điều chỉnh.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function cancelDraft() {
    if (!draft) return;

    const confirmed = window.confirm(
      `Bạn có chắc muốn hủy phiếu điều chỉnh ${draft.code}?`,
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

      setMessage(`Đã hủy phiếu điều chỉnh ${draft.code} thành công.`);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Không thể hủy phiếu điều chỉnh.",
      );
    } finally {
      setSaving(false);
    }
  }

  const totalSystemStock = variants.reduce((sum, v) => sum + v.stock, 0);
  const netDelta = lines.reduce((sum, line) => {
    const v = variants.find((entry) => entry.id === line.variantId);
    return sum + (v ? line.quantity - v.stock : 0);
  }, 0);

  return (
    <section className="stock-adjustment">
      <header className="inv-page-header">
        <div>
          <p className="inv-eyebrow">INVENTORY MANAGEMENT · ADJUSTMENT</p>
          <h2>Điều chỉnh tồn kho</h2>
          <p>
            Điều chỉnh tồn hiện tại về số lượng mới và lưu lại chứng từ đối
            soát.
          </p>
        </div>
        <span className={`inv-header-badge ${draft ? "is-draft" : ""}`}>
          {draft
            ? `● Phiếu nháp: ${draft.code}`
            : "Cập nhật trực tiếp theo biến thể"}
        </span>
      </header>

      <nav className="inventory-nav" aria-label="Điều hướng kho">
        <Link to="/admin/inventory/check">◈ Kiểm kê</Link>
        <Link to="/admin/inventory/import">＋ Nhập kho</Link>
        <Link to="/admin/inventory/export">－ Xuất kho</Link>
        <Link to="/admin/inventory/adjustment" className="active">
          ⇄ Điều chỉnh
        </Link>
        <Link to="/admin/inventory/history">☰ Lịch sử</Link>
      </nav>

      <div className="inv-stat-grid">
        <article className="inv-stat-card">
          <span className="inv-stat-icon">◈</span>
          <small>TỔNG BIẾN THỂ</small>
          <strong>{variants.length}</strong>
          <em>Trong hệ thống</em>
        </article>
        <article className="inv-stat-card">
          <span className="inv-stat-icon sage">▦</span>
          <small>TỔN KHO HIỆN TẠI</small>
          <strong>{totalSystemStock.toLocaleString("vi-VN")}</strong>
          <em>Tất cả size/màu</em>
        </article>
        <article className="inv-stat-card">
          <span className="inv-stat-icon sand">⇄</span>
          <small>DÒNG ĐIỀU CHỈNH</small>
          <strong>{lines.length}</strong>
          <em>Đang chọn trong phiếu</em>
        </article>
        <article className="inv-stat-card">
          <span className="inv-stat-icon rose">±</span>
          <small>BIẾN ĐỘNG DỰ KIẾN</small>
          <strong>{netDelta > 0 ? `+${netDelta}` : netDelta}</strong>
          <em>Chênh lệch tổng</em>
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
              <h3>Thông tin phiếu điều chỉnh</h3>
              <p>
                Ghi rõ nguyên nhân điều chỉnh (hàng hư hỏng, thất thoát, cân
                bằng kho...).
              </p>
            </div>
          </div>

          <div className="adjustment-form">
            <label>
              Lý do điều chỉnh
              <input
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Ví dụ: Hàng lỗi hoặc sai lệch số liệu"
                disabled={Boolean(draft)}
              />
            </label>
            <label>
              Ghi chú
              <input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Biên bản kèm theo..."
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
                    {variantLabel(variant)} — tồn {variant.stock}
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

          <div className="bang-bao">
            <table>
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>Tồn hiện tại</th>
                  <th>Tồn kho mới</th>
                  <th>Chênh lệch</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const variant = variants.find(
                    (entry) => entry.id === line.variantId,
                  );
                  if (!variant) return null;
                  const diff = line.quantity - variant.stock;
                  return (
                    <tr key={line.variantId}>
                      <td>
                        <div className="inv-variant-cell">
                          <strong>{variant.product.name}</strong>
                          <span className="inv-variant-meta">
                            <span className="inv-chip">
                              Size {variant.size}
                            </span>
                            <span className="inv-chip">{variant.color}</span>
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="inv-stock-pill">{variant.stock}</span>
                      </td>
                      <td>
                        <input
                          aria-label="Tồn kho mới"
                          type="number"
                          min="0"
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
                            diff > 0
                              ? "positive"
                              : diff < 0
                                ? "negative"
                                : "neutral"
                          }`}
                        >
                          {diff > 0 ? `+${diff}` : diff}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn-secondary"
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
                    <td className="khong-co-du-lieu" colSpan={5}>
                      Chưa có sản phẩm trong phiếu. Hãy chọn biến thể phía trên
                      và bấm "Thêm sản phẩm".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="inv-footer-bar">
            <button type="submit" disabled={saving || !lines.length}>
              {saving
                ? "Đang xử lý..."
                : draft
                  ? `✓ Xác nhận phiếu ${draft.code}`
                  : "Tạo phiếu nháp"}
            </button>

            {draft && (
              <div className="draft-actions">
                <p>
                  Phiếu nháp được lưu. Bạn có thể sửa tồn kho mới rồi xác nhận.
                </p>
                <button
                  type="button"
                  className="btn-danger-outline"
                  onClick={cancelDraft}
                  disabled={saving}
                >
                  {saving ? "Đang hủy..." : "Hủy phiếu điều chỉnh"}
                </button>
              </div>
            )}
          </div>
        </form>
      )}

      <p className="inv-footnote">
        Shoe Store Admin · Mọi điều chỉnh tồn kho đều lưu dấu vết trước/sau.
      </p>
    </section>
  );
}
