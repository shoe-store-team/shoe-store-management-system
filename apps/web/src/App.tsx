import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./index.css";

import { CustomerLayout } from "./layouts/CustomerLayout";
import { AdminLayout } from "./layouts/AdminLayout";

import { RegisterPage } from "./pages/auth/RegisterPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { ProductListPage } from "./pages/catalog/ProductListPage";
import { CartPage } from "./pages/checkout/CartPage";
import { ProfilePage } from "./pages/customer/ProfilePage";
import { ProductDetailPage } from "./pages/catalog/ProductDetailPage";

import { Page as DashboardPage } from "./pages/admin/dashboard/DashboardPage";
import { Page as InventoryCheckPage } from "./pages/admin/inventory/InventoryCheckPage";
import { Page as InventoryHistoryPage } from "./pages/admin/inventory/InventoryHistoryPage";
import { Page as StockAdjustmentPage } from "./pages/admin/inventory/StockAdjustmentPage";
import { Page as StockExportPage } from "./pages/admin/inventory/StockExportPage";
import { Page as StockImportPage } from "./pages/admin/inventory/StockImportPage";
import { Page as OrderManagementPage } from "./pages/admin/orders/OrderManagementPage";
import { Page as ProductManagementPage } from "./pages/admin/products/ProductManagementPage";
import { Page as PromotionManagementPage } from "./pages/admin/promotions/PromotionManagementPage";
import { Page as UserManagementPage } from "./pages/admin/users/UserManagementPage";
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<CustomerLayout />}>
          <Route path="/" element={<ProductListPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
        </Route>

        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="products" element={<ProductManagementPage />} />
          <Route path="orders" element={<OrderManagementPage />} />
          <Route path="inventory" element={<InventoryCheckPage />} />
          <Route path="inventory/check" element={<InventoryCheckPage />} />
          <Route path="inventory/history" element={<InventoryHistoryPage />} />
          <Route
            path="inventory/adjustment"
            element={<StockAdjustmentPage />}
          />
          <Route path="inventory/import" element={<StockImportPage />} />
          <Route path="inventory/export" element={<StockExportPage />} />
          <Route path="promotions" element={<PromotionManagementPage />} />
          <Route path="users" element={<UserManagementPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
