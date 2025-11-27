import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { buildApiAssetUrl } from '@/lib/utils';
import { toast } from '@/lib/toast';
import type { Order, OrderStatus } from '@/types/api';
import { useAdminGuard } from './useAdminGuard';

export const useAdminOrderDetail = (orderId?: string) => {
  const navigate = useNavigate();
  const isAuthorized = useAdminGuard('/admin');
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [updating, setUpdating] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<OrderStatus | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);

  const loadOrder = useCallback(async () => {
    if (!orderId) {
      setLoading(false);
      return;
    }
    try {
      const data = await api.getAdminOrder(orderId);
      setOrder(data);
    } catch (error) {
      toast.error('Ошибка загрузки заказа');
      navigate('/admin');
    } finally {
      setLoading(false);
    }
  }, [orderId, navigate]);

  useEffect(() => {
    if (!isAuthorized) {
      return;
    }
    if (orderId) {
      loadOrder();
    } else {
      setLoading(false);
    }
  }, [isAuthorized, orderId, loadOrder]);

  const handleStatusSelect = useCallback(
    (newStatus: OrderStatus) => {
      if (!order || newStatus === order.status) {
        return;
      }
      setPendingStatus(newStatus);
      setStatusDialogOpen(true);
    },
    [order],
  );

  const confirmStatusChange = useCallback(async () => {
    if (!order || !pendingStatus || updating) {
      return;
    }

    const targetStatus = pendingStatus;
    setUpdating(true);
    setStatusDialogOpen(false);

    try {
      const updatedOrder = await api.updateOrderStatus(order.id, { status: targetStatus });
      setOrder(updatedOrder);
      toast.success('Статус заказа обновлён');
    } catch (error) {
      toast.error('Ошибка при обновлении статуса');
      setStatusDialogOpen(true);
    } finally {
      setUpdating(false);
      setPendingStatus(null);
    }
  }, [order, pendingStatus, updating]);

  const handleStatusDialogChange = useCallback(
    (open: boolean) => {
      setStatusDialogOpen(open);
      if (!open && !updating) {
        setPendingStatus(null);
      }
    },
    [updating],
  );

  const goBack = useCallback(() => navigate('/admin'), [navigate]);

  const receiptUrl = useMemo(
    () => (order?.payment_receipt_url ? buildApiAssetUrl(order.payment_receipt_url) : null),
    [order],
  );

  const shortOrderId = order ? order.id.slice(-6) : '';
  const createdAtLabel = order
    ? new Date(order.created_at).toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const seoPath = orderId ? `/admin/order/${orderId}` : '/admin/order';
  const seoTitle = order ? `Админ: Заказ ${shortOrderId}` : 'Админ: Заказ';

  return {
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
  };
};
