import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart } from '@/components/icons';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MemoizedCartItem as CartItem } from '@/components/CartItem';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useCart, CART_QUERY_KEY } from '@/hooks/useCart';
import { useQueryClient } from '@tanstack/react-query';
import { AnimatedList } from '@/components/animations';

interface CartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CartDialog = ({ open, onOpenChange }: CartDialogProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: cart, isLoading } = useCart(open);

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

  const handleCheckout = () => {
    onOpenChange(false);
    navigate('/checkout');
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Корзина</DialogTitle>
            <DialogDescription className="sr-only">Загрузка корзины</DialogDescription>
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
        <DialogContent className="max-w-md" aria-describedby="empty-cart-description">
          <DialogHeader>
            <DialogTitle>Корзина</DialogTitle>
            <DialogDescription className="sr-only">Корзина пуста</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-8">
            <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground mb-2">Корзина пуста</p>
            <p id="empty-cart-description" className="text-sm text-muted-foreground mb-6 text-center">
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
        <DialogContent
          className="max-w-md max-h-[90vh] sm:max-h-[85vh] flex flex-col p-0 w-[95vw] sm:w-full"
          aria-describedby="cart-dialog-content"
        >
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b">
          <DialogTitle className="text-lg sm:text-xl">Корзина</DialogTitle>
          <DialogDescription className="sr-only">Содержимое корзины</DialogDescription>
        </DialogHeader>

        {/* Cart Items */}
        <div id="cart-dialog-content" className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 sm:py-4">
          <AnimatedList className="space-y-2 sm:space-y-3">
            <AnimatePresence mode="popLayout">
              {cart.items.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  layout
                >
                  <CartItem
                    item={item}
                    onUpdateQuantity={handleUpdateQuantity}
                    onRemove={handleRemoveItem}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </AnimatedList>
        </div>

        {/* Footer with Total and Checkout */}
        <div className="border-t bg-card px-4 sm:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm sm:text-base text-muted-foreground">Итого:</span>
            <span className="font-bold text-foreground text-xl sm:text-2xl">
              {cart.total_amount} ₸
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
