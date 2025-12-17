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
import { ErrorBoundary } from "./components/ErrorBoundary";

// Безопасная обертка для lazy loading с обработкой ошибок
const createLazyComponent = (importFn: () => Promise<any>, componentName: string) => {
  return lazy(async () => {
    try {
      const module = await importFn();
      const component = module[componentName] || module.default;
      if (!component) {
        throw new Error(`Component ${componentName} not found in module`);
      }
      return { default: component };
    } catch (error) {
      console.error(`Failed to load ${componentName}:`, error);
      throw error;
    }
  });
};

const CartPage = createLazyComponent(() => import("./pages/CartPage"), "CartPage");
const CheckoutPage = createLazyComponent(() => import("./pages/CheckoutPage"), "CheckoutPage");
const OrderPage = createLazyComponent(() => import("./pages/OrderPage"), "OrderPage");
const AdminOrdersPage = createLazyComponent(() => import("./pages/AdminOrdersPage"), "AdminOrdersPage");
const AdminOrderDetailPage = createLazyComponent(() => import("./pages/AdminOrderDetailPage"), "AdminOrderDetailPage");
const AdminCatalogPage = createLazyComponent(() => import("./pages/AdminCatalogPage"), "AdminCatalogPage");
const AdminCategoryPage = createLazyComponent(() => import("./pages/AdminCategoryPage"), "AdminCategoryPage");
const AdminBroadcastPage = createLazyComponent(() => import("./pages/AdminBroadcastPage"), "AdminBroadcastPage");
const AdminStoreSettingsPage = createLazyComponent(() => import("./pages/AdminStoreSettingsPage"), "AdminStoreSettingsPage");
const AdminPaymentPage = createLazyComponent(() => import("./pages/AdminPaymentPage"), "AdminPaymentPage");
const AdminHelpPage = createLazyComponent(() => import("./pages/AdminHelpPage"), "AdminHelpPage");
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

const StoreStatusProviderWrapper = () => {
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

//const router = createBrowserRouter(
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
          path: "/admin/payments", 
          element: (
            <Suspense fallback={<PageLoader />}>
              <AdminPaymentPage />
            </Suspense>
          )
        },
        { 
          path: "/admin/help", 
          element: (
            <Suspense fallback={<PageLoader />}>
              <AdminHelpPage />
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
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AdminViewProvider>
        <Sonner />
        <AppRouter />
      </AdminViewProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
