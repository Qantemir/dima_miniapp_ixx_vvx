import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Filter } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { api } from '@/lib/api';
import { getUserId, isAdmin, showBackButton, hideBackButton } from '@/lib/telegram';
import { toast } from '@/lib/toast';
import type { OrderStatus } from '@/types/api';
import { ADMIN_IDS } from '@/types/api';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminHeader } from '@/components/AdminHeader';
import { Seo } from '@/components/Seo';
import { useQuery } from '@tanstack/react-query';

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
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | 'all'>('all');
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const userId = getUserId();
    const isUserAdmin = userId ? isAdmin(userId, ADMIN_IDS) : false;
    
    if (!isUserAdmin) {
      toast.error('Доступ запрещён. Требуются права администратора.');
      navigate('/');
      return;
    }

    setIsAuthorized(true);
    showBackButton(() => navigate('/'));

    return () => {
      hideBackButton();
    };
  }, [navigate]);

  const {
    data: orders = [],
    isLoading: ordersLoading,
    isFetching,
    error: ordersError,
  } = useQuery({
    queryKey: ['admin-orders', selectedStatus],
    queryFn: () => {
      const params = selectedStatus !== 'all' ? { status: selectedStatus } : undefined;
      return api.getOrders(params);
    },
    enabled: isAuthorized,
    staleTime: 60_000,
    gcTime: 5 * 60 * 1000,
    keepPreviousData: true,
  });

  useEffect(() => {
    if (ordersError) {
      const message = ordersError instanceof Error ? ordersError.message : 'Ошибка загрузки заказов';
      toast.error(`Ошибка загрузки заказов: ${message}`);
    }
  }, [ordersError]);

  const seoProps = {
    title: "Админ: Заказы",
    description: "Управляйте заказами клиентов и обновляйте статусы.",
    path: "/admin/orders",
    noIndex: true,
  };

  if (!isAuthorized || ordersLoading) {
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
        {orders.length === 0 && !isFetching ? (
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
                  {order.total_amount} ₸
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
