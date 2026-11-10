import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import "./InventoryCheckPage.css";

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
type Line = { variantId: string; countedStock: number };
type Document = { id: string; code: string };
type Discrepancy = {
  variantId: string;
  currentStock: number;
  countedStock: number;
  difference: number;
};
type AdjustmentLine = { variantId: string; quantity: number };
type AuditResult = {
  type: "MATCHED" | "ADJUSTMENT_REQUIRED";
  message: string;
  discrepancies?: Discrepancy[];
  adjustmentDocument?: Document;
};

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

export function InventoryCheckPage() {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [operatorId, setOperatorId] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [draft, setDraft] = useState<Document | null>(null);
  const [pendingAdjustment, setPendingAdjustment] = useState<Document | null>(
    null,
  );
  const [discrepancies, setDiscrepancies] = useState<Discrepancy[]>([]);
  const [adjustmentLines, setAdjustmentLines] = useState<AdjustmentLine[]>([]);
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
      { variantId: variant.id, countedStock: variant.stock },
    ]);
  }

  function addAllVariants() {
    setLines((current) => {
      const existingIds = new Set(current.map((line) => line.variantId));
      const newLines = variants
        .filter((v) => !existingIds.has(v.id))
        .map((v) => ({ variantId: v.id, countedStock: v.stock }));
      return [...current, ...newLines];
    });
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
      if (pendingAdjustment) {
        await request(`/documents/${pendingAdjustment.id}/items`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: adjustmentLines }),
        });
        await request(`/documents/${pendingAdjustment.id}/confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmedById: operatorId }),
        });
        setDraft(null);
        setPendingAdjustment(null);
        setDiscrepancies([]);
        setAdjustmentLines([]);
        setLines([]);
        setReason("");
        setNote("");
        setMessage(
          `Đã xác nhận phiếu điều chỉnh ${pendingAdjustment.code}; tồn kho đã cập nhật và kiểm kê hoàn tất.`,
        );
        setVariants(await request<Variant[]>("/variants"));
        return;
      }

      let document = draft;
      if (!document) {
        document = await request<Document>("/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "COUNT",
            createdById: operatorId,
            reason: reason || "Kiểm kê tồn kho",
            note,
            items: lines,
          }),
        });
        setDraft(document);
        setMessage(
          `Đã tạo phiếu kiểm kê nháp ${document.code}. Xác nhận để chốt số liệu.`,
        );
        return;
      }
      await request(`/documents/${document.id}/items`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: lines }),
      });
      const result = await request<AuditResult>(
        `/documents/${document.id}/confirm`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmedById: operatorId }),
        },
      );
      if (result.type === "ADJUSTMENT_REQUIRED" && result.adjustmentDocument) {
        setPendingAdjustment(result.adjustmentDocument);
        setDiscrepancies(result.discrepancies ?? []);
        setAdjustmentLines(
          (result.discrepancies ?? []).map((difference) => ({
            variantId: difference.variantId,
            quantity: difference.countedStock,
          })),
        );
        setMessage(
          `${result.message} Vui lòng kiểm tra chênh lệch rồi xác nhận phiếu điều chỉnh.`,
        );
        return;
      }
      setDraft(null);
      setLines([]);
      setReason("");
      setNote("");
      setMessage(
        result.type === "MATCHED"
          ? `Kiểm kê ${document.code} khớp với tồn hệ thống và đã hoàn tất.`
          : `Đã hoàn tất kiểm kê ${document.code}.`,
      );
      setVariants(await request<Variant[]>("/variants"));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Không thể xử lý phiếu kiểm kê.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function cancelDraft() {
    const document = pendingAdjustment ?? draft;
    if (!document) return;

    const confirmed = window.confirm(
      `Bạn có chắc muốn hủy phiếu ${document.code}?`,
    );
    if (!confirmed) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await request(`/documents/${document.id}/cancel`, {
        method: "POST",
      });

      setDraft(null);
      setPendingAdjustment(null);
      setDiscrepancies([]);
      setAdjustmentLines([]);
      setLines([]);
      setReason("");
      setNote("");

      setMessage(`Đã hủy phiếu ${document.code} thành công.`);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể hủy phiếu kiểm kê.",
      );
    } finally {
      setSaving(false);
    }
  }

  const totalSystemStock = variants.reduce((sum, v) => sum + v.stock, 0);
  const lowStockCount = variants.filter((v) => v.stock <= 5).length;
  const mismatchCount = lines.filter((line) => {
    const v = variants.find((entry) => entry.id === line.variantId);
    return v && line.countedStock !== v.stock;
  }).length;

  return (
    <section className="inventory-check">
      <header className="inv-page-header">
        <div>
          <p className="inv-eyebrow">INVENTORY MANAGEMENT · AUDIT</p>
          <h2>Kiểm kê tồn kho</h2>
          <p>
            Nhập số lượng đếm thực tế theo từng size/màu; hệ thống tự động đối chiếu và sinh phiếu điều chỉnh khi lệch.
          </p>
        </div>
        <span className={`inv-header-badge ${draft || pendingAdjustment ? "is-draft" : ""}`}>
          {pendingAdjustment
            ? `● Chờ xác nhận ĐC: ${pendingAdjustment.code}`
            : draft
              ? `● Phiếu nháp: ${draft.code}`
              : `${variants.length} biến thể đang hoạt động`}
        </span>
      </header>

      <nav className="inventory-nav" aria-label="Điều hướng kho">
        <Link className="active" to="/admin/inventory/check">
          ◈ Kiểm kê
        </Link>
        <Link to="/admin/inventory/import">＋ Nhập kho</Link>
        <Link to="/admin/inventory/export">－ Xuất kho</Link>
        <Link to="/admin/inventory/adjustment">⇄ Điều chỉnh</Link>
        <Link to="/admin/inventory/history">☰ Lịch sử</Link>
      </nav>

      <div className="inv-stat-grid">
        <article className="inv-stat-card">
          <span className="inv-stat-icon">◈</span>
          <small>TỔNG BIẾN THỂ</small>
          <strong>{variants.length}</strong>
          <em>Size & màu sắc</em>
        </article>
        <article className="inv-stat-card">
          <span className="inv-stat-icon sage">▦</span>
          <small>TỔNG TỒN HỆ THỐNG</small>
          <strong>{totalSystemStock.toLocaleString("vi-VN")}</strong>
          <em>Đôi giày trong kho</em>
        </article>
        <article className="inv-stat-card">
          <span className="inv-stat-icon sand">◇</span>
          <small>DÒNG ĐANG KIỂM KÊ</small>
          <strong>{lines.length}</strong>
          <em>{mismatchCount > 0 ? `${mismatchCount} dòng lệch` : "Khớp tạm thời"}</em>
        </article>
        <article className="inv-stat-card">
          <span className="inv-stat-icon rose">!</span>
          <small>BIẾN THỂ TỒN THẤP</small>
          <strong>{lowStockCount}</strong>
          <em>Có tồn kho ≤ 5</em>
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

      {pendingAdjustment && (
        <section
          className="inventory-card"
          aria-label="Phiếu điều chỉnh chờ xác nhận"
        >
          <div className="inv-section-title">
            <div>
              <h3>Chênh lệch kiểm kê — Phiếu {pendingAdjustment.code}</h3>
              <p>
                Hệ thống chưa thay đổi tồn kho. Kiểm tra hoặc chỉnh số tồn đề xuất, sau đó xác nhận phiếu để áp dụng.
              </p>
            </div>
          </div>
          <div className="bang-bao">
            <table>
              <thead>
                <tr>
                  <th>Biến thể</th>
                  <th>Tồn khi đối chiếu</th>
                  <th>Số đếm thực tế</th>
                  <th>Tồn sau điều chỉnh</th>
                </tr>
              </thead>
              <tbody>
                {discrepancies.map((difference) => {
                  const variant = variants.find(
                    (entry) => entry.id === difference.variantId,
                  );
                  const adjustmentLine = adjustmentLines.find(
                    (line) => line.variantId === difference.variantId,
                  );
                  return (
                    <tr key={difference.variantId}>
                      <td>
                        {variant ? variantLabel(variant) : difference.variantId}
                      </td>
                      <td>
                        <span className="inv-stock-pill">
                          {difference.currentStock}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`inv-stock-pill ${
                            difference.difference > 0 ? "positive" : "negative"
                          }`}
                        >
                          {difference.countedStock} (
                          {difference.difference > 0
                            ? `+${difference.difference}`
                            : difference.difference}
                          )
                        </span>
                      </td>
                      <td>
                        <input
                          aria-label={`Tồn điều chỉnh cho ${variant ? variantLabel(variant) : difference.variantId}`}
                          type="number"
                          min="0"
                          step="1"
                          value={
                            adjustmentLine?.quantity ?? difference.countedStock
                          }
                          onChange={(event) =>
                            setAdjustmentLines((current) =>
                              current.map((line) =>
                                line.variantId === difference.variantId
                                  ? {
                                      ...line,
                                      quantity: Number(event.target.value),
                                    }
                                  : line,
                              ),
                            )
                          }
                          required
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {loading ? (
        <div className="inventory-card">
          <p className="inventory-empty">Đang tải dữ liệu kho...</p>
        </div>
      ) : (
        <form className="inventory-card" onSubmit={submit}>
          <div className="inv-section-title">
            <div>
              <h3>Thông tin biên bản kiểm kê</h3>
              <p>Chọn nhân viên phụ trách và các biến thể cần đối chiếu số liệu thực tế.</p>
            </div>
          </div>

          <div className="hang-form">
            <label>
              Người kiểm kê / xác nhận
              <select
                value={operatorId}
                onChange={(event) => setOperatorId(event.target.value)}
                required
                disabled={Boolean(pendingAdjustment)}
              >
                <option value="">Chọn nhân viên</option>
                {operators.map((operator) => (
                  <option key={operator.id} value={operator.id}>
                    {operator.name || operator.email} ({operator.role})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Lý do kiểm kê
              <input
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Ví dụ: Kiểm kê định kỳ cuối tuần"
                disabled={Boolean(draft)}
              />
            </label>
            <label>
              Ghi chú
              <input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Ghi chú kệ hàng, ca trực..."
                disabled={Boolean(draft)}
              />
            </label>
          </div>

          {operators.length === 0 && (
            <p className="thong-bao-loi">
              Chưa có tài khoản ADMIN hoặc WAREHOUSE_STAFF đang hoạt động.
            </p>
          )}

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
                    {variantLabel(variant)} — hệ thống {variant.stock}
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
            <button
              type="button"
              className="btn-secondary"
              onClick={addAllVariants}
              disabled={!variants.length || Boolean(draft)}
            >
              Thêm tất cả ({variants.length})
            </button>
          </div>

          <div className="bang-bao">
            <table>
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>Tồn trên hệ thống</th>
                  <th>Số lượng thực đếm</th>
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
                  const diff = line.countedStock - variant.stock;
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
                          aria-label="Số lượng thực đếm"
                          type="number"
                          min="0"
                          step="1"
                          value={line.countedStock}
                          onChange={(event) =>
                            setLines((current) =>
                              current.map((entry) =>
                                entry.variantId === line.variantId
                                  ? {
                                      ...entry,
                                      countedStock: Number(event.target.value),
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
                      Chưa có sản phẩm trong phiếu kiểm kê. Hãy chọn biến thể và bấm "Thêm sản phẩm".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="inv-footer-bar">
            <button
              type="submit"
              disabled={saving || !operatorId || !lines.length}
            >
              {saving
                ? "Đang xử lý..."
                : pendingAdjustment
                  ? `✓ Xác nhận phiếu điều chỉnh ${pendingAdjustment.code}`
                  : draft
                    ? `✓ Đối chiếu phiếu ${draft.code}`
                    : "Tạo phiếu nháp"}
            </button>

            {(draft || pendingAdjustment) && (
              <div className="draft-actions">
                <p>
                  {pendingAdjustment
                    ? "Phiếu điều chỉnh đang chờ xác nhận."
                    : "Phiếu nháp được lưu. Bạn có thể sửa số đếm rồi đối chiếu."}
                </p>
                <button
                  type="button"
                  className="btn-danger-outline"
                  onClick={cancelDraft}
                  disabled={saving}
                >
                  {saving ? "Đang hủy..." : "Hủy phiếu kiểm kê"}
                </button>
              </div>
            )}
          </div>
        </form>
      )}

      <p className="inv-footnote">
        Shoe Store Admin · Dữ liệu kho đồng bộ theo thời gian thực với ProductVariant.
      </p>
    </section>
  );
}
