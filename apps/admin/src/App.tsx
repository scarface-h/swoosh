import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "./components/layout/AdminLayout";
import DashboardPage from "./pages/DashboardPage";
import ProductsPage from "./pages/ProductsPage";
import OrdersPage from "./pages/OrdersPage";
import CustomersPage from "./pages/CustomersPage";
import SettingsPage from "./pages/SettingsPage";
import CatalogPage from "./pages/CatalogPage";
import LoginPage from "./pages/LoginPage";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { useUiStore } from "./stores/uiStore";
import AdminUsersPage from "./pages/AdminUsersPage";
import ReviewsPage from "./pages/ReviewsPage";
import HelpDeskPage from "./pages/HelpDeskPage";
import PromotionsPage from "./pages/PromotionsPage";

export default function App() {
  const theme = useUiStore((state) => state.theme);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      const dark = theme === "dark" || (theme === "system" && media.matches);
      document.documentElement.classList.toggle("dark", dark);
    };
    applyTheme();
    media.addEventListener("change", applyTheme);
    return () => media.removeEventListener("change", applyTheme);
  }, [theme]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/reviews" element={<ReviewsPage />} />
          <Route path="/promotions" element={<PromotionsPage />} />
          <Route path="/users" element={<AdminUsersPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/help-desk" element={<HelpDeskPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
