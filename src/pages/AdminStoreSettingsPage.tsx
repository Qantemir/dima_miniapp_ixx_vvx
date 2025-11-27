import { useEffect, useRef, useState } from 'react';
import { Moon } from '@/components/icons';
import { AdminPageLayout } from '@/components/AdminPageLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';
import { Seo } from '@/components/Seo';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAdminGuard } from '@/hooks/useAdminGuard';

export const AdminStoreSettingsPage = () => {
  const queryClient = useQueryClient();
  const isAuthorized = useAdminGuard('/');
  
  const {
    data: status,
    isLoading: loading,
  } = useQuery({
    queryKey: ['store-status'],
    queryFn: () => api.getStoreStatus(),
    staleTime: 10_000,
    gcTime: 5 * 60 * 1000,
    enabled: isAuthorized,
  });
  const [saving, setSaving] = useState(false);
  const [sleepEnabled, setSleepEnabled] = useState(false);
  const [message, setMessage] = useState('');

  const initializedRef = useRef(false);

  // Инициализируем только один раз при первой загрузке
  useEffect(() => {
    if (!status || initializedRef.current) {
      return;
    }
    initializedRef.current = true;
    setSleepEnabled(status.is_sleep_mode);
    setMessage(status.sleep_message || '');
  }, [status]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        sleep: sleepEnabled,
        message: message || undefined,
      };
      const updated = await api.setStoreSleepMode(payload);
      setSleepEnabled(updated.is_sleep_mode);
      setMessage(updated.sleep_message || '');
      queryClient.invalidateQueries({ queryKey: ['store-status'] });
      toast.success('Статус магазина обновлён');
    } catch (error) {
      toast.error('Не удалось обновить статус магазина');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Seo title="Админ: Режим сна" description="Управляйте статусом магазина и сообщением для клиентов." path="/admin/store" noIndex />
      {!isAuthorized ? null : (
      <AdminPageLayout
        title="Режим сна"
        description="Включайте и отключайте приём заказов"
        icon={Moon}
        contentClassName="space-y-4"
        contentLabel="Настройки режима сна"
      >
        {loading ? (
          <section aria-busy aria-label="Загрузка статуса магазина">
            <Skeleton className="h-48 w-full" />
          </section>
        ) : (
          <>
            <section aria-label="Управление режимом сна">
              <Card className="border border-border bg-card p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-semibold">Магазин в режиме сна</Label>
                    <p className="text-sm text-muted-foreground">
                      Клиенты увидят сообщение и не смогут оформить заказ
                    </p>
                  </div>
                  <Switch
                    checked={sleepEnabled}
                    onCheckedChange={setSleepEnabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sleep-message">Сообщение для клиентов</Label>
                  <Textarea
                    id="sleep-message"
                    rows={4}
                    value={message}
                    onChange={event => setMessage(event.target.value)}
                    onInput={event => setMessage((event.target as HTMLTextAreaElement).value)}
                    placeholder="Например: Мы временно не принимаем заказы. Вернёмся завтра!"
                    disabled={saving}
                    className="resize-none bg-background text-foreground placeholder:text-muted-foreground"
                    autoCapitalize="sentences"
                    autoCorrect="on"
                    spellCheck
                    inputMode="text"
                  />
                  <p className="text-xs text-muted-foreground">
                    Сообщение увидят клиенты на главной странице. Если оставить пустым — будет показан текст по умолчанию. Вы можете ввести сообщение заранее, перед включением режима сна.
                  </p>
                </div>

                <Button onClick={handleSave} disabled={saving}>
                  {saving ? 'Сохранение...' : sleepEnabled ? 'Сохранить изменения' : 'Сохранить настройки'}
                </Button>
              </Card>
            </section>

            {status && (
              <section aria-label="Текущий статус магазина">
                <Alert>
                  <AlertTitle>Текущий статус</AlertTitle>
                  <AlertDescription>
                    {status.is_sleep_mode
                      ? `Магазин закрыт. Сообщение: ${status.sleep_message || 'используется текст по умолчанию'}.`
                      : (
                      'Магазин принимает заказы.'
                    )}
                  </AlertDescription>
                </Alert>
              </section>
            )}
          </>
        )}
      </AdminPageLayout>
      )}
    </>
  );
};
