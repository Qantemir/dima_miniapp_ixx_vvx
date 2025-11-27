import type { OrderStatus } from '@/types/api';
import { Button } from '@/components/ui/button';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { AdminSectionCard } from '@/components/admin/orders/AdminSectionCard';

export const AVAILABLE_STATUSES: OrderStatus[] = [
  'в обработке',
  'принят',
  'выехал',
  'завершён',
  'отменён',
];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  'новый': 'В обработке',
  'в обработке': 'В обработке',
  'принят': 'Принят',
  'выехал': 'Выехал',
  'завершён': 'Завершён',
  'отменён': 'Отменён',
};

interface AdminOrderStatusSectionProps {
  currentStatus: OrderStatus;
  disabled?: boolean;
  onSelect: (status: OrderStatus) => void;
}

export const AdminOrderStatusSection = ({
  currentStatus,
  disabled = false,
  onSelect,
}: AdminOrderStatusSectionProps) => (
  <div className="space-y-4">
    <AdminSectionCard ariaLabel="Текущий статус">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Текущий статус:</span>
        <OrderStatusBadge status={currentStatus} />
      </div>
    </AdminSectionCard>

    <AdminSectionCard title="Изменить статус" ariaLabel="Изменить статус заказа">
      <div className="grid grid-cols-2 gap-2">
        {AVAILABLE_STATUSES.map(status => (
          <Button
            key={status}
            variant={currentStatus === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSelect(status)}
            disabled={disabled || currentStatus === status}
            className="w-full"
            aria-pressed={currentStatus === status}
          >
            {STATUS_LABELS[status]}
          </Button>
        ))}
      </div>
    </AdminSectionCard>
  </div>
);

