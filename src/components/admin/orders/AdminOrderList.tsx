import { Button } from '@/components/ui/button';
import { Package } from '@/components/icons';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import type { Order } from '@/types/api';

interface AdminOrderListProps {
  orders: Order[];
  isFetching: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
  onSelect: (orderId: string) => void;
}

export const AdminOrderList = ({
  orders,
  isFetching,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  onSelect,
}: AdminOrderListProps) => (
  <section className="space-y-3" aria-label="Список заказов">
    {orders.length === 0 && !isFetching ? (
      <div className="text-center py-12">
        <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" aria-hidden />
        <p className="text-muted-foreground">Заказы не найдены</p>
      </div>
    ) : (
      orders.map(order => (
        <article
          key={order.id}
          onClick={() => onSelect(order.id)}
          className="bg-card rounded-lg p-4 border border-border cursor-pointer hover:border-primary transition-colors"
          aria-label={`Заказ ${order.id.slice(-6)}`}
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-semibold text-foreground">Заказ #{order.id.slice(-6)}</h3>
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
              {(order.items || []).length} товаров
            </span>
            <span className="font-bold text-foreground">{order.total_amount} ₸</span>
          </div>
        </article>
      ))
    )}

    {hasNextPage && (
      <div className="pt-3">
        <Button
          variant="outline"
          onClick={onLoadMore}
          disabled={isFetchingNextPage}
          className="w-full"
        >
          {isFetchingNextPage ? 'Загрузка...' : 'Загрузить ещё'}
        </Button>
      </div>
    )}
  </section>
);

