import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Package, HelpCircle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/ProductCard';
import { CartDialog } from '@/components/CartDialog';
import { api } from '@/lib/api';
import { getUserId, isAdmin, showAlert } from '@/lib/telegram';
import type { Category, Product, StoreStatus } from '@/types/api';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAdminView } from '@/contexts/AdminViewContext';
import { ADMIN_IDS } from '@/types/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export const CatalogPage = () => {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cartItemsCount, setCartItemsCount] = useState(0);
  const [cartDialogOpen, setCartDialogOpen] = useState(false);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [storeStatus, setStoreStatus] = useState<StoreStatus | null>(null);
  const [storeStatusLoading, setStoreStatusLoading] = useState(true);
  const navigate = useNavigate();
  const { forceClientView, setForceClientView } = useAdminView();
  const userId = getUserId();
  const isUserAdmin = userId ? isAdmin(userId, ADMIN_IDS) : false;

  useEffect(() => {
    loadCatalog();
    loadStoreStatus();
    loadCartCount();
  }, []);

  const loadCatalog = async () => {
    try {
      const data = await api.getCatalog();
      setCategories(data.categories);
      setProducts(data.products);
    } catch (error) {
      showAlert('Ошибка загрузки каталога');
    } finally {
      setLoading(false);
    }
  };

  const loadStoreStatus = async () => {
    try {
      const status = await api.getStoreStatus();
      setStoreStatus(status);
    } catch (error) {
      // Store status endpoint is optional
    } finally {
      setStoreStatusLoading(false);
    }
  };

  const loadCartCount = async () => {
    const userId = getUserId();
    if (!userId) return;

    try {
      const cart = await api.getCart(userId);
      setCartItemsCount(cart.items.length);
    } catch (error) {
      // Cart might be empty
    }
  };

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
        user_id: userId,
        product_id: productId,
        variant_id: variantId,
        quantity,
      });
      await loadCartCount();
      showAlert('Товар добавлен в корзину');
    } catch (error) {
      showAlert('Ошибка при добавлении в корзину');
    }
  };

  const handleHelp = () => setHelpDialogOpen(true);

  const filteredProducts = selectedCategory
    ? products.filter(p => p.category_id === selectedCategory)
    : products;

  if (loading || storeStatusLoading) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-4">
        <Skeleton className="h-12 w-full" />
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-10 w-24 flex-shrink-0" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-80 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
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
            <Button variant="outline" size="sm" onClick={handleHelp}>
              <HelpCircle className="h-4 w-4 mr-2" />
              Помощь
            </Button>
            
            <Button variant="default" size="sm" onClick={() => setCartDialogOpen(true)} className="relative">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Корзина
              {cartItemsCount > 0 && (
                <span className="ml-2 bg-primary-foreground/90 text-primary text-xxs font-bold rounded-full h-5 px-2 flex items-center justify-center">
                  {cartItemsCount}
                </span>
              )}
            </Button>
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
        onCartUpdate={loadCartCount}
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
                Выберите нужную категорию, откройте карточку товара и нажмите «Добавить в корзину».
                После добавления всех товаров перейдите в корзину и оформите заказ, указав контактные данные.
              </p>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-foreground">Оплата</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Мы принимаем оплату картой или переводом. После оформления заказа вам придёт инструкция
                с реквизитами и суммой. Оплата подтверждается автоматически.
              </p>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-foreground">Доставка</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Доступны самовывоз и курьерская доставка. Сроки и стоимость рассчитываются менеджером
                после подтверждения заказа и зависят от вашего адреса.
              </p>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-foreground">Поддержка</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Если возникли вопросы, напишите в поддержку в чате мини‑приложения или свяжитесь с администратором
                через нашего Telegram-бота: @your_support_bot.
              </p>
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
