import { Link, Outlet, useLocation } from "react-router-dom";
import "./CustomerLayout.css";

export function CustomerLayout() {
  const location = useLocation();

  const isAuthPage =
    location.pathname === "/login" ||
    location.pathname === "/register" ||
    location.pathname === "/forgot-password";

  return (
    <div className="customer-layout">
      {!isAuthPage && (
        <header className="customer-header">
          <div className="customer-header-inner">
            <Link to="/" className="customer-logo">
              SHOE STORE
            </Link>

            <nav className="customer-nav">
              <Link to="/">Trang chủ</Link>
              <Link to="/cart">Giỏ hàng</Link>
              <Link to="/profile">Tài khoản</Link>
              <Link to="/login">Đăng nhập</Link>
            </nav>
          </div>
        </header>
      )}

      <main className="customer-main">
        <Outlet />
      </main>

      {!isAuthPage && (
        <footer className="customer-footer">
          <p>© {new Date().getFullYear()} Shoe Store. All rights reserved.</p>
        </footer>
      )}
    </div>
  );
}
