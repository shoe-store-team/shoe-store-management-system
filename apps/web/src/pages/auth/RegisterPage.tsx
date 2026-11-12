import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authService } from "../../services/authService";

export function RegisterPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await authService.register(form);

      navigate("/login", {
        state: { message: "Đăng ký thành công. Vui lòng đăng nhập." },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi kết nối API");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <h2>Đăng ký tài khoản</h2>

      <form className="auth-form" onSubmit={handleRegister}>
        <label>
          Họ và tên
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Nhập họ và tên"
            autoComplete="name"
            required
          />
        </label>

        <label>
          Email
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="example@email.com"
            autoComplete="email"
            required
          />
        </label>

        <label>
          Số điện thoại
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="Nhập số điện thoại"
            autoComplete="tel"
            required
          />
        </label>

        <label>
          Mật khẩu
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="Tối thiểu 8 ký tự"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>

        {error && <p className="thong-bao-loi">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "Đang đăng ký..." : "Đăng ký"}
        </button>

        <p>
          Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
        </p>
      </form>
    </div>
  );
}
