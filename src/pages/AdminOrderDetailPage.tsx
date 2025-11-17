import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, User, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { api } from '@/lib/api';
import { getUserId, showAlert, showBackButton, hideBackButton, showPopup } from '@/lib/telegram';
import type { Order, OrderStatus } from '@/types/api';
import { Skeleton } from '@/components/ui/skeleton';

const AVAILABLE_STATUSES: OrderStatus[] = [
  'новый',
  'в обработке',
  'принят',
  'выехал',
  'завершён',
  'отменён',
];

export const AdminOrderDetailPage = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (orderId) {
      loadOrder();
    }

    showBackButton(() => navigate('/admin'));

    return () => {
      hideBackButton();
    };
  }, [orderId]);

  const loadOrder = async () => {
    if (!orderId) return;

    try {
      const data = await api.getOrder(orderId);
      setOrder(data);
    } catch (error) {
      showAlert('Ошибка загрузки заказа');
      navigate('/admin');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (!order) return;

    const userId = getUserId();
    if (!userId) {
      showAlert('Ошибка: не удалось определить пользователя');
      return;
    }

    const statusLabels: Record<OrderStatus, string> = {
      'новый': 'Новый',
      'в обработке': 'В обработке',
      'принят': 'Принят',
      'выехал': 'Выехал',
      'завершён': 'Завершён',
      'отменён': 'Отменён',
    };

    showPopup(
      {
        title: 'Подтверждение',
        message: `Изменить статус заказа на "${statusLabels[newStatus]}"?`,
        buttons: [
          { id: 'cancel', type: 'cancel', text: 'Отмена' },
          { id: 'confirm', type: 'default', text: 'Изменить' },
        ],
      },
      async (buttonId) => {
        if (buttonId === 'confirm') {
          setUpdating(true);
          try {
            const updatedOrder = await api.updateOrderStatus(order.id, {
              user_id: userId,
              status: newStatus,
            });
            setOrder(updatedOrder);
            showAlert('Статус заказа обновлён');
          } catch (error) {
            showAlert('Ошибка при обновлении статуса');
          } finally {
            setUpdating(false);
          }
        }
      }
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!order) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border p-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/admin')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Заказ #{order.id.slice(-6)}
            </h1>
            <p className="text-sm text-muted-foreground">
              {new Date(order.created_at).toLocaleString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Current Status */}
        <div className="bg-card rounded-lg p-4 border border-border">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Текущий статус:</span>
            <OrderStatusBadge status={order.status} />
          </div>
        </div>

        {/* Change Status */}
        <div className="bg-card rounded-lg p-4 border border-border space-y-3">
          <h3 className="font-semibold text-foreground">Изменить статус</h3>
          <div className="grid grid-cols-2 gap-2">
            {AVAILABLE_STATUSES.map(status => (
              <Button
                key={status}
                variant={order.status === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusChange(status)}
                disabled={updating || order.status === status}
                className="justify-start"
              >
                <OrderStatusBadge status={status} />
              </Button>
            ))}
          </div>
        </div>

        {/* Customer Info */}
        <div className="bg-card rounded-lg p-4 border border-border space-y-3">
          <h3 className="font-semibold text-foreground">Клиент</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground">{order.customer_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <a
                href={`tel:${order.customer_phone}`}
                className="text-primary hover:underline"
              >
                {order.customer_phone}
              </a>
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="bg-card rounded-lg p-4 border border-border space-y-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Адрес доставки</h3>
          </div>
          <p className="text-foreground">{order.delivery_address}</p>
        </div>

        {/* Order Items */}
        <div className="bg-card rounded-lg p-4 border border-border space-y-3">
          <h3 className="font-semibold text-foreground">Состав заказа</h3>
          <div className="space-y-2">
            {order.items.map((item, index) => (
              <div key={index} className="flex justify-between text-sm py-2 border-b border-border last:border-0">
                <div className="flex-1">
                  <p className="text-foreground font-medium">
                    {item.product_name}
                    {item.variant_name && ` (${item.variant_name})`}
                  </p>
                  <p className="text-muted-foreground">
                    {item.quantity} × {item.price} ₽
                  </p>
                </div>
                <span className="font-semibold text-foreground">
                  {item.quantity * item.price} ₽
                </span>
              </div>
            ))}
          </div>
          <div className="pt-3 border-t border-border flex justify-between items-center">
            <span className="text-lg font-semibold text-foreground">Итого:</span>
            <span className="text-2xl font-bold text-foreground">
              {order.total_amount} ₽
            </span>
          </div>
        </div>

        {/* Comment */}
        {order.comment && (
          <div className="bg-card rounded-lg p-4 border border-border space-y-2">
            <h3 className="font-semibold text-foreground">Комментарий</h3>
            <p className="text-foreground">{order.comment}</p>
          </div>
        )}
      </div>
    </div>
  );
};
