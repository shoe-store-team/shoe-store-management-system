import type { ReactNode } from "react";
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
import { CheckoutPage } from "./pages/checkout/CheckoutPage";
import { PaymentResultPage } from "./pages/checkout/PaymentResultPage";
import { ProfilePage } from "./pages/customer/ProfilePage";
import { OrderHistoryPage } from "./pages/customer/OrderHistoryPage";

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
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { useAuth } from "./stores/authStore";
import { InventoryHomePage } from "./pages/admin/inventory/InventoryHomePage";

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
          <Route element={<RequireAuth />}>
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/orders" element={<OrderHistoryPage />} />
          </Route>

          <Route
            path="/payment/result"
            element={<PaymentResultPage />}
          />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/product/:id" element={<ProductDetailPage />} />
        </Route>

        
{/* Admin routes */}
<Route path="/admin" element={<AdminLayout />}>
  <Route
    index
    element={
      <RequireRole allowedRoles={["ADMIN"]}>
        <Navigate to="dashboard" replace />
      </RequireRole>
    }
  />

  <Route
    path="dashboard"
    element={
      <RequireRole allowedRoles={["ADMIN"]}>
        <DashboardPage />
      </RequireRole>
    }
  />

  <Route
    path="products"
    element={
      <RequireRole allowedRoles={["ADMIN"]}>
        <ProductManagementPage />
      </RequireRole>
    }
  />

  <Route
    path="orders"
    element={
      <RequireRole allowedRoles={["ADMIN"]}>
        <OrderManagementPage />
      </RequireRole>
    }
  />

  <Route
    path="inventory"
    element={
      <RequireRole allowedRoles={["ADMIN", "WAREHOUSE_STAFF"]}>
        <InventoryHomePage />
      </RequireRole>
    }
  />

  <Route
    path="inventory/check"
    element={
      <RequireRole allowedRoles={["ADMIN", "WAREHOUSE_STAFF"]}>
        <InventoryCheckPage />
      </RequireRole>
    }
  />

  <Route
    path="inventory/history"
    element={
      <RequireRole allowedRoles={["ADMIN", "WAREHOUSE_STAFF"]}>
        <InventoryHistoryPage />
      </RequireRole>
    }
  />

  <Route
    path="inventory/adjustment"
    element={
      <RequireRole allowedRoles={["ADMIN", "WAREHOUSE_STAFF"]}>
        <StockAdjustmentPage />
      </RequireRole>
    }
  />

  <Route
    path="inventory/import"
    element={
      <RequireRole allowedRoles={["ADMIN", "WAREHOUSE_STAFF"]}>
        <StockImportPage />
      </RequireRole>
    }
  />

  <Route
    path="inventory/export"
    element={
      <RequireRole allowedRoles={["ADMIN", "WAREHOUSE_STAFF"]}>
        <StockExportPage />
      </RequireRole>
    }
  />

  <Route
    path="promotions"
    element={
      <RequireRole allowedRoles={["ADMIN"]}>
        <PromotionManagementPage />
      </RequireRole>
    }
  />

  <Route
    path="users"
    element={
      <RequireRole allowedRoles={["ADMIN"]}>
        <UserManagementPage />
      </RequireRole>
    }
  />
</Route>


        {/* Unknown routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
function RequireAuth() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
function RequireRole({
  allowedRoles,
  children,
}: {
  allowedRoles: string[];
  children: ReactNode;
}) {
  const { user } = useAuth();

  if (!allowedRoles.includes(user?.role ?? "")) {
    return (
      <Navigate
        to={user?.role === "WAREHOUSE_STAFF" ? "/admin/inventory" : "/"}
        replace
      />
    );
  }

  return <>{children}</>;
}