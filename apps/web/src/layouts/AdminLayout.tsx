
import { Link, Outlet } from 'react-router-dom';

export function AdminLayout() {
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

        <Link to="/" className="admin-back">
          ← Quay lại cửa hàng
        </Link>
      </aside>

      <div className="admin-content">
        <header className="admin-topbar">
          <span>Hệ thống quản trị</span>
          <Link to="/">Xem cửa hàng ↗</Link>
        </header>

        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
