import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Navigate,
  Outlet,
  RouterProvider,
  createBrowserRouter,
} from "react-router-dom";
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
import { AdminViewProvider, useAdminView } from "./contexts/AdminViewContext";
import { StoreStatusProvider } from "./contexts/StoreStatusContext";
import { StoreSleepOverlay } from "./components/StoreSleepOverlay";

const queryClient = new QueryClient();

const RootRoute = () => {
  const { forceClientView } = useAdminView();
  const userId = getUserId();
  const isUserAdmin = userId ? isAdmin(userId, ADMIN_IDS) : false;

  if (isUserAdmin && !forceClientView) {
    return <Navigate to="/admin" replace />;
  }

  return <CatalogPage />;
};

const RootLayout = () => (
  <>
    <StoreSleepOverlay />
    <Outlet />
  </>
);

const router = createBrowserRouter(
  [
    {
      element: <RootLayout />,
      children: [
        { path: "/", element: <RootRoute /> },
        { path: "/cart", element: <CartPage /> },
        { path: "/checkout", element: <CheckoutPage /> },
        { path: "/order/:orderId?", element: <OrderPage /> },
        { path: "/admin", element: <AdminOrdersPage /> },
        { path: "/admin/orders", element: <AdminOrdersPage /> },
        { path: "/admin/catalog", element: <AdminCatalogPage /> },
        { path: "/admin/catalog/:categoryId", element: <AdminCategoryPage /> },
        { path: "/admin/broadcast", element: <AdminBroadcastPage /> },
        { path: "/admin/store", element: <AdminStoreSettingsPage /> },
        { path: "/admin/order/:orderId", element: <AdminOrderDetailPage /> },
        { path: "*", element: <NotFound /> },
      ],
    },
  ],
  {
    future: {
      v7_relativeSplatPath: true,
    },
  }
);

const AppRouter = () => {
  useEffect(() => {
    initTelegram();
  }, []);

  return <RouterProvider router={router} future={{ v7_startTransition: true }} />;
};

const App = () => (
  <AdminViewProvider>
    <StoreStatusProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AppRouter />
        </TooltipProvider>
      </QueryClientProvider>
    </StoreStatusProvider>
  </AdminViewProvider>
);

export default App;
