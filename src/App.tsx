import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CatalogPage } from "./pages/CatalogPage";
import { CartPage } from "./pages/CartPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { OrderPage } from "./pages/OrderPage";
import { AdminOrdersPage } from "./pages/AdminOrdersPage";
import { AdminOrderDetailPage } from "./pages/AdminOrderDetailPage";
import { AdminCatalogPage } from "./pages/AdminCatalogPage";
import { AdminCategoryPage } from "./pages/AdminCategoryPage";
import { AdminBroadcastPage } from "./pages/AdminBroadcastPage";
import { AdminStoreSettingsPage } from "./pages/AdminStoreSettingsPage";
import { initTelegram, getUserId, isAdmin } from "./lib/telegram";
import { ADMIN_IDS } from "./types/api";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    initTelegram();
  }, []);

  const userId = getUserId();
  const isUserAdmin = userId ? isAdmin(userId, ADMIN_IDS) : false;

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Client routes */}
            <Route path="/" element={isUserAdmin ? <Navigate to="/admin" replace /> : <CatalogPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/order/:orderId?" element={<OrderPage />} />
            
            {/* Admin routes */}
            <Route path="/admin" element={<AdminOrdersPage />} />
            <Route path="/admin/orders" element={<AdminOrdersPage />} />
            <Route path="/admin/catalog" element={<AdminCatalogPage />} />
            <Route path="/admin/catalog/:categoryId" element={<AdminCategoryPage />} />
            <Route path="/admin/broadcast" element={<AdminBroadcastPage />} />
            <Route path="/admin/store" element={<AdminStoreSettingsPage />} />
            <Route path="/admin/order/:orderId" element={<AdminOrderDetailPage />} />
            
            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
