import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import "./StockAdjustmentPage.css";

const API_URL = "http://localhost:3000/api/inventory";

type Variant = {
  id: string;
  size: number;
  color: string;
  stock: number;
  product: { name: string };
};
type Operator = {
  id: string;
  name: string | null;
  email: string;
  role: string;
};
type Line = { variantId: string; quantity: number };
type Document = { id: string; code: string };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, init);
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.message || "Yêu cầu không thành công.");
  return result;
}

function variantLabel(variant: Variant) {
  return `${variant.product.name} · size ${variant.size} · ${variant.color}`;
}

export function StockAdjustmentPage() {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [operatorId, setOperatorId] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [draft, setDraft] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    Promise.all([
      request<Variant[]>("/variants"),
      request<Operator[]>("/operators"),
    ])
      .then(([availableVariants, availableOperators]) => {
        setVariants(availableVariants);
        setOperators(availableOperators);
        setSelectedVariantId(availableVariants[0]?.id ?? "");
        setOperatorId(availableOperators[0]?.id ?? "");
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
    if (!operatorId || lines.length === 0) {
      setError("Hãy chọn người lập phiếu và thêm ít nhất một biến thể.");
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
            createdById: operatorId,
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
        body: JSON.stringify({ confirmedById: operatorId }),
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
  return (
    <section className="stock-adjustment">
      <header className="inventory-heading">
        <div>
          <h2>Điều chỉnh tồn kho</h2>
          <p>Điều chỉnh tồn hiện tại về số lượng mới và lưu lại chứng từ.</p>
        </div>
      </header>
      <nav className="inventory-nav" aria-label="Điều hướng kho">
        <Link to="/admin/inventory/check">Kiểm kê</Link>
        <Link to="/admin/inventory/history">Lịch sử</Link>
        <Link to="/admin/inventory/adjustment" className="active">
          Điều chỉnh
        </Link>
        <Link to="/admin/inventory/export">Xuất kho</Link>
        <Link to="/admin/inventory/import">Nhập kho</Link>
      </nav>
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
        <p>Đang tải dữ liệu kho...</p>
      ) : (
        <form className="inventory-card" onSubmit={submit}>
          <label>
            Người lập / xác nhận
            <select
              value={operatorId}
              onChange={(event) => setOperatorId(event.target.value)}
              required
            >
              <option value="">Chọn nhân viên</option>
              {operators.map((operator) => (
                <option key={operator.id} value={operator.id}>
                  {operator.name || operator.email} ({operator.role})
                </option>
              ))}
            </select>
          </label>
          {operators.length === 0 && (
            <p className="thong-bao-loi">
              Chưa có tài khoản ADMIN hoặc WAREHOUSE_STAFF đang hoạt động.
            </p>
          )}
          <div className="hang-form">
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
                disabled={Boolean(draft)}
              />
            </label>
          </div>
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "end",
              margin: "16px 0",
            }}
          >
            <label style={{ flex: 1 }}>
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
              Thêm sản phẩm
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
                  return (
                    <tr key={line.variantId}>
                      <td>{variantLabel(variant)}</td>
                      <td>{variant.stock}</td>
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
                      <td>{line.quantity - variant.stock}</td>
                      <td>
                        <button
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
                    <td className="khong-co-du-lieu" colSpan={5}>
                      Chưa có sản phẩm trong phiếu.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <button
            type="submit"
            disabled={saving || !operatorId || !lines.length}
          >
            {saving
              ? "Đang xử lý..."
              : draft
                ? `Xác nhận phiếu ${draft.code}`
                : "Tạo phiếu nháp"}
          </button>
          {draft && (
            <div className="draft-actions">
              <p>
                Phiếu nháp được lưu. Bạn có thể sửa tồn kho mới rồi xác nhận.
              </p>

              <button
                type="button"
                className="btn-secondary"
                onClick={cancelDraft}
                disabled={saving}
              >
                {saving ? "Đang hủy..." : "Hủy phiếu điều chỉnh"}
              </button>
            </div>
          )}
        </form>
      )}
    </section>
  );
}
