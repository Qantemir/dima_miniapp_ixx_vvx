import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminPageLayout } from '@/components/AdminPageLayout';
import { Seo } from '@/components/Seo';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CreditCard, ExternalLink } from '@/components/icons';
import { useAdminGuard } from '@/hooks/useAdminGuard';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';

export const AdminPaymentPage = () => {
  const queryClient = useQueryClient();
  const isAuthorized = useAdminGuard('/');
  const [paymentLink, setPaymentLink] = useState('');
  const [saving, setSaving] = useState(false);

  const {
    data: status,
    isLoading,
  } = useQuery({
    queryKey: ['store-status'],
    queryFn: () => api.getStoreStatus(),
    staleTime: 10_000,
    gcTime: 5 * 60 * 1000,
    enabled: isAuthorized,
  });

  useEffect(() => {
    if (status?.payment_link !== undefined) {
      setPaymentLink(status.payment_link ?? '');
    }
  }, [status?.payment_link]);

  const normalizedLink = paymentLink.trim();

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await api.setPaymentLink({ url: normalizedLink ? normalizedLink : null });
      await queryClient.invalidateQueries({ queryKey: ['store-status'] });
      toast.success(normalizedLink ? 'Ссылка для оплаты сохранена' : 'Ссылка отключена');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось сохранить ссылку';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenLink = () => {
    if (!normalizedLink) return;
    window.open(normalizedLink, '_blank', 'noopener');
  };

  if (!isAuthorized) {
    return null;
  }

  return (
    <>
      <Seo title="Админ: Подключение оплаты" description="Добавьте ссылку на онлайн-оплату, чтобы показать кнопку клиентам." path="/admin/payments" noIndex />
      <AdminPageLayout
        title="Подключение оплаты"
        description="Настройте ссылку Kaspi Pay или другого эквайринга — мы покажем клиенту кнопку «Оплатить»."
        icon={CreditCard}
        contentClassName="space-y-4"
        contentLabel="Настройки онлайн-оплаты"
      >
        <Card className="border border-border bg-card p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="payment-link">Ссылка на оплату</Label>
            <Input
              id="payment-link"
              type="url"
              placeholder="https://pay.kaspi.kz/pay/..."
              value={paymentLink}
              onChange={event => setPaymentLink(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              disabled={saving || isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Поддерживаются HTTPS ссылки. Клиент откроет её из чекаута, оплатит и вернётся, чтобы прикрепить чек.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handleSave} disabled={saving || isLoading}>
              {saving ? 'Сохранение...' : 'Сохранить'}
            </Button>
            {normalizedLink && (
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={handleOpenLink}
              >
                <ExternalLink className="h-4 w-4" />
                Открыть ссылку
              </Button>
            )}
            {status?.payment_link && (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive"
                onClick={() => setPaymentLink('')}
                disabled={saving}
              >
                Очистить
              </Button>
            )}
          </div>
        </Card>

        <Alert>
          <AlertTitle>Как это работает</AlertTitle>
          <AlertDescription className="text-sm text-muted-foreground">
            1) Вставьте ссылку Kaspi Pay или другого провайдера. 2) Клиент нажмёт кнопку «Оплатить» в форме оформления заказа —
            ссылка откроется в новом окне Telegram. 3) После перевода он вернётся и прикрепит чек, как и раньше.
          </AlertDescription>
        </Alert>
      </AdminPageLayout>
    </>
  );
};

export default AdminPaymentPage;

