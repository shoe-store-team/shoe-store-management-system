import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { authStore } from "../../stores/authStore";
import { authService } from "../../services/authService";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const from = (location.state as { from?: string } | null)?.from;

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await authService.login({ email, password });

      const { token, user } = result;

      if (!token) throw new Error("API không trả về token");
      if (!user) throw new Error("API không trả về thông tin người dùng");

      authStore.setAuth(token, {
        name: user.name,
        email: user.email,
        id: user.id,
        role: user.role,
      });

      if (user.role === "ADMIN") {
        navigate("/admin", { replace: true });
      } else if (user.role === "WAREHOUSE_STAFF") {
        navigate("/admin/inventory", { replace: true });
      } else {
        navigate(from?.startsWith("/") && !from.startsWith("//") ? from : "/", {
          replace: true,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi kết nối API");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <h2>Đăng nhập</h2>

      <form onSubmit={handleLogin}>
        <div>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label>Mật khẩu</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <div style={{ textAlign: "right", marginTop: "8px" }}>
          <a href="/forgot-password">Quên mật khẩu?</a>
        </div>

        {error && <p style={{ color: "red" }}>{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>

        <div className="login-register">
          <span>Chưa có tài khoản?</span>
          <Link to="/register">Đăng ký ngay</Link>
        </div>
      </form>
    </div>
  );
}
