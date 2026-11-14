// import { Link, Outlet, useNavigate, Navigate } from "react-router-dom";
// import { authStore, useAuth } from "../stores/authStore";
// import "./AdminLayout.css";

// export function AdminLayout() {
//   const navigate = useNavigate();
//   const { isAuthenticated, user } = useAuth();

//   if (!isAuthenticated) {
//     return <Navigate to="/login" replace />;
//   }

//   if (user?.role !== "ADMIN") {
//     return <Navigate to="/" replace />;
//   }

//   const handleLogout = () => {
//     authStore.logout();
//     navigate("/login", { replace: true });
//   };

//   return (
//     <div className="admin-layout">
//       <aside className="admin-sidebar">
//         <div className="store-brand">
//           <div className="brand-mark">S</div>
//           <div>
//             <h2>SHOE STORE</h2>
//             <p>Trang quản trị</p>
//           </div>
//         </div>

//         <p className="admin-label">MENU CHÍNH</p>

//         <nav className="admin-nav">
//           <Link className="admin-nav-link" to="/admin/dashboard">
//             <span className="admin-nav-icon">⌂</span>
//             Tổng quan
//           </Link>

//           <Link className="admin-nav-link" to="/admin/products">
//             <span className="admin-nav-icon">▣</span>
//             Quản lý sản phẩm
//           </Link>

//           <Link className="admin-nav-link" to="/admin/orders">
//             <span className="admin-nav-icon">▤</span>
//             Quản lý đơn hàng
//           </Link>

//           <div className="admin-menu-group">
//             <p className="admin-label">QUẢN LÝ KHO</p>

//             <Link className="admin-nav-link" to="/admin/inventory/check">
//               Kiểm tra tồn kho
//             </Link>

//             <Link className="admin-nav-link" to="/admin/inventory/history">
//               Lịch sử tồn kho
//             </Link>

//             <Link className="admin-nav-link" to="/admin/inventory/adjustment">
//               Điều chỉnh tồn kho
//             </Link>

//             <Link className="admin-nav-link" to="/admin/inventory/import">
//               Nhập kho
//             </Link>

//             <Link className="admin-nav-link" to="/admin/inventory/export">
//               Xuất kho
//             </Link>
//           </div>

//           <Link className="admin-nav-link" to="/admin/promotions">
//             Quản lý khuyến mãi
//           </Link>

//           <Link className="admin-nav-link" to="/admin/users">
//             Quản lý người dùng
//           </Link>
//         </nav>

//         <div className="admin-sidebar-bottom">
//           <button type="button" onClick={handleLogout}>
//             Đăng xuất
//           </button>
//         </div>
//       </aside>

//       <main className="admin-main">
//         <header className="admin-topbar">
//           <h2>Hệ thống quản lý cửa hàng giày</h2>
//         </header>

//         <section className="admin-content">
//           <Outlet />
//         </section>
//       </main>
//     </div>
//   );
// }

import { NavLink, Outlet, useNavigate, Navigate } from "react-router-dom";
import { authStore, useAuth } from "../stores/authStore";
import "./AdminLayout.css";

// const menuItems = [
//   { label: "Tổng quan", path: "/admin/dashboard", icon: "▦" },
//   { label: "Sản phẩm", path: "/admin/products", icon: "◇" },
//   { label: "Đơn hàng", path: "/admin/orders", icon: "🛒" },
//   { label: "Kho hàng", path: "/admin/inventory", icon: "▣" },
//   { label: "Khuyến mãi", path: "/admin/promotions", icon: "◇" },
//   { label: "Người dùng", path: "/admin/users", icon: "♙" },
// ];

export function AdminLayout() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!["ADMIN", "WAREHOUSE_STAFF"].includes(user?.role ?? "")) {
    return <Navigate to="/" replace />;
  }
  const menuItems =
    user?.role === "WAREHOUSE_STAFF"
      ? [{ label: "Kho hàng", path: "/admin/inventory", icon: "▣" }]
      : [
          { label: "Tổng quan", path: "/admin/dashboard", icon: "▦" },
          { label: "Sản phẩm", path: "/admin/products", icon: "◇" },
          { label: "Đơn hàng", path: "/admin/orders", icon: "🛒" },
          { label: "Kho hàng", path: "/admin/inventory", icon: "▣" },
          { label: "Khuyến mãi", path: "/admin/promotions", icon: "◇" },
          { label: "Người dùng", path: "/admin/users", icon: "♙" },
        ];
  const handleLogout = () => {
    authStore.logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="store-brand">
          <div className="brand-mark">S</div>
          <h2>SHOE STORE</h2>
        </div>

        <p className="admin-label">QUẢN LÝ</p>

        <nav className="admin-nav">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end
              className={({ isActive }) =>
                `admin-nav-link ${isActive ? "active" : ""}`
              }
            >
              <span className="admin-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-bottom">
          <div className="admin-account">
            <div className="admin-avatar">
              {user?.name?.charAt(0).toUpperCase() || "A"}
            </div>
            <div className="admin-account-info">
              <strong>{user?.name || "Administrator"}</strong>
              <span>
                {user?.role === "WAREHOUSE_STAFF"
                  ? "Nhân viên kho"
                  : "Quản trị viên"}
              </span>
            </div>
          </div>

          <button type="button" onClick={handleLogout}>
            Đăng xuất
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar-right">
            <span className="admin-topbar-divider">|</span>
            <button
              type="button"
              className="admin-home-switch"
              onClick={() => navigate("/")}
            >
              ← Trang chủ cửa hàng
            </button>
          </div>
        </header>

        <section className="admin-content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
