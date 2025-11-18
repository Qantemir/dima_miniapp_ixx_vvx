import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { api } from '@/lib/api';
import { showAlert, showBackButton, hideBackButton } from '@/lib/telegram';
import type { Order, OrderStatus } from '@/types/api';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminHeader } from '@/components/AdminHeader';
import { Seo } from '@/components/Seo';

const STATUS_FILTERS: Array<{ value: OrderStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Все' },
  { value: 'новый', label: 'Новые' },
  { value: 'в обработке', label: 'В работе' },
  { value: 'принят', label: 'Принятые' },
  { value: 'выехал', label: 'Выехали' },
  { value: 'завершён', label: 'Завершённые' },
  { value: 'отменён', label: 'Отменённые' },
];

export const AdminOrdersPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | 'all'>('all');

  useEffect(() => {
    loadOrders();
    showBackButton(() => navigate('/'));

    return () => {
      hideBackButton();
    };
  }, [selectedStatus]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const params = selectedStatus !== 'all' ? { status: selectedStatus } : undefined;
      const data = await api.getOrders(params);
      setOrders(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка загрузки заказов';
      console.error('Failed to load orders:', error);
      showAlert(`Ошибка загрузки заказов: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const seoProps = {
    title: "Админ: Заказы",
    description: "Управляйте заказами клиентов и обновляйте статусы.",
    path: "/admin/orders",
    noIndex: true,
  };

  if (loading) {
    return (
      <>
        <Seo {...seoProps} />
      <div className="min-h-screen bg-background p-4 space-y-4">
        <Skeleton className="h-12 w-full" />
        <div className="flex gap-2 overflow-x-auto">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-10 w-20 flex-shrink-0" />
          ))}
        </div>
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
      </>
    );
  }

  return (
    <>
      <Seo {...seoProps} />
    <div className="min-h-screen bg-background pb-6">
        <AdminHeader
          title="Заказы"
          description="Просматривайте заказы и обновляйте их статусы"
          icon={Package}
        />

      {/* Filters */}
      <div className="p-4 bg-card border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Статус:</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {STATUS_FILTERS.map(filter => (
            <Button
              key={filter.value}
              variant={selectedStatus === filter.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedStatus(filter.value)}
              className="flex-shrink-0"
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div className="p-4 space-y-3">
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Заказы не найдены</p>
          </div>
        ) : (
          orders.map(order => (
            <div
              key={order.id}
              onClick={() => navigate(`/admin/order/${order.id}`)}
              className="bg-card rounded-lg p-4 border border-border cursor-pointer hover:border-primary transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-foreground">
                    Заказ #{order.id.slice(-6)}
                  </h3>
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
                <OrderStatusBadge status={order.status} />
              </div>

              <div className="space-y-1 text-sm">
                <p className="text-muted-foreground">
                  Клиент: <span className="text-foreground">{order.customer_name}</span>
                </p>
                <p className="text-muted-foreground">
                  Телефон: <span className="text-foreground">{order.customer_phone}</span>
                </p>
                <p className="text-muted-foreground line-clamp-1">
                  Адрес: <span className="text-foreground">{order.delivery_address}</span>
                </p>
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                <span className="text-sm text-muted-foreground">
                  {order.items.length} товаров
                </span>
                <span className="font-bold text-foreground">
                  {order.total_amount} ₽
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
    </>
  );
};
