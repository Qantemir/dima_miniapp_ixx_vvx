import { memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Plus, Minus } from '@/components/icons';
import { Button } from '@/components/ui/button';
import type { CartItem as CartItemType } from '@/types/api';

interface CartItemProps {
  item: CartItemType;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
}

const CartItem = ({ item, onUpdateQuantity, onRemove }: CartItemProps) => {
  const totalPrice = item.price * item.quantity;

  const handleDecrease = useCallback(() => {
    if (item.quantity > 1) {
      onUpdateQuantity(item.id, item.quantity - 1);
    } else {
      onRemove(item.id);
    }
  }, [item.id, item.quantity, onUpdateQuantity, onRemove]);

  const handleIncrease = useCallback(() => {
    if (item.quantity < 50) {
      onUpdateQuantity(item.id, item.quantity + 1);
    }
  }, [item.id, item.quantity, onUpdateQuantity]);

  const handleRemove = useCallback(() => {
    onRemove(item.id);
  }, [item.id, onRemove]);

  return (
    <motion.div 
      className="flex gap-3 sm:gap-4 p-4 sm:p-5 bg-card rounded-xl border border-border shadow-sm"
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2 }}
    >
      {item.image && (
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0 border border-border/50">
          <img
            src={item.image}
            alt={item.product_name}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        </div>
      )}
      
      <div className="flex-1 min-w-0 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-foreground truncate text-base sm:text-lg leading-tight">
              {item.product_name}
            </h4>
            {item.variant_name && (
              <p className="text-sm text-muted-foreground mt-1">{item.variant_name}</p>
            )}
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleRemove}
            className="flex-shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10 h-9 w-9 sm:h-10 sm:w-10 rounded-lg"
          >
            <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-3">
            <span className="text-sm sm:text-base font-semibold text-foreground">
              {item.price} ₸
            </span>
            <span className="text-sm text-muted-foreground hidden sm:inline">×</span>
            <div className="flex items-center gap-0 border border-border rounded-lg bg-secondary/50">
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 sm:h-8 sm:w-8 rounded-l-lg rounded-r-none"
                onClick={handleDecrease}
                disabled={item.quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="min-w-[2.5rem] text-center text-sm sm:text-base font-semibold text-foreground px-2">
                {item.quantity}
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 sm:h-8 sm:w-8 rounded-r-lg rounded-l-none"
                onClick={handleIncrease}
                disabled={item.quantity >= 50}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">=</span>
            <span className="text-base sm:text-lg font-bold text-foreground">
              {totalPrice} ₸
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Мемоизация для предотвращения лишних ререндеров
export const MemoizedCartItem = memo(CartItem, (prevProps, nextProps) => {
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.quantity === nextProps.item.quantity &&
    prevProps.item.price === nextProps.item.price
  );
});
