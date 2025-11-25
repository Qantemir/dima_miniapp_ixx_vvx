import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Moon } from '@/components/icons';
import { AdminHeader } from '@/components/AdminHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import {
  getUserId,
  isAdmin,
  hideBackButton,
  showBackButton,
} from '@/lib/telegram';
import { toast } from '@/lib/toast';
import { ADMIN_IDS } from '@/types/api';
import { Seo } from '@/components/Seo';
import { useStoreStatus } from '@/contexts/StoreStatusContext';

export const AdminStoreSettingsPage = () => {
  const navigate = useNavigate();
  const { status, loading, refresh } = useStoreStatus();
  const [saving, setSaving] = useState(false);
  const [sleepEnabled, setSleepEnabled] = useState(false);
  const [message, setMessage] = useState('');
  const [sleepUntil, setSleepUntil] = useState('');

  useEffect(() => {
    const userId = getUserId();
    const isUserAdmin = userId ? isAdmin(userId, ADMIN_IDS) : false;
    
    if (!isUserAdmin) {
      toast.error('Доступ запрещён. Требуются права администратора.');
      navigate('/');
      return;
    }

    showBackButton(() => navigate('/'));
    return () => {
      hideBackButton();
    };
  }, [navigate]);

  const initializedRef = useRef(false);

  // Инициализируем только один раз при первой загрузке
  useEffect(() => {
    if (!status || initializedRef.current) {
      return;
    }
    initializedRef.current = true;
    setSleepEnabled(status.is_sleep_mode);
    setMessage(status.sleep_message || '');
    if (status.sleep_until) {
      const date = new Date(status.sleep_until);
      setSleepUntil(date.toISOString().slice(0, 16));
    } else {
      setSleepUntil('');
    }
  }, [status]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        sleep: sleepEnabled,
        message: message || undefined,
        sleep_until: sleepEnabled && sleepUntil ? new Date(sleepUntil).toISOString() : null,
      };
      const updated = await api.setStoreSleepMode(payload);
      setSleepEnabled(updated.is_sleep_mode);
      setMessage(updated.sleep_message || '');
      if (updated.sleep_until) {
        const date = new Date(updated.sleep_until);
        setSleepUntil(date.toISOString().slice(0, 16));
      } else {
        setSleepUntil('');
      }
      await refresh();
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
      <div className="min-h-screen bg-background pb-6">
        <AdminHeader
          title="Режим сна"
          description="Включайте и отключайте приём заказов"
          icon={Moon}
        />

        <div className="p-4 space-y-4">
        {loading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <>
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
                  onChange={event => {
                    setMessage(event.target.value);
                  }}
                  onInput={event => {
                    setMessage((event.target as HTMLTextAreaElement).value);
                  }}
                  placeholder="Например: Мы временно не принимаем заказы. Вернёмся завтра!"
                  disabled={saving}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Сообщение увидят клиенты на главной странице. Если оставить пустым — будет показан текст по умолчанию. Вы можете ввести сообщение заранее, перед включением режима сна.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sleep-until">Автоматический выход из режима сна</Label>
                <Input
                  id="sleep-until"
                  type="datetime-local"
                  value={sleepUntil}
                  onChange={event => {
                    setSleepUntil(event.target.value);
                  }}
                  onInput={event => {
                    setSleepUntil((event.target as HTMLInputElement).value);
                  }}
                  disabled={saving}
                  min={new Date().toISOString().slice(0, 16)}
                />
                <p className="text-xs text-muted-foreground">
                  Укажите дату и время, когда магазин снова станет доступен автоматически. Если оставить пустым — режим сна нужно выключить вручную.
                </p>
              </div>

              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Сохранение...' : sleepEnabled ? 'Сохранить изменения' : 'Сохранить настройки'}
              </Button>
            </Card>

            {status && (
              <Alert>
                <AlertTitle>Текущий статус</AlertTitle>
                <AlertDescription>
                  {status.is_sleep_mode ? (
                    <>
                      Магазин закрыт. Сообщение: {status.sleep_message || 'используется текст по умолчанию'}.
                      {status.sleep_until && (
                        <>
                          {' '}Автоматическое открытие: {new Date(status.sleep_until).toLocaleString('ru-RU', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </>
                      )}
                    </>
                  ) : (
                    'Магазин принимает заказы.'
                  )}
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
        </div>
      </div>
    </>
  );
};

