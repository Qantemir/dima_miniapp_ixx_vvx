import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package } from '@/components/icons';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';
import type { OrderStatus } from '@/types/api';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminPageLayout } from '@/components/AdminPageLayout';
import { Seo } from '@/components/Seo';
import { useInfiniteQuery } from '@tanstack/react-query';
import { AdminOrderFilterBar } from '@/components/admin/orders/AdminOrderFilterBar';
import { AdminOrderList } from '@/components/admin/orders/AdminOrderList';
import { useAdminGuard } from '@/hooks/useAdminGuard';

const STATUS_FILTERS: Array<{ value: OrderStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Все' },
  { value: 'в обработке', label: 'В работе' },
  { value: 'принят', label: 'Принятые' },
  { value: 'выехал', label: 'Выехали' },
  { value: 'завершён', label: 'Завершённые' },
  { value: 'отменён', label: 'Отменённые' },
];

export const AdminOrdersPage = () => {
  const navigate = useNavigate();
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | 'all'>('all');
  const isAuthorized = useAdminGuard('/');

  const {
    data,
    isLoading: ordersLoading,
    isFetching,
    error: ordersError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['admin-orders', selectedStatus],
    queryFn: ({ pageParam }) => {
      const params: { status?: string; cursor?: string; includeDeleted?: boolean } = {};
      if (selectedStatus !== 'all') params.status = selectedStatus;
      if (pageParam) params.cursor = pageParam as string;
      if (selectedStatus === 'завершён') {
        params.includeDeleted = true;
      }
      return api.getOrders(params);
    },
    getNextPageParam: lastPage => lastPage.next_cursor ?? undefined,
    enabled: isAuthorized,
    staleTime: 15_000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 15_000,
    refetchIntervalInBackground: true,
    initialPageParam: undefined,
  });

  const orders = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap(page => page.orders);
  }, [data]);

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
        <AdminPageLayout
          title="Заказы"
          description="Просматривайте заказы и обновляйте их статусы"
          icon={Package}
          contentClassName="space-y-4"
          contentLabel="Загрузка заказов"
        >
          <section className="bg-card border border-border rounded-lg p-4 space-y-3" aria-busy>
            <Skeleton className="h-12 w-full" />
            <div className="flex gap-2 overflow-x-auto">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-10 w-20 flex-shrink-0" />
              ))}
            </div>
          </section>
          <section className="space-y-3" aria-busy aria-label="Список заказов">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </section>
        </AdminPageLayout>
      </>
    );
  }

  return (
    <>
      <Seo {...seoProps} />
      <AdminPageLayout
        title="Заказы"
        description="Просматривайте заказы и обновляйте их статусы"
        icon={Package}
        contentClassName="space-y-4"
        contentLabel="Список заказов"
      >
        <AdminOrderFilterBar
          options={STATUS_FILTERS}
          selected={selectedStatus}
          onSelect={setSelectedStatus}
        />

        <AdminOrderList
          orders={orders}
          isFetching={isFetching}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={() => fetchNextPage()}
          onSelect={orderId => navigate(`/admin/order/${orderId}`)}
        />
      </AdminPageLayout>
    </>
  );
};
