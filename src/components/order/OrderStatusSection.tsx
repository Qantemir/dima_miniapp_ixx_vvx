import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import type { Order } from '@/types/api';
import { OrderSectionCard } from '@/components/order/OrderSectionCard';

interface OrderStatusSectionProps {
  status: Order['status'];
}

export const OrderStatusSection = ({ status }: OrderStatusSectionProps) => (
  <OrderSectionCard>
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">Статус заказа:</span>
      <OrderStatusBadge status={status} />
    </div>
  </OrderSectionCard>
);

