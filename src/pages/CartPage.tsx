import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CartItem } from '@/components/CartItem';
import { api } from '@/lib/api';
import { getUserId, showAlert, showMainButton, hideMainButton, showBackButton, hideBackButton } from '@/lib/telegram';
import type { Cart } from '@/types/api';
import { Skeleton } from '@/components/ui/skeleton';
import { Seo } from '@/components/Seo';
import { buildCanonicalUrl } from '@/lib/seo';

export const CartPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<Cart | null>(null);

  useEffect(() => {
    loadCart();
    
    // Setup Telegram buttons
    showBackButton(() => navigate('/'));
    
    return () => {
      hideMainButton();
      hideBackButton();
    };
  }, []);

  useEffect(() => {
    if (cart && cart.items.length > 0) {
      showMainButton(
        `Оформить заказ • ${cart.total_amount} ₽`,
        () => navigate('/checkout')
      );
    } else {
      hideMainButton();
    }
  }, [cart, navigate]);

  const loadCart = async () => {
    const userId = getUserId();
    if (!userId) {
      showAlert('Ошибка: не удалось определить пользователя');
      navigate('/');
      return;
    }

    try {
      const data = await api.getCart(userId);
      setCart(data);
    } catch (error) {
      showAlert('Ошибка загрузки корзины');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    const userId = getUserId();
    if (!userId) return;

    try {
      const updatedCart = await api.removeFromCart({
        user_id: userId,
        item_id: itemId,
      });
      setCart(updatedCart);
    } catch (error) {
      showAlert('Ошибка при удалении товара');
    }
  };

  const cartJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Корзина",
    description: "Проверьте товары перед оформлением заказа в Mini Shop.",
    url: buildCanonicalUrl("/cart"),
  };

  if (loading) {
    return (
      <>
        <Seo title="Корзина" description="Проверьте товары перед оформлением заказа." path="/cart" jsonLd={cartJsonLd} />
        <div className="min-h-screen bg-background p-4 space-y-4">
          <Skeleton className="h-12 w-full" />
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <>
        <Seo title="Корзина пуста" description="Добавьте товары в корзину, чтобы оформить заказ." path="/cart" jsonLd={cartJsonLd} />
        <div className="min-h-screen bg-background flex flex-col">
        <div className="p-4 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold text-foreground">Корзина</h1>
          </div>
        </div>
        
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
        </div>
      </>
    );
  }

  return (
    <>
      <Seo title="Корзина" description="Редактируйте корзину и переходите к оформлению заказа." path="/cart" jsonLd={cartJsonLd} />
      <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border p-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Корзина</h1>
        </div>
      </div>

      {/* Cart Items */}
      <div className="p-4 space-y-3">
        {cart.items.map(item => (
          <CartItem
            key={item.id}
            item={item}
            onRemove={handleRemoveItem}
          />
        ))}
      </div>

      {/* Total */}
      <div className="p-4 bg-card border-t border-border">
        <div className="flex items-center justify-between text-lg">
          <span className="text-muted-foreground">Итого:</span>
          <span className="font-bold text-foreground text-2xl">
            {cart.total_amount} ₽
          </span>
        </div>
      </div>
      </div>
    </>
  );
};
