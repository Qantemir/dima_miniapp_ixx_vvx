import type { OrderStatus } from '@/types/api';

interface OrderStatusBadgeProps {
  status: OrderStatus;
}

export const OrderStatusBadge = ({ status }: OrderStatusBadgeProps) => {
  const getStatusConfig = (status: OrderStatus) => {
    switch (status) {
      case 'новый':
        // Старые заказы со статусом "новый" показываем как "В обработке"
        return { label: 'В обработке', className: 'bg-warning/10 text-warning' };
      case 'в обработке':
        return { label: 'В обработке', className: 'bg-warning/10 text-warning' };
      case 'принят':
        return { label: 'Принят', className: 'bg-success/10 text-success' };
      case 'выехал':
        return { label: 'Выехал', className: 'bg-accent/10 text-accent' };
      case 'завершён':
        return { label: 'Завершён', className: 'bg-muted text-muted-foreground' };
      case 'отменён':
        return { label: 'Отменён', className: 'bg-destructive/10 text-destructive' };
      default:
        return { label: status, className: 'bg-muted text-muted-foreground' };
    }
  };

  const config = getStatusConfig(status);

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.className}`}>
      {config.label}
    </span>
  );
};
