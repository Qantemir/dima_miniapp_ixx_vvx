import type { Order } from '@/types/api';
import { OrderSectionCard } from '@/components/order/OrderSectionCard';

interface OrderItemsSectionProps {
  items: Order['items'];
  totalAmount: number;
}

export const OrderItemsSection = ({ items, totalAmount }: OrderItemsSectionProps) => (
  <OrderSectionCard className="space-y-3">
    <h3 className="font-semibold text-foreground text-sm sm:text-base">Состав заказа</h3>
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={`${item.product_id}-${index}`} className="flex justify-between text-sm">
          <div className="flex-1">
            <p className="text-foreground">
              {item.product_name}
              {item.variant_name && ` (${item.variant_name})`}
            </p>
            <p className="text-muted-foreground">
              {item.quantity} × {item.price} ₸
            </p>
          </div>
          <span className="font-medium text-foreground">{item.quantity * item.price} ₸</span>
        </div>
      ))}
    </div>
    <div className="pt-3 border-t border-border flex justify-between">
      <span className="font-semibold text-foreground">Итого:</span>
      <span className="text-xl font-bold text-foreground">{totalAmount} ₸</span>
    </div>
  </OrderSectionCard>
);

