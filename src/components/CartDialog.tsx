import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CartItem } from '@/components/CartItem';
import { api } from '@/lib/api';
import { getUserId, showAlert } from '@/lib/telegram';
import type { Cart } from '@/types/api';
import { Skeleton } from '@/components/ui/skeleton';

interface CartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCartUpdate?: () => void;
}

export const CartDialog = ({ open, onOpenChange, onCartUpdate }: CartDialogProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<Cart | null>(null);

  useEffect(() => {
    if (open) {
      loadCart();
    }
  }, [open]);

  const loadCart = async () => {
    const userId = getUserId();
    if (!userId) {
      showAlert('Ошибка: не удалось определить пользователя');
      onOpenChange(false);
      return;
    }

    try {
      setLoading(true);
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
      onCartUpdate?.();
    } catch (error) {
      showAlert('Ошибка при удалении товара');
    }
  };

  const handleCheckout = () => {
    onOpenChange(false);
    navigate('/checkout');
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Корзина</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Корзина</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-8">
            <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground mb-2">Корзина пуста</p>
            <p className="text-sm text-muted-foreground mb-6 text-center">
              Добавьте товары из каталога
            </p>
            <Button onClick={() => onOpenChange(false)}>
              Продолжить покупки
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-xl">Корзина</DialogTitle>
        </DialogHeader>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {cart.items.map(item => (
            <CartItem
              key={item.id}
              item={item}
              onRemove={handleRemoveItem}
            />
          ))}
        </div>

        {/* Footer with Total and Checkout */}
        <div className="border-t bg-card px-6 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Итого:</span>
            <span className="font-bold text-foreground text-2xl">
              {cart.total_amount} ₽
            </span>
          </div>
          <Button 
            onClick={handleCheckout} 
            className="w-full"
            size="lg"
          >
            Оформить заказ
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
