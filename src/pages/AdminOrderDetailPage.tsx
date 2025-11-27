import { useParams } from 'react-router-dom';
import type { OrderStatus } from '@/types/api';
import { Seo } from '@/components/Seo';
import { AdminOrderDetailSkeleton } from '@/components/admin/orders/AdminOrderDetailSkeleton';
import { AdminOrderDetailNotFound } from '@/components/admin/orders/AdminOrderDetailNotFound';
import { AdminOrderDetailView } from '@/components/admin/orders/AdminOrderDetailView';
import { AdminOrderStatusDialog } from '@/components/admin/orders/AdminOrderStatusDialog';
import { useAdminOrderDetail } from '@/hooks/useAdminOrderDetail';

const AVAILABLE_STATUSES: OrderStatus[] = [
  'в обработке',
  'принят',
  'выехал',
  'завершён',
  'отменён',
];

const STATUS_LABELS: Record<OrderStatus, string> = {
  'новый': 'В обработке', // Старые заказы со статусом "новый" показываем как "В обработке"
  'в обработке': 'В обработке',
  'принят': 'Принят',
  'выехал': 'Выехал',
  'завершён': 'Завершён',
  'отменён': 'Отменён',
};

export const AdminOrderDetailPage = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const {
    loading,
    order,
    updating,
    pendingStatus,
    statusDialogOpen,
    receiptUrl,
    shortOrderId,
    createdAtLabel,
    seoPath,
    seoTitle,
    handleStatusSelect,
    confirmStatusChange,
    handleStatusDialogChange,
    goBack,
  } = useAdminOrderDetail(orderId);

  if (loading) {
    return (
      <>
        <Seo title={seoTitle} description="Просматривайте информацию о заказе." path={seoPath} noIndex />
        <AdminOrderDetailSkeleton />
      </>
    );
  }

  if (!order) {
    return (
      <>
        <Seo title="Админ: Заказ" description="Заказ не найден." path={seoPath} noIndex />
        <AdminOrderDetailNotFound />
      </>
    );
  }

  return (
    <>
      <Seo title={seoTitle} description="Изменяйте статус и просматривайте детали заказа." path={seoPath} noIndex />
      <AdminOrderDetailView
        order={order}
        shortOrderId={shortOrderId}
        createdAtLabel={createdAtLabel}
        receiptUrl={receiptUrl}
        availableStatuses={AVAILABLE_STATUSES}
        statusLabels={STATUS_LABELS}
        updating={updating}
        onStatusSelect={handleStatusSelect}
        onBack={goBack}
      />

      <AdminOrderStatusDialog
        open={statusDialogOpen}
        pendingStatus={pendingStatus}
        statusLabels={STATUS_LABELS}
        updating={updating}
        onConfirm={() => confirmStatusChange()}
        onOpenChange={handleStatusDialogChange}
      />
    </>
  );
};
