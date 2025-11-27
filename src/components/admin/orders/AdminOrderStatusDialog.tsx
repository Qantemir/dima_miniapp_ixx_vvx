import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { OrderStatus } from '@/types/api';

interface AdminOrderStatusDialogProps {
  open: boolean;
  pendingStatus: OrderStatus | null;
  statusLabels: Record<OrderStatus, string>;
  updating: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}

export const AdminOrderStatusDialog = ({
  open,
  pendingStatus,
  statusLabels,
  updating,
  onConfirm,
  onOpenChange,
}: AdminOrderStatusDialogProps) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Изменить статус заказа?</AlertDialogTitle>
        <AlertDialogDescription>
          {pendingStatus
            ? `Установить статус "${statusLabels[pendingStatus]}"?`
            : 'Выберите статус, чтобы изменить его.'}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={updating}>Отмена</AlertDialogCancel>
        <AlertDialogAction
          disabled={!pendingStatus || updating}
          onClick={event => {
            event.preventDefault();
            onConfirm();
          }}
        >
          Изменить
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

