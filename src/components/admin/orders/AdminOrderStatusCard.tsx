import type { OrderStatus } from '@/types/api';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { AdminSectionCard } from '@/components/admin/AdminSectionCard';

interface AdminOrderStatusCardProps {
  status: OrderStatus;
}

export const AdminOrderStatusCard = ({ status }: AdminOrderStatusCardProps) => (
  <AdminSectionCard ariaLabel="Текущий статус">
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">Текущий статус:</span>
      <OrderStatusBadge status={status} />
    </div>
  </AdminSectionCard>
);

