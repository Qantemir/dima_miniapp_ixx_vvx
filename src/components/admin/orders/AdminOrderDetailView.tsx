import type { Order, OrderStatus } from '@/types/api';
import { AdminOrderHeader } from '@/components/admin/orders/AdminOrderHeader';
import { AdminOrderStatusCard } from '@/components/admin/orders/AdminOrderStatusCard';
import { AdminOrderStatusActions } from '@/components/admin/orders/AdminOrderStatusActions';
import { AdminOrderCustomerCard } from '@/components/admin/orders/AdminOrderCustomerCard';
import { AdminOrderAddressCard } from '@/components/admin/orders/AdminOrderAddressCard';
import { AdminOrderItemsCard } from '@/components/admin/orders/AdminOrderItemsCard';
import { AdminOrderReceiptCard } from '@/components/admin/orders/AdminOrderReceiptCard';
import { AdminOrderCommentCard } from '@/components/admin/orders/AdminOrderCommentCard';

interface AdminOrderDetailViewProps {
  order: Order;
  shortOrderId: string;
  createdAtLabel: string;
  receiptUrl: string | null;
  availableStatuses: OrderStatus[];
  statusLabels: Record<OrderStatus, string>;
  updating: boolean;
  onStatusSelect: (status: OrderStatus) => void;
  onBack: () => void;
}

export const AdminOrderDetailView = ({
  order,
  shortOrderId,
  createdAtLabel,
  receiptUrl,
  availableStatuses,
  statusLabels,
  updating,
  onStatusSelect,
  onBack,
}: AdminOrderDetailViewProps) => (
  <main className="min-h-screen bg-background pb-6" role="main">
    <AdminOrderHeader shortOrderId={shortOrderId} createdAt={createdAtLabel} onBack={onBack} />

    <div className="p-4 space-y-6">
      <AdminOrderStatusCard status={order.status} />

      <AdminOrderStatusActions
        availableStatuses={availableStatuses}
        currentStatus={order.status}
        labels={statusLabels}
        onSelect={onStatusSelect}
        disabled={updating}
      />

      <AdminOrderCustomerCard name={order.customer_name} phone={order.customer_phone} />
      <AdminOrderAddressCard address={order.delivery_address} />
      <AdminOrderItemsCard items={order.items} totalAmount={order.total_amount} />

      {receiptUrl ? (
        <AdminOrderReceiptCard receiptUrl={receiptUrl} filename={order.payment_receipt_filename} />
      ) : null}

      {order.comment ? <AdminOrderCommentCard comment={order.comment} /> : null}
    </div>
  </main>
);

