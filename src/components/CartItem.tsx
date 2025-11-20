import { Trash2, Plus, Minus } from '@/components/icons';
import { Button } from '@/components/ui/button';
import type { CartItem as CartItemType } from '@/types/api';

interface CartItemProps {
  item: CartItemType;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
}

export const CartItem = ({ item, onUpdateQuantity, onRemove }: CartItemProps) => {
  const totalPrice = item.price * item.quantity;

  const handleDecrease = () => {
    if (item.quantity > 1) {
      onUpdateQuantity(item.id, item.quantity - 1);
    } else {
      onRemove(item.id);
    }
  };

  const handleIncrease = () => {
    if (item.quantity < 50) {
      onUpdateQuantity(item.id, item.quantity + 1);
    }
  };

  return (
    <div className="flex gap-3 p-4 bg-card rounded-lg border border-border">
      {item.image && (
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
          <img
            src={item.image}
            alt={item.product_name}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-foreground truncate text-sm sm:text-base">
              {item.product_name}
            </h4>
            {item.variant_name && (
              <p className="text-xs sm:text-sm text-muted-foreground">{item.variant_name}</p>
            )}
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onRemove(item.id)}
            className="flex-shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 sm:h-9 sm:w-9"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs sm:text-sm font-semibold text-foreground">
              {item.price} ₸
            </span>
            <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline">×</span>
            <div className="flex items-center gap-0 border border-border rounded-md">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 sm:h-7 sm:w-7 rounded-none"
                onClick={handleDecrease}
                disabled={item.quantity <= 1}
              >
                <Minus className="h-3.5 w-3.5" />
              </Button>
              <span className="min-w-[2rem] text-center text-xs sm:text-sm font-medium text-foreground px-1">
                {item.quantity}
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 sm:h-7 sm:w-7 rounded-none"
                onClick={handleIncrease}
                disabled={item.quantity >= 50}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline">=</span>
            <span className="text-sm sm:text-base font-semibold text-foreground">
              {totalPrice} ₸
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
