/** Trang HTML của cổng thanh toán giả lập (chỉ dùng khi PAYMENT_PROVIDER=mock và PAYMENT_MOCK_QR=true). */

const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function renderMockGateway(p: { reference: string; orderCode: string; amount: number; status: string; expiresAt: string | null }) {
  const amount = p.amount.toLocaleString("vi-VN") + " ₫";
  const expires = p.expiresAt ? new Date(p.expiresAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "";
  const done = p.status !== "PENDING";
  return `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Cổng thanh toán giả lập</title>
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f1f0eb;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#20202a}
  .card{width:min(400px,92vw);background:#fff;border:1px solid #dfded8;padding:28px 24px;text-align:center}
  .badge{display:inline-block;background:#fff2e1;color:#a65e19;font-size:11px;font-weight:700;letter-spacing:1px;padding:5px 9px;margin-bottom:14px}
  h1{font-size:20px;margin:0 0 4px}.muted{color:#77766f;font-size:13px;margin:0}
  .amount{font-size:30px;font-weight:700;margin:18px 0 4px}
  .row{display:flex;justify-content:space-between;font-size:13px;padding:6px 0;border-top:1px solid #f0efea}.row span{color:#99988f}
  button{width:100%;font:inherit;font-size:15px;font-weight:600;padding:14px;margin-top:10px;cursor:pointer;border:1px solid #191917}
  .ok{background:#191917;color:#fff}.no{background:#fff;color:#a55e62;border-color:#e3c8c5}
  button:disabled{opacity:.5;cursor:not-allowed}
  #msg{margin-top:16px;font-size:14px;font-weight:600}
</style></head>
<body><div class="card">
  <div class="badge">CỔNG GIẢ LẬP · KHÔNG TRỪ TIỀN THẬT</div>
  <h1>Thanh toán đơn hàng</h1>
  <p class="muted">#${esc(p.orderCode)}</p>
  <div class="amount">${esc(amount)}</div>
  <div class="row"><span>Mã tham chiếu</span><strong>${esc(p.reference.slice(0, 12))}…</strong></div>
  ${expires ? `<div class="row"><span>Hết hạn lúc</span><strong>${esc(expires)}</strong></div>` : ""}
  <button class="ok" id="ok" ${done ? "disabled" : ""}>Thanh toán thành công</button>
  <button class="no" id="no" ${done ? "disabled" : ""}>Huỷ giao dịch</button>
  <div id="msg">${done ? `Giao dịch đã có kết quả: ${esc(p.status)}` : ""}</div>
</div>
<script>
  const ref = ${JSON.stringify(p.reference)};
  async function send(result) {
    document.getElementById('ok').disabled = true; document.getElementById('no').disabled = true;
    const msg = document.getElementById('msg'); msg.textContent = 'Đang xử lý...';
    try {
      const r = await fetch('/api/payments/mock/' + ref + '/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ result }) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || 'Lỗi');
      msg.textContent = data.status === 'PAID' ? '✓ Thanh toán thành công. Quay lại màn hình máy tính để xem đơn hàng.' : 'Đã huỷ giao dịch.';
      msg.style.color = data.status === 'PAID' ? '#168161' : '#a55e62';
    } catch (e) { msg.textContent = e.message; msg.style.color = '#a55e62'; }
  }
  document.getElementById('ok').onclick = () => send('SUCCESS');
  document.getElementById('no').onclick = () => send('FAILED');
</script></body></html>`;
}
