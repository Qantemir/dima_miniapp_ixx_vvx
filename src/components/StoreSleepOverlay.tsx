import { AlertTriangle } from '@/components/icons';
import { Card } from '@/components/ui/card';
import { useStoreStatus } from '@/contexts/StoreStatusContext';
import { useLocation } from 'react-router-dom';

export const StoreSleepOverlay = () => {
  const { status, loading } = useStoreStatus();
  const location = useLocation();

  // Support deployments under /app where pathname becomes /app/admin/...
  const path = location.pathname.toLowerCase().replace(/^\/app/, '');
  const isAdminRoute = /\/admin(\/|$)/.test(path);
  const isSleep = status?.is_sleep_mode;
  const wakeTime = status?.sleep_until ? new Date(status.sleep_until) : null;

  if (loading || !isSleep || isAdminRoute) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 px-4">
      <Card className="max-w-md w-full space-y-4 p-6 text-center shadow-2xl border-primary/30">
        <div className="flex justify-center">
          <AlertTriangle className="h-10 w-10 text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-foreground">Магазин временно закрыт</h2>
          <p className="text-sm text-muted-foreground">
            {status?.sleep_message || 'Мы временно не принимаем заказы. Возвращайтесь позже.'}
          </p>
          {wakeTime && (
            <p className="text-sm text-muted-foreground">
              Планируем возобновить работу{' '}
              {wakeTime.toLocaleString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
        </div>
      </Card>
    </div>
  );
};
