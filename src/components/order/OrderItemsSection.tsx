import type { Order } from '@/types/api';
import { OrderSectionCard } from '@/components/order/OrderSectionCard';

interface OrderItemsSectionProps {
  items: Order['items'];
  totalAmount: number;
}

export const OrderItemsSection = ({ items, totalAmount }: OrderItemsSectionProps) => {
  const safeItems = (items || []).filter(
    item => item && item.product_id && item.product_name && typeof item.quantity === 'number' && typeof item.price === 'number'
  );
  const safeTotalAmount = totalAmount || 0;

  if (safeItems.length === 0) {
    return (
      <OrderSectionCard className="space-y-3">
        <h3 className="font-semibold text-foreground text-sm sm:text-base">Состав заказа</h3>
        <p className="text-muted-foreground text-sm">Товары не найдены</p>
        <div className="pt-3 border-t border-border flex justify-between">
          <span className="font-semibold text-foreground">Итого:</span>
          <span className="text-xl font-bold text-foreground">{safeTotalAmount} ₸</span>
        </div>
      </OrderSectionCard>
    );
  }

  return (
    <OrderSectionCard className="space-y-3">
      <h3 className="font-semibold text-foreground text-sm sm:text-base">Состав заказа</h3>
      <div className="space-y-2">
        {safeItems.map((item, index) => {
          const productId = item.product_id || `item-${index}`;
          const quantity = item.quantity || 0;
          const price = item.price || 0;
          const productName = item.product_name || 'Неизвестный товар';
          
          return (
            <div key={`${productId}-${index}`} className="flex justify-between text-sm">
              <div className="flex-1">
                <p className="text-foreground">
                  {productName}
                  {item.variant_name && ` (${item.variant_name})`}
                </p>
                <p className="text-muted-foreground">
                  {quantity} × {price} ₸
                </p>
              </div>
              <span className="font-medium text-foreground">{quantity * price} ₸</span>
            </div>
          );
        })}
      </div>
      <div className="pt-3 border-t border-border flex justify-between">
        <span className="font-semibold text-foreground">Итого:</span>
        <span className="text-xl font-bold text-foreground">{safeTotalAmount} ₸</span>
      </div>
    </OrderSectionCard>
  );
};

