import type { OrderStatus } from '@/types/api';
import { Button } from '@/components/ui/button';
import { AdminSectionCard } from '@/components/admin/AdminSectionCard';

interface AdminOrderStatusActionsProps {
  availableStatuses: OrderStatus[];
  currentStatus: OrderStatus;
  labels: Record<OrderStatus, string>;
  onSelect: (status: OrderStatus) => void;
  disabled?: boolean;
}

export const AdminOrderStatusActions = ({
  availableStatuses,
  currentStatus,
  labels,
  onSelect,
  disabled = false,
}: AdminOrderStatusActionsProps) => (
  <AdminSectionCard title="Изменить статус" ariaLabel="Изменить статус заказа">
    <div className="grid grid-cols-2 gap-2">
      {availableStatuses.map(status => (
        <Button
          key={status}
          variant={currentStatus === status ? 'default' : 'outline'}
          size="sm"
          onClick={() => onSelect(status)}
          disabled={disabled || currentStatus === status}
          className="w-full"
          aria-pressed={currentStatus === status}
        >
          {labels[status]}
        </Button>
      ))}
    </div>
  </AdminSectionCard>
);

