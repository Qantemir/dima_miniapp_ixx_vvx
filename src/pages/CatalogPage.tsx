import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, CheckCircle2, Package, HelpCircle, ShieldCheck, ClipboardList } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/ProductCard';
import { CartDialog } from '@/components/CartDialog';
import { api } from '@/lib/api';
import { getUserId, isAdmin } from '@/lib/telegram';
import { toast } from '@/lib/toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAdminView } from '@/contexts/AdminViewContext';
import { ADMIN_IDS, type Cart } from '@/types/api';
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
import { AnimatedList, AnimatedItem } from '@/components/animations';
import { motion } from 'framer-motion';

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
      toast.error(`Ошибка загрузки каталога: ${errorMessage}`);
    }
  }, [catalogError]);

  const [addingToCart, setAddingToCart] = useState<string | null>(null);

  const handleAddToCart = async (
    productId: string,
    variantId: string | undefined,
    quantity: number
  ) => {
    // Защита от множественных кликов
    const requestKey = `${productId}-${variantId}`;
    if (addingToCart === requestKey) {
      return; // Уже выполняется запрос
    }

    if (storeStatus?.is_sleep_mode) {
      toast.warning(storeStatus.sleep_message || 'Магазин временно не принимает заказы');
      return;
    }

    const userId = getUserId();
    if (!userId) {
      toast.error('Ошибка: не удалось определить пользователя');
      return;
    }

    setAddingToCart(requestKey);
    try {
      const updatedCart = await api.addToCart({
        product_id: productId,
        variant_id: variantId,
        quantity,
      });
      
      // Обновляем корзину с реальными данными - этого достаточно
      queryClient.setQueryData(CART_QUERY_KEY, updatedCart);
      setAddSuccess(true);
      setTimeout(() => setAddSuccess(false), 2000);
    } catch (error) {
      // Обновляем корзину при ошибке, чтобы показать актуальное состояние
      await queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при добавлении в корзину';
      toast.error(errorMessage);
    } finally {
      setAddingToCart(null);
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
        <main className="min-h-screen bg-background p-4 space-y-4" role="main" aria-busy>
          <Skeleton className="h-12 w-full" />
          <div className="flex gap-2 overflow-x-auto pb-2" aria-hidden>
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-10 w-24 flex-shrink-0" />
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4" aria-hidden>
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-80 w-full" />
            ))}
          </div>
        </main>
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
    <main className="min-h-screen bg-background pb-20" role="main">
      <header
        className="sticky bg-card/95 backdrop-blur-sm border-b border-border px-4 py-3 sm:px-6 sm:py-4 shadow-sm"
        style={{
          top: 'calc(env(safe-area-inset-top, 0px) + var(--tg-header-height, 0px) + var(--tg-nav-height, 0px))',
          zIndex: 5
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-shrink">
            <Package className="h-6 w-6 sm:h-7 sm:w-7 text-primary flex-shrink-0" />
            <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">Магазин</h1>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {isUserAdmin && forceClientView && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setForceClientView(false);
                  navigate('/admin');
                }}
                className="h-10 px-3 sm:px-4 gap-2 rounded-lg"
              >
                <ShieldCheck className="h-4 w-4 flex-shrink-0" />
                <span className="hidden sm:inline text-sm font-medium">Админ-режим</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/order')}
              className="h-10 px-3 sm:px-4 rounded-lg"
            >
              <ClipboardList className="h-4 w-4 sm:mr-2 flex-shrink-0" />
              <span className="hidden sm:inline text-sm font-medium">Мои заказы</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleHelp}
              className="h-10 px-3 sm:px-4 rounded-lg"
            >
              <HelpCircle className="h-4 w-4 sm:mr-2 flex-shrink-0" />
              <span className="hidden sm:inline text-sm font-medium">Помощь</span>
            </Button>

            <div className="relative">
              <Button
                variant="default"
                size="sm"
                onClick={() => setCartDialogOpen(true)}
                className="relative h-10 px-3 sm:px-4 rounded-lg shadow-sm"
              >
                <ShoppingCart className="h-4 w-4 sm:mr-2 flex-shrink-0" />
                <span className="hidden sm:inline text-sm font-medium">Корзина</span>
                {cartItemsCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 sm:relative sm:top-0 sm:right-0 sm:ml-2 bg-primary-foreground text-primary text-[10px] sm:text-xs font-bold rounded-full h-5 w-5 sm:h-6 sm:px-2 sm:w-auto flex items-center justify-center shadow-sm">
                    {cartItemsCount}
                  </span>
                )}
              </Button>
              {addSuccess && (
                <span className="absolute -right-1 -top-8 sm:-top-7 flex items-center gap-1 text-[10px] sm:text-xs text-primary bg-card/95 px-2 py-1 rounded-full shadow whitespace-nowrap">
                  <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Добавлено</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {storeStatus?.is_sleep_mode && (
        <section className="p-4" aria-label="Статус магазина">
          <Alert>
            <AlertTitle>Магазин временно не работает</AlertTitle>
            <AlertDescription>
              {storeStatus.sleep_message || 'Мы временно не принимаем заказы. Возвращайтесь позже!'}
            </AlertDescription>
          </Alert>
        </section>
      )}

      {categories.length > 0 && (
        <motion.section
          aria-label="Категории"
          className="px-4 py-4 sm:px-6 sm:py-5 border-b border-border bg-card"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex gap-2.5 sm:gap-3 overflow-x-auto pb-2 -mx-4 sm:-mx-6 px-4 sm:px-6 scrollbar-hide">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <Button
                variant={selectedCategory === null ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(null)}
                className="flex-shrink-0 h-10 px-5 text-sm font-medium"
              >
                Все
              </Button>
            </motion.div>
            {categories.map((category, index) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
              >
                <Button
                  variant={selectedCategory === category.id ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory(category.id)}
                  className="flex-shrink-0 h-10 px-5 text-sm font-medium whitespace-nowrap"
                >
                  {category.name}
                </Button>
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}

      <section className="px-4 py-5 sm:px-6 sm:py-6" aria-label="Список товаров">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 sm:py-20">
            <Package className="h-20 w-20 sm:h-24 sm:w-24 text-muted-foreground mx-auto mb-4" />
            <p className="text-base sm:text-lg text-muted-foreground font-medium">Товары не найдены</p>
            <p className="text-sm text-muted-foreground mt-2">Попробуйте выбрать другую категорию</p>
          </div>
        ) : (
          <AnimatedList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {filteredProducts.map((product, index) => {
              const selectedVariantId = product.variants?.[0]?.id;
              const isAdding = addingToCart === `${product.id}-${selectedVariantId}`;
              return (
                <AnimatedItem key={product.id} delay={index * 0.05}>
                  <ProductCard
                    product={product}
                    onAddToCart={handleAddToCart}
                    purchasesDisabled={storeStatus?.is_sleep_mode}
                    isAdding={isAdding}
                  />
                </AnimatedItem>
              );
            })}
          </AnimatedList>
        )}
      </section>

      <CartDialog
        open={cartDialogOpen}
        onOpenChange={setCartDialogOpen}
      />
      <Dialog open={helpDialogOpen} onOpenChange={setHelpDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Помощь</DialogTitle>
            <DialogDescription>
              Краткая инструкция по работе с магазином
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto flex-1 pr-1" style={{ scrollbarWidth: 'thin' }}>
            <section>
              <h3 className="text-sm font-semibold text-foreground">Как сделать заказ</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Добавьте товары в корзину, откройте её и нажмите «Оформить». Заполните контактные данные, выберите тип доставки
                и прикрепите чек об оплате — после этого заказ сразу уходит на подтверждение.
              </p>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-foreground">Изменение заказа</h3>
              <p className="text-sm text-muted-foreground mt-1">
                В разделе «Мои заказы» можно изменить адрес или комментарий до тех пор, пока заказ в статусе «Новый» или «В обработке».
                Если изменения нужны позже — напишите оператору в ответ на уведомление в Telegram.
              </p>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-foreground">Оплата</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Мы принимаем оплату картой или переводом. После оплаты загрузите чек в форму заказа — он попадёт в систему и ускорит подтверждение.
              </p>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-foreground">Как прикрепить чек</h3>
              <ul className="mt-1 text-sm text-muted-foreground space-y-1 list-disc pl-4">
                <li>Сфотографируйте или экспортируйте чек в формате JPG/PNG/PDF (до 10 МБ).</li>
                <li>В форме оформления нажмите «Прикрепить чек» и выберите файл из галереи или «Сохранённые файлы».</li>
                <li>Если загрузка не начинается, обновите страницу мини‑приложения и попробуйте снова.</li>
              </ul>
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
                Уведомления отправляем по мере обработки: «Новый» → «В обработке» → «Принят» → «Выехал» → «Завершён». Если появился статус «Отменён»,
                откройте заказ — там будет причина и кнопка для повторного оформления.
              </p>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-foreground">Если магазин спит</h3>
              <p className="text-sm text-muted-foreground mt-1">
                При включённом режиме сна оформление заказов временно недоступно. Мы покажем сообщение с причиной и временем возвращения. Нажмите «Обновить» позже — магазин автоматически откроется, как только администратор выключит паузу.
              </p>
            </section>
          </div>

          <div className="flex justify-end pt-4 border-t mt-4">
            <Button variant="outline" onClick={() => setHelpDialogOpen(false)}>
              Закрыть
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
    </>
  );
};
