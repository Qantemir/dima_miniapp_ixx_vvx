import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, CheckCircle2, Package, HelpCircle, ShieldCheck, ClipboardList } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/ProductCard';
import { CartDialog } from '@/components/CartDialog';
import { api } from '@/lib/api';
import { getUserId, isAdmin, showAlert } from '@/lib/telegram';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAdminView } from '@/contexts/AdminViewContext';
import { ADMIN_IDS } from '@/types/api';
import { Seo } from '@/components/Seo';
import { useStoreStatus } from '@/contexts/StoreStatusContext';
import { useCatalog } from '@/hooks/useCatalog';
import { useCart, CART_QUERY_KEY } from '@/hooks/useCart';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export const CatalogPage = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cartDialogOpen, setCartDialogOpen] = useState(false);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);
  const { status: storeStatus, loading: storeStatusLoading } = useStoreStatus();
  const navigate = useNavigate();
  const { forceClientView, setForceClientView } = useAdminView();
  const userId = getUserId();
  const isUserAdmin = userId ? isAdmin(userId, ADMIN_IDS) : false;
  const queryClient = useQueryClient();
  const {
    data: catalog,
    isLoading: catalogLoading,
    error: catalogError,
  } = useCatalog();
  const categories = catalog?.categories ?? [];
  const catalogProducts = useMemo(() => catalog?.products ?? [], [catalog]);
  const { data: cartData } = useCart(Boolean(userId));
  const cartItemsCount = cartData?.items.length ?? 0;

  const catalogJsonLd = useMemo(() => {
    if (!catalogProducts.length) return undefined;
    return {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Каталог товаров",
      itemListElement: catalogProducts.slice(0, 20).map((product, index) => ({
        "@type": "Product",
        name: product.name,
        description: product.description,
        image: product.images?.[0] || product.image,
        offers: {
          "@type": "Offer",
          priceCurrency: "KZT",
          price: product.price ?? 0,
          availability: product.available
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
        },
        position: index + 1,
      })),
    };
  }, [catalogProducts]);

  useEffect(() => {
    if (catalogError) {
      const errorMessage = catalogError instanceof Error ? catalogError.message : 'Ошибка загрузки каталога';
      showAlert(`Ошибка загрузки каталога: ${errorMessage}`);
    }
  }, [catalogError]);

  const handleAddToCart = async (
    productId: string,
    variantId: string | undefined,
    quantity: number
  ) => {
    if (storeStatus?.is_sleep_mode) {
      showAlert(storeStatus.sleep_message || 'Магазин временно не принимает заказы');
      return;
    }

    const userId = getUserId();
    if (!userId) {
      showAlert('Ошибка: не удалось определить пользователя');
      return;
    }

    try {
      await api.addToCart({
        product_id: productId,
        variant_id: variantId,
        quantity,
      });
      await queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
      setAddSuccess(true);
      setTimeout(() => setAddSuccess(false), 2000);
    } catch (error) {
      showAlert('Ошибка при добавлении в корзину');
    }
  };

  const handleHelp = () => setHelpDialogOpen(true);

  const filteredProducts = selectedCategory
    ? catalogProducts.filter(p => p.category_id === selectedCategory)
    : catalogProducts;

  if (catalogLoading || !catalog) {
    return (
      <>
        <Seo
          title="Каталог товаров"
          description="Просматривайте категории и товары Mini Shop прямо внутри Telegram."
          path="/"
        />
      <div className="min-h-screen bg-background p-4 space-y-4">
        <Skeleton className="h-12 w-full" />
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-10 w-24 flex-shrink-0" />
          ))}
        </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-80 w-full" />
          ))}
        </div>
      </div>
      </>
    );
  }

  return (
    <>
      <Seo
        title="Каталог товаров"
        description="Выбирайте товары по категориям и добавляйте их в корзину в Mini Shop."
        path="/"
        jsonLd={catalogJsonLd}
      />
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Магазин</h1>
          </div>
          
          <div className="flex items-center gap-2">
            {isUserAdmin && forceClientView && (
            <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setForceClientView(false);
                  navigate('/admin');
                }}
                className="gap-2"
              >
                <ShieldCheck className="h-4 w-4" />
                Админ-режим
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => navigate('/order')}>
              <ClipboardList className="h-4 w-4 mr-2" />
              Мои заказы
            </Button>
            <Button variant="outline" size="sm" onClick={handleHelp}>
              <HelpCircle className="h-4 w-4 mr-2" />
              Помощь
            </Button>
            
            <div className="relative">
              <Button variant="default" size="sm" onClick={() => setCartDialogOpen(true)} className="relative">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Корзина
              {cartItemsCount > 0 && (
                  <span className="ml-2 bg-primary-foreground/90 text-primary text-xxs font-bold rounded-full h-5 px-2 flex items-center justify-center">
                  {cartItemsCount}
                  </span>
                )}
              </Button>
              {addSuccess && (
                <span className="absolute -right-1 -top-7 flex items-center gap-1 text-xs text-primary bg-card/95 px-2 py-1 rounded-full shadow">
                  <CheckCircle2 className="h-4 w-4" /> Добавлено
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {storeStatus?.is_sleep_mode && (
        <div className="p-4">
          <Alert>
            <AlertTitle>Магазин временно не работает</AlertTitle>
            <AlertDescription>
              {storeStatus.sleep_message || 'Мы временно не принимаем заказы. Возвращайтесь позже!'}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Categories */}
      {categories.length > 0 && (
        <div className="p-4 border-b border-border bg-card">
          <div className="flex gap-2 overflow-x-auto pb-2">
            <Button
              variant={selectedCategory === null ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(null)}
              className="flex-shrink-0"
            >
              Все
            </Button>
            {categories.map(category => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(category.id)}
                className="flex-shrink-0"
              >
                {category.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Products */}
      <div className="p-4">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Товары не найдены</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredProducts.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
                purchasesDisabled={storeStatus?.is_sleep_mode}
              />
            ))}
          </div>
        )}
      </div>

      {/* Cart Dialog */}
      <CartDialog 
        open={cartDialogOpen} 
        onOpenChange={setCartDialogOpen}
      />
      <Dialog open={helpDialogOpen} onOpenChange={setHelpDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Помощь</DialogTitle>
            <DialogDescription>
              Краткая инструкция по работе с магазином
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <section>
              <h3 className="text-sm font-semibold text-foreground">Как сделать заказ</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Выберите категорию, добавьте понравившиеся товары в корзину и перейдите к оформлению. В форме заказа укажите имя, телефон и адрес доставки.
              </p>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-foreground">Изменение заказа</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Пока заказ не подтверждён оператором, вы можете изменить адрес или комментарий в разделе «Мои заказы». Если заказ уже в пути, напишите нам — постараемся помочь.
              </p>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-foreground">Оплата</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Принимаем оплату картой или быстрым переводом по реквизитам. Ссылку на оплату отправим в Telegram после подтверждения заказа. Чек придёт автоматически.
              </p>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-foreground">Доставка</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Доступны самовывоз и курьер. Время и стоимость рассчитываются индивидуально и зависят от района. Мы заранее предупредим, если потребуется доплата.
              </p>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-foreground">Статусы заказа</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Уведомления приходят по мере обработки: «Новый» → «В обработке» → «Принят» → «Выехал» → «Завершён». Если статус «Отменён», свяжитесь с поддержкой, чтобы узнать причину.
              </p>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-foreground">Поддержка</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Нужна помощь? Напишите в чат мини‑приложения или напрямую в Telegram @your_support_bot. Мы отвечаем ежедневно с 9:00 до 22:00.
              </p>
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
};
