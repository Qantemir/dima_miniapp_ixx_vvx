import type { Order } from '@/types/api';
import { AdminSectionCard } from '@/components/admin/AdminSectionCard';

interface AdminOrderItemsCardProps {
  items: Order['items'];
  totalAmount: number;
}

export const AdminOrderItemsCard = ({ items, totalAmount }: AdminOrderItemsCardProps) => {
  // Фильтруем null/undefined элементы и элементы без обязательных полей
  const safeItems = (items || []).filter(
    item => item && item.product_name && typeof item.quantity === 'number' && typeof item.price === 'number'
  );

  return (
    <AdminSectionCard title="Состав заказа" ariaLabel="Состав заказа">
      <ul className="space-y-2">
        {safeItems.map((item, index) => (
          <li
            key={`${item.product_name}-${item.variant_name ?? 'default'}-${index}`}
            className="flex justify-between text-sm py-2 border-b border-border last:border-0"
          >
            <div className="flex-1">
              <p className="text-foreground font-medium">
                {item.product_name}
                {item.variant_name && ` (${item.variant_name})`}
              </p>
              <p className="text-muted-foreground">
                {item.quantity} × {item.price} ₸
              </p>
            </div>
            <span className="font-semibold text-foreground">{item.quantity * item.price} ₸</span>
          </li>
        ))}
      </ul>
      <div className="pt-3 border-t border-border flex justify-between items-center">
        <span className="text-lg font-semibold text-foreground">Итого:</span>
        <span className="text-2xl font-bold text-foreground">{totalAmount} ₸</span>
      </div>
    </AdminSectionCard>
  );
};

