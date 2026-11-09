import { Link, Outlet, useNavigate } from "react-router-dom";

export function AdminLayout() {
  const navigate = useNavigate();

  // Dang xuat
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("devUserId");

    navigate("/login", { replace: true });
  };

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-logo">
          <h2>SHOE STORE</h2>
          <p>Trang quản trị</p>
        </div>

        <nav className="admin-menu">
          <Link to="/admin/dashboard">Tổng quan</Link>

          <Link to="/admin/products">Quản lý sản phẩm</Link>

          <Link to="/admin/orders">Quản lý đơn hàng</Link>

          <div className="admin-menu-group">
            <p>QUẢN LÝ KHO</p>

            <Link to="/admin/inventory/check">
              Kiểm tra tồn kho
            </Link>

            <Link to="/admin/inventory/history">
              Lịch sử tồn kho
            </Link>

            <Link to="/admin/inventory/adjustment">
              Điều chỉnh tồn kho
            </Link>

            <Link to="/admin/inventory/import">
              Nhập kho
            </Link>

            <Link to="/admin/inventory/export">
              Xuất kho
            </Link>
          </div>

          <Link to="/admin/promotions">Quản lý khuyến mãi</Link>

          <Link to="/admin/users">Quản lý người dùng</Link>
        </nav>

        <div className="admin-sidebar-footer">
          <button type="button" onClick={handleLogout}>
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="admin-main">
        <header className="admin-header">
          <h2>Hệ thống quản lý cửa hàng giày</h2>
        </header>

        <section className="admin-content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
