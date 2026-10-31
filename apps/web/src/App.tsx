import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import './index.css';
import { LoginPage } from './pages/auth/LoginPage';
import { ProductListPage } from './pages/catalog/ProductListPage';
import { CartPage } from './pages/checkout/CartPage';
import { ProfilePage } from './pages/customer/ProfilePage';
import { ProductManagementPage } from './pages/admin/products/ProductManagementPage';

function AppRoutes() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <>
      {!isAdmin && location.pathname !== '/' && (
        <header className="sl-legacy-header">
          <Link to="/" className="sl-legacy-brand">Shoe Store</Link>
          <nav>
            <Link to="/">Cửa hàng</Link>
            <Link to="/cart">Giỏ hàng</Link>
            <Link to="/profile">Hồ sơ</Link>
            <Link to="/login">Đăng nhập</Link>
            <Link to="/admin/products">Quản trị</Link>
          </nav>
        </header>
      )}
      <Routes>
        <Route path="/" element={<ProductListPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/admin/products" element={<ProductManagementPage />} />
        <Route path="*" element={<ProductListPage />} />
      </Routes>
    </>
  );
}

export default function App() {
  return <BrowserRouter><AppRoutes /></BrowserRouter>;
}
