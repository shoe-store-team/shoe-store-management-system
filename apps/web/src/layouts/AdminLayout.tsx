import { Link, Outlet, useNavigate } from "react-router-dom";
import { authStore } from "../stores/authStore";

export function AdminLayout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    authStore.logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <Link to="/" className="store-brand">
          <span className="brand-mark">S</span>
          <span>SHOE STORE</span>
        </Link>

        <p className="admin-label">QUẢN TRỊ</p>

        <nav className="admin-nav">
          <Link to="/admin/dashboard">Tổng quan</Link>
          <Link to="/admin/products">Sản phẩm</Link>
          <Link to="/admin/orders">Đơn hàng</Link>
          <Link to="/admin/inventory">Kho hàng</Link>
          <Link to="/admin/promotions">Khuyến mãi</Link>
          <Link to="/admin/users">Người dùng</Link>
        </nav>

        <button type="button" className="admin-back" onClick={handleLogout}>
          Đăng xuất
        </button>
      </aside>

      <div className="admin-content">
        <header className="admin-topbar">
          <span>Hệ thống quản trị</span>
        </header>

        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
