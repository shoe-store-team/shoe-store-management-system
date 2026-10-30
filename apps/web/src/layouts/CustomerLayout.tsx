
import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../stores/authStore';

export function CustomerLayout() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <div className="store-layout">
      <header className="store-header">
        <Link to="/" className="store-brand">
          <span className="brand-mark">S</span>
          <span>SHOE STORE</span>
        </Link>

        <nav className="store-nav">
          <Link to="/">Sản phẩm</Link>
          <Link to="/">Hàng mới</Link>
          <Link to="/">Nam</Link>
          <Link to="/">Nữ</Link>
          <Link to="/">Khuyến mãi</Link>
        </nav>

        <div className="store-actions">
          {isAuthenticated ? (
            <>
              <span className="welcome-user">
                Xin chào, {user?.name || user?.email || 'Bạn'}
              </span>
              <Link to="/profile" className="store-btn">
                Hồ sơ
              </Link>
              <button
                className="store-btn"
                onClick={logout}
                type="button"
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="store-btn">
                Đăng nhập
              </Link>
              <Link to="/register" className="store-btn store-btn-dark">
                Đăng ký
              </Link>
            </>
          )}

          <Link to="/cart" className="store-cart">
            Giỏ hàng
          </Link>
        </div>
      </header>

      <main className="store-main">
        <Outlet />
      </main>

      <footer className="store-footer">
        <Link to="/" className="store-brand">
          <span className="brand-mark">S</span>
          <span>SHOE STORE</span>
        </Link>
        <p>Giày cho mọi hành trình. Thiết kế tối giản.</p>
        <div>
          <Link to="/">Hỗ trợ</Link>
          <Link to="/">Chính sách</Link>
          <Link to="/">Liên hệ</Link>
        </div>
      </footer>
    </div>
  );
}
