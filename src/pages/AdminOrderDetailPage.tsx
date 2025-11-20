import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, User, Phone } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { api } from '@/lib/api';
import { buildApiAssetUrl } from '@/lib/utils';
import { getUserId, isAdmin, showAlert, showBackButton, hideBackButton } from '@/lib/telegram';
import type { Order, OrderStatus } from '@/types/api';
import { ADMIN_IDS } from '@/types/api';
import { Skeleton } from '@/components/ui/skeleton';
import { Seo } from '@/components/Seo';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

const AVAILABLE_STATUSES: OrderStatus[] = [
  'новый',
  'в обработке',
  'принят',
  'выехал',
  'завершён',
  'отменён',
];

const STATUS_LABELS: Record<OrderStatus, string> = {
  'новый': 'Новый',
  'в обработке': 'В обработке',
  'принят': 'Принят',
  'выехал': 'Выехал',
  'завершён': 'Завершён',
  'отменён': 'Отменён',
};

export const AdminOrderDetailPage = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [updating, setUpdating] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<OrderStatus | ''>('');
  const [pendingStatus, setPendingStatus] = useState<OrderStatus | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);

  useEffect(() => {
    const userId = getUserId();
    const isUserAdmin = userId ? isAdmin(userId, ADMIN_IDS) : false;
    
    if (!isUserAdmin) {
      showAlert('Доступ запрещён. Требуются права администратора.');
      navigate('/');
      return;
    }

    if (orderId) {
      loadOrder();
    }

    showBackButton(() => navigate('/admin'));

    return () => {
      hideBackButton();
    };
  }, [orderId, navigate]);

  const loadOrder = async () => {
    if (!orderId) return;

    try {
      const data = await api.getAdminOrder(orderId);
      setOrder(data);
      setCurrentStatus(data.status);
    } catch (error) {
      showAlert('Ошибка загрузки заказа');
      navigate('/admin');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusSelect = (newStatus: OrderStatus) => {
    if (!order || newStatus === order.status) {
      return;
    }
    setPendingStatus(newStatus);
    setStatusDialogOpen(true);
  };

  const confirmStatusChange = async () => {
    if (!order || !pendingStatus) {
      return;
    }
    setUpdating(true);
    try {
      const updatedOrder = await api.updateOrderStatus(order.id, {
        status: pendingStatus,
      });
      setOrder(updatedOrder);
      setCurrentStatus(updatedOrder.status);
      showAlert('Статус заказа обновлён');
    } catch (error) {
      showAlert('Ошибка при обновлении статуса');
    } finally {
      setUpdating(false);
      setPendingStatus(null);
      setStatusDialogOpen(false);
    }
  };

  const handleStatusDialogChange = (open: boolean) => {
    setStatusDialogOpen(open);
    if (!open && !updating) {
      setPendingStatus(null);
    }
  };

  const seoPath = orderId ? `/admin/order/${orderId}` : '/admin/order';
  const seoTitle = order ? `Админ: Заказ ${order.id.slice(-6)}` : "Админ: Заказ";

  if (loading) {
    return (
      <>
        <Seo title={seoTitle} description="Просматривайте информацию о заказе." path={seoPath} noIndex />
        <div className="min-h-screen bg-background p-4 space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </>
    );
  }

  if (!order) {
    return (
      <>
        <Seo title="Админ: Заказ" description="Заказ не найден." path={seoPath} noIndex />
        <div className="min-h-screen bg-background p-4 space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </>
    );
  }

  const receiptUrl = order.payment_receipt_url ? buildApiAssetUrl(order.payment_receipt_url) : null;

  return (
    <>
      <Seo title={seoTitle} description="Изменяйте статус и просматривайте детали заказа." path={seoPath} noIndex />
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
          <Select
            value={currentStatus || order.status}
            onValueChange={value => handleStatusSelect(value as OrderStatus)}
            disabled={updating}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Выберите статус" />
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_STATUSES.map(status => (
                <SelectItem key={status} value={status}>
                  {STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                    {item.quantity} × {item.price} ₸
                  </p>
                </div>
                <span className="font-semibold text-foreground">
                  {item.quantity * item.price} ₸
                </span>
              </div>
            ))}
          </div>
          <div className="pt-3 border-t border-border flex justify-between items-center">
            <span className="text-lg font-semibold text-foreground">Итого:</span>
            <span className="text-2xl font-bold text-foreground">
              {order.total_amount} ₸
            </span>
          </div>
        </div>

        {receiptUrl && (
          <div className="bg-card rounded-lg p-4 border border-border space-y-2">
            <h3 className="font-semibold text-foreground">Чек об оплате</h3>
            <p className="text-sm text-muted-foreground">
              {order.payment_receipt_filename || 'Файл чека'} приложен к заказу
            </p>
            <a
              href={receiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
            >
              Открыть чек
            </a>
          </div>
        )}

        {/* Comment */}
        {order.comment && (
          <div className="bg-card rounded-lg p-4 border border-border space-y-2">
            <h3 className="font-semibold text-foreground">Комментарий</h3>
            <p className="text-foreground">{order.comment}</p>
          </div>
        )}
      </div>
      </div>

      <AlertDialog open={statusDialogOpen} onOpenChange={handleStatusDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Изменить статус заказа?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingStatus
                ? `Установить статус "${STATUS_LABELS[pendingStatus]}"?`
                : 'Выберите статус, чтобы изменить его.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updating}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              disabled={!pendingStatus || updating}
              onClick={(event) => {
                event.preventDefault();
                void confirmStatusChange();
              }}
            >
              Изменить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
