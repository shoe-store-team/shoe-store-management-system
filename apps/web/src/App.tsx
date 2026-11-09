import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./index.css";

import { CustomerLayout } from "./layouts/CustomerLayout";
import { AdminLayout } from "./layouts/AdminLayout";

// Auth
import { RegisterPage } from "./pages/auth/RegisterPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage";

// Customer
import { ProductListPage } from "./pages/catalog/ProductListPage";
import { ProductDetailPage } from "./pages/catalog/ProductDetailPage";
import { CartPage } from "./pages/checkout/CartPage";
import { ProfilePage } from "./pages/customer/ProfilePage";

// Admin
import { Page as DashboardPage } from "./pages/admin/dashboard/DashboardPage";
import { InventoryCheckPage } from "./pages/admin/inventory/InventoryCheckPage";
import { InventoryHistoryPage } from "./pages/admin/inventory/InventoryHistoryPage";
import { StockAdjustmentPage } from "./pages/admin/inventory/StockAdjustmentPage";
import { StockExportPage } from "./pages/admin/inventory/StockExportPage";
import { StockImportPage } from "./pages/admin/inventory/StockImportPage";
import { OrderManagementPage } from "./pages/admin/orders/OrderManagementPage";
import { ProductManagementPage } from "./pages/admin/products/ProductManagementPage";
import { PromotionManagementPage } from "./pages/admin/promotions/PromotionManagementPage";
import { Page as UserManagementPage } from "./pages/admin/users/UserManagementPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Customer routes */}
        <Route element={<CustomerLayout />}>
          <Route path="/" element={<ProductListPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/product/:id" element={<ProductDetailPage />} />
        </Route>

        {/* Admin routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />

          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="products" element={<ProductManagementPage />} />
          <Route path="orders" element={<OrderManagementPage />} />

          <Route path="inventory" element={<InventoryCheckPage />} />
          <Route path="inventory/check" element={<InventoryCheckPage />} />
          <Route path="inventory/history" element={<InventoryHistoryPage />} />
          <Route path="inventory/adjustment" element={<StockAdjustmentPage />} />
          <Route path="inventory/import" element={<StockImportPage />} />
          <Route path="inventory/export" element={<StockExportPage />} />

          <Route path="promotions" element={<PromotionManagementPage />} />
          <Route path="users" element={<UserManagementPage />} />
        </Route>

        {/* Unknown routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
