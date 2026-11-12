import { Link, Outlet, useLocation } from "react-router-dom";
import { authStore, useAuth } from "../stores/authStore";
import "./CustomerLayout.css";


export function CustomerLayout() {
  const location = useLocation();

  const { isAuthenticated, user } = useAuth();

  const isAuthPage =
    location.pathname === "/login" ||
    location.pathname === "/register" ||
    location.pathname === "/forgot-password";

  const isHomePage = location.pathname === "/";

  const handleLogout = () => {
    authStore.logout();
    window.location.assign("/");
  };

  return (
    <div className="customer-layout">
      {!isAuthPage && !isHomePage && (
        <header className="customer-header">
          <div className="customer-header-inner">
            <Link to="/" className="customer-logo">
              SHOE STORE
            </Link>

            <nav className="customer-nav">
              <Link to="/">Trang chủ</Link>

              {isAuthenticated && user?.role === "CUSTOMER" && (
                <>
                  <Link to="/cart">Giỏ hàng</Link>
                  <Link to="/orders">Lịch sử mua hàng</Link>
                </>
              )}

              {isAuthenticated && user?.role === "ADMIN" && (
                <Link to="/admin/dashboard" className="admin-return-link">
                  Quay lại trang quản trị
                </Link>
              )}

              {isAuthenticated ? (
                <button type="button" onClick={handleLogout}>
                  Đăng xuất
                </button>
              ) : (
                <Link to="/login">Đăng nhập</Link>
              )}
            </nav>
          </div>
        </header>
      )}

      <main className="customer-main">
        <Outlet />
      </main>

      {!isAuthPage && !isHomePage && (
        <footer className="customer-footer">
          <p>© {new Date().getFullYear()} Shoe Store. All rights reserved.</p>
        </footer>
      )}
    </div>
  );
}
