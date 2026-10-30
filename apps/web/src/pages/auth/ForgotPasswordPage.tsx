import { useState } from "react";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const API = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

  async function handleRequestOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch(`${API}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message);

      setOtpSent(true);
      setMessage("Đã gửi yêu cầu. Hãy lấy OTP ở terminal Backend.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Lỗi kết nối API");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    if (newPassword !== confirmPassword) {
      setMessage("Mật khẩu xác nhận không khớp");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message);
      alert("Đổi mật khẩu thành công! Vui lòng đăng nhập lại.");
      window.location.href = "/login";
      return;
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Lỗi kết nối API");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <h2>Quên mật khẩu</h2>

      {!otpSent ? (
        <form onSubmit={handleRequestOtp}>
          <div>
            <label>Email đã đăng ký</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Đang gửi..." : "Gửi yêu cầu"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleResetPassword}>
          <p>Email: {email}</p>

          <div>
            <label>Mã OTP</label>
            <input
              inputMode="numeric"
              maxLength={6}
              pattern="[0-9]{6}"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Nhập mã 6 số"
              required
            />
          </div>

          <div>
            <label>Mật khẩu mới</label>
            <input
              type="password"
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>

          <div>
            <label>Xác nhận mật khẩu mới</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Đang cập nhật..." : "Đặt lại mật khẩu"}
          </button>
        </form>
      )}

      {message && <p role="status">{message}</p>}

      <p>
        <a href="/login">Quay lại đăng nhập</a>
      </p>
    </div>
  );
}
