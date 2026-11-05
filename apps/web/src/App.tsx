import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import './index.css';

import { LoginPage } from './pages/auth/LoginPage';
import { ProductListPage } from './pages/catalog/ProductListPage';
import { ProductDetailPage } from './pages/catalog/ProductDetailPage';
import { CartPage } from './pages/checkout/CartPage';
import { CheckoutPage } from './pages/checkout/CheckoutPage';
import { ProfilePage } from './pages/customer/ProfilePage';
import { OrderHistoryPage } from './pages/customer/OrderHistoryPage';

import { ProductManagementPage } from './pages/admin/products/ProductManagementPage';
import { PromotionManagementPage } from './pages/admin/promotions/PromotionManagementPage';
import { OrderManagementPage } from './pages/admin/orders/OrderManagementPage';

function AppRoutes() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <>
      {!isAdmin && location.pathname !== '/' && (
        <header className="sl-legacy-header">
          <Link to="/" className="sl-legacy-brand">
            Shoe Store
          </Link>

          <nav>
            <Link to="/">Cửa hàng</Link>
            <Link to="/cart">Giỏ hàng</Link>
            <Link to="/checkout">Thanh toán</Link>
            <Link to="/my-orders">Đơn hàng của tôi</Link>
            <Link to="/profile">Hồ sơ</Link>
            <Link to="/login">Đăng nhập</Link>
            <Link to="/admin/products">Quản trị</Link>
            <Link to="/admin/promotions">Khuyến mãi</Link>
            <Link to="/admin/orders">Quản lý đơn hàng</Link>
          </nav>
        </header>
      )}

      <Routes>
        {/* Trang khách hàng */}
        <Route path="/" element={<ProductListPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/product/:id" element={<ProductDetailPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/my-orders" element={<OrderHistoryPage />} />

        {/* Trang quản trị */}
        <Route path="/admin/products" element={<ProductManagementPage />} />
        <Route path="/admin/promotions" element={<PromotionManagementPage />} />
        <Route path="/admin/orders" element={<OrderManagementPage />} />

        {/* Trang không tồn tại */}
        <Route path="*" element={<ProductListPage />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}