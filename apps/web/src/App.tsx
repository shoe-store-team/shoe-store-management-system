import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import './index.css'
import { LoginPage } from './pages/auth/LoginPage'
import { ProductManagementPage } from './pages/admin-products/ProductManagementPage'
import { ProductListPage } from './pages/catalog/ProductListPage'
import { CartPage } from './pages/checkout/CartPage'
import { OrderManagementPage } from './pages/admin-orders/OrderManagementPage'
import { ProfilePage } from './pages/customer/ProfilePage'

export default function App() {
  return (
    <BrowserRouter>
      <main className="trang-quan-ly">
        <header className="thanh-dau-trang">
          <div>
            <h1>SHOE STORE</h1>
            <p>Hệ thống cửa hàng giày (Nhóm 6 người)</p>
          </div>
          <nav style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link to="/" style={{ color: 'white' }}>1. Cửa hàng (N3)</Link>
            <Link to="/cart" style={{ color: 'white' }}>2. Giỏ hàng (N4)</Link>
            <Link to="/profile" style={{ color: 'white' }}>3. Hồ sơ (N6)</Link>
            <Link to="/login" style={{ color: 'white' }}>4. Đăng nhập (N1)</Link>
            <Link to="/admin/products" style={{ color: '#fbbf24' }}>5. QL Giày (N2)</Link>
            <Link to="/admin/orders" style={{ color: '#fbbf24' }}>6. QL Đơn (N5)</Link>
          </nav>
        </header>

        <Routes>
          <Route path="/" element={<ProductListPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/admin/products" element={<ProductManagementPage />} />
          <Route path="/admin/orders" element={<OrderManagementPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}