import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CartItem as CartItemType } from '@/types/api';

interface CartItemProps {
  item: CartItemType;
  onRemove: (itemId: string) => void;
}

export const CartItem = ({ item, onRemove }: CartItemProps) => {
  const totalPrice = item.price * item.quantity;

  return (
    <div className="flex gap-3 p-4 bg-card rounded-lg border border-border">
      {item.image && (
        <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
          <img
            src={item.image}
            alt={item.product_name}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-foreground truncate">
          {item.product_name}
        </h4>
        {item.variant_name && (
          <p className="text-sm text-muted-foreground">{item.variant_name}</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm text-muted-foreground">
            {item.quantity} × {item.price} ₽
          </span>
          <span className="font-semibold text-foreground">
            = {totalPrice} ₽
          </span>
        </div>
      </div>

      <Button
        size="icon"
        variant="ghost"
        onClick={() => onRemove(item.id)}
        className="flex-shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};
