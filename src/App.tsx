import { useEffect } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Navigate,
  Outlet,
  RouterProvider,
  createBrowserRouter,
  useLocation,
} from "react-router-dom";
// Lazy loading для code splitting и быстрой загрузки
import { lazy, Suspense, type ReactNode } from "react";
import { CatalogPage } from "./pages/CatalogPage"; // Главная страница - загружаем сразу
const CartPage = lazy(() => import("./pages/CartPage").then(m => ({ default: m.CartPage })));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage").then(m => ({ default: m.CheckoutPage })));
const OrderPage = lazy(() => import("./pages/OrderPage").then(m => ({ default: m.OrderPage })));
const AdminOrdersPage = lazy(() => import("./pages/AdminOrdersPage").then(m => ({ default: m.AdminOrdersPage })));
const AdminOrderDetailPage = lazy(() => import("./pages/AdminOrderDetailPage").then(m => ({ default: m.AdminOrderDetailPage })));
const AdminCatalogPage = lazy(() => import("./pages/AdminCatalogPage").then(m => ({ default: m.AdminCatalogPage })));
const AdminCategoryPage = lazy(() => import("./pages/AdminCategoryPage").then(m => ({ default: m.AdminCategoryPage })));
const AdminBroadcastPage = lazy(() => import("./pages/AdminBroadcastPage").then(m => ({ default: m.AdminBroadcastPage })));
const AdminStoreSettingsPage = lazy(() => import("./pages/AdminStoreSettingsPage").then(m => ({ default: m.AdminStoreSettingsPage })));
import { initTelegram, getUserId, isAdmin } from "./lib/telegram";
import { ADMIN_IDS } from "./types/api";
import NotFound from "./pages/NotFound";
import { AdminViewProvider, useAdminView } from "./contexts/AdminViewContext";
import { StoreStatusProvider } from "./contexts/StoreStatusContext";
import { StoreSleepOverlay } from "./components/StoreSleepOverlay";

// Оптимизированный QueryClient для быстрой работы
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 секунд - данные считаются свежими
      cacheTime: 5 * 60 * 1000, // 5 минут кэш
      refetchOnWindowFocus: false, // Не перезапрашивать при фокусе
      refetchOnReconnect: true, // Перезапрашивать при переподключении
      retry: 1, // Только 1 попытка повтора
      retryDelay: 1000, // Задержка 1 секунда
    },
  },
});

const RootRoute = () => {
  const { forceClientView } = useAdminView();
  const userId = getUserId();
  const isUserAdmin = userId ? isAdmin(userId, ADMIN_IDS) : false;

  if (isUserAdmin && !forceClientView) {
    return <Navigate to="/admin" replace />;
  }

  return <CatalogPage />;
};

const StoreStatusProviderWrapper = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const content = (
    <>
      {!isAdminRoute && <StoreSleepOverlay />}
      <Outlet />
    </>
  );

  if (isAdminRoute) {
    return <>{content}</>;
  }

  return <StoreStatusProvider>{content}</StoreStatusProvider>;
};

const RootLayoutWithProviders = () => (
  <StoreStatusProviderWrapper />
);

// Компонент для загрузки с fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const router = createBrowserRouter(
  [
    {
      element: <RootLayoutWithProviders />,
      children: [
        { path: "/", element: <RootRoute /> },
        { 
          path: "/cart", 
          element: (
            <Suspense fallback={<PageLoader />}>
              <CartPage />
            </Suspense>
          )
        },
        { 
          path: "/checkout", 
          element: (
            <Suspense fallback={<PageLoader />}>
              <CheckoutPage />
            </Suspense>
          )
        },
        { 
          path: "/order/:orderId?", 
          element: (
            <Suspense fallback={<PageLoader />}>
              <OrderPage />
            </Suspense>
          )
        },
        { 
          path: "/admin", 
          element: (
            <Suspense fallback={<PageLoader />}>
              <AdminOrdersPage />
            </Suspense>
          )
        },
        { 
          path: "/admin/orders", 
          element: (
            <Suspense fallback={<PageLoader />}>
              <AdminOrdersPage />
            </Suspense>
          )
        },
        { 
          path: "/admin/catalog", 
          element: (
            <Suspense fallback={<PageLoader />}>
              <AdminCatalogPage />
            </Suspense>
          )
        },
        { 
          path: "/admin/catalog/:categoryId", 
          element: (
            <Suspense fallback={<PageLoader />}>
              <AdminCategoryPage />
            </Suspense>
          )
        },
        { 
          path: "/admin/broadcast", 
          element: (
            <Suspense fallback={<PageLoader />}>
              <AdminBroadcastPage />
            </Suspense>
          )
        },
        { 
          path: "/admin/store", 
          element: (
            <Suspense fallback={<PageLoader />}>
              <AdminStoreSettingsPage />
            </Suspense>
          )
        },
        { 
          path: "/admin/order/:orderId", 
          element: (
            <Suspense fallback={<PageLoader />}>
              <AdminOrderDetailPage />
            </Suspense>
          )
        },
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
  <QueryClientProvider client={queryClient}>
    <AdminViewProvider>
      <Sonner />
      <AppRouter />
    </AdminViewProvider>
  </QueryClientProvider>
);

export default App;
