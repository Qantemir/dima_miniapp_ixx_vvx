import type { Order } from '@/types/api';
import { AdminSectionCard } from '@/components/admin/orders/AdminSectionCard';

interface AdminOrderItemsSectionProps {
  items: Order['items'];
  total: number;
}

export const AdminOrderItemsSection = ({ items, total }: AdminOrderItemsSectionProps) => (
  <AdminSectionCard title="Состав заказа" ariaLabel="Состав заказа" footer={
    <div className="flex justify-between items-center">
      <span className="text-lg font-semibold text-foreground">Итого:</span>
      <span className="text-2xl font-bold text-foreground">{total} ₸</span>
    </div>
  }>
    <ul className="space-y-2">
      {items.map((item, index) => (
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
  </AdminSectionCard>
);

