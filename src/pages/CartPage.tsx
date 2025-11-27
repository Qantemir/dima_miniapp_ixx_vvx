import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, ArrowLeft } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { CartItem } from '@/components/CartItem';
import { api } from '@/lib/api';
import { showMainButton, hideMainButton, showBackButton, hideBackButton } from '@/lib/telegram';
import { toast } from '@/lib/toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Seo } from '@/components/Seo';
import { buildCanonicalUrl } from '@/lib/seo';
import { useCart, CART_QUERY_KEY } from '@/hooks/useCart';
import { useQueryClient } from '@tanstack/react-query';
import { PageTransition, AnimatedList, AnimatedItem } from '@/components/animations';
import { useFixedHeaderOffset } from '@/hooks/useFixedHeaderOffset';

export const CartPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: cart, isLoading } = useCart(true);
  const { headerRef, headerHeight } = useFixedHeaderOffset(72);
  const headerTopOffset = 'calc(env(safe-area-inset-top, 0px) + var(--tg-header-height, 0px))';

  useEffect(() => {
    // Setup Telegram buttons
    showBackButton(() => navigate('/'));
    
    return () => {
      hideMainButton();
      hideBackButton();
    };
  }, [navigate]);

  useEffect(() => {
    if (cart && cart.items.length > 0) {
      showMainButton(
        `Оформить заказ • ${cart.total_amount} ₸`,
        () => navigate('/checkout')
      );
    } else {
      hideMainButton();
    }
  }, [cart, navigate]);

  const handleUpdateQuantity = async (itemId: string, quantity: number) => {
    try {
      const updatedCart = await api.updateCartItem({
        item_id: itemId,
        quantity,
      });
      queryClient.setQueryData(CART_QUERY_KEY, updatedCart);
    } catch (error) {
      toast.error('Ошибка при обновлении количества');
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      const updatedCart = await api.removeFromCart({
        item_id: itemId,
      });
      queryClient.setQueryData(CART_QUERY_KEY, updatedCart);
    } catch (error) {
      toast.error('Ошибка при удалении товара');
    }
  };

  const cartJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Корзина",
    description: "Проверьте товары перед оформлением заказа в Mini Shop.",
    url: buildCanonicalUrl("/cart"),
  };

  if (isLoading) {
    return (
      <>
        <Seo title="Корзина" description="Проверьте товары перед оформлением заказа." path="/cart" jsonLd={cartJsonLd} />
        <main className="min-h-screen bg-background p-4 space-y-4" role="main" aria-busy>
          <Skeleton className="h-12 w-full" />
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </main>
      </>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <>
        <Seo title="Корзина пуста" description="Добавьте товары в корзину, чтобы оформить заказ." path="/cart" jsonLd={cartJsonLd} />
        <>
          <div
            ref={headerRef}
            className="fixed inset-x-0 bg-card border-b border-border px-3 py-2.5 sm:px-4 sm:py-4"
            style={{
              top: headerTopOffset,
              zIndex: 10,
            }}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/')}
                className="h-9 w-9 sm:h-10 sm:w-10"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-lg sm:text-xl font-bold text-foreground">Корзина</h1>
            </div>
          </div>

          <main
            className="min-h-screen bg-background flex flex-col"
            role="main"
            style={{
              paddingTop: `calc(${headerHeight}px + env(safe-area-inset-top, 0px) + var(--tg-header-height, 0px))`,
            }}
          >
            <div className="flex-1 flex flex-col items-center justify-center p-4">
              <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg text-muted-foreground mb-2">Корзина пуста</p>
              <p className="text-sm text-muted-foreground mb-6">
                Добавьте товары из каталога
              </p>
              <Button onClick={() => navigate('/')}>
                Перейти к покупкам
              </Button>
            </div>
          </main>
        </>
      </>
    );
  }

  return (
    <>
      <Seo title="Корзина" description="Редактируйте корзину и переходите к оформлению заказа." path="/cart" jsonLd={cartJsonLd} />
      <PageTransition>
        <>
          <div
            ref={headerRef}
            className="fixed inset-x-0 bg-card border-b border-border px-3 py-2.5 sm:px-4 sm:py-4"
            style={{
              top: headerTopOffset,
              zIndex: 10,
            }}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/')}
                className="h-9 w-9 sm:h-10 sm:w-10"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-lg sm:text-xl font-bold text-foreground">Корзина</h1>
            </div>
          </div>

          <main
            className="min-h-screen bg-background pb-24"
            role="main"
            style={{
              paddingTop: `calc(${headerHeight}px + env(safe-area-inset-top, 0px) + var(--tg-header-height, 0px))`,
            }}
          >
            <section className="px-4 py-5 sm:px-6 sm:py-6" aria-label="Товары в корзине">
              <AnimatedList className="space-y-4">
                {cart.items.map((item, index) => (
                  <AnimatedItem key={item.id} delay={index * 0.05}>
                    <CartItem
                      item={item}
                      onUpdateQuantity={handleUpdateQuantity}
                      onRemove={handleRemoveItem}
                    />
                  </AnimatedItem>
                ))}
              </AnimatedList>
            </section>

            <section className="px-4 py-5 sm:px-6 sm:py-6 bg-card border-t border-border sticky bottom-0" aria-label="Итоговая сумма">
              <div className="flex items-center justify-between">
                <span className="text-base sm:text-lg font-semibold text-muted-foreground">Итого:</span>
                <span className="font-bold text-foreground text-2xl sm:text-3xl">
                  {cart.total_amount} ₸
                </span>
              </div>
            </section>
          </main>
        </>
      </PageTransition>
    </>
  );
};
