import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, Moon, X } from '@/components/icons';
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
  const [sleepDate, setSleepDate] = useState('');
  const [sleepTime, setSleepTime] = useState('');

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
      setSleepDate(date.toISOString().slice(0, 10));
      setSleepTime(date.toISOString().slice(11, 16));
    } else {
      setSleepDate('');
      setSleepTime('');
    }
  }, [status]);

  const handleSave = async () => {
    setSaving(true);
    try {
      let sleepUntilIso: string | null = null;
      if (sleepEnabled && sleepDate) {
        const combined = `${sleepDate}T${sleepTime || '00:00'}`;
        const parsed = new Date(combined);
        if (!Number.isNaN(parsed.getTime())) {
          sleepUntilIso = parsed.toISOString();
        }
      }

      const payload = {
        sleep: sleepEnabled,
        message: message || undefined,
        sleep_until: sleepUntilIso,
      };
      const updated = await api.setStoreSleepMode(payload);
      setSleepEnabled(updated.is_sleep_mode);
      setMessage(updated.sleep_message || '');
      if (updated.sleep_until) {
        const date = new Date(updated.sleep_until);
        setSleepDate(date.toISOString().slice(0, 10));
        setSleepTime(date.toISOString().slice(11, 16));
      } else {
        setSleepDate('');
        setSleepTime('');
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
                  onChange={event => setMessage(event.target.value)}
                  placeholder="Например: Мы временно не принимаем заказы. Вернёмся завтра!"
                  disabled={saving}
                  className="resize-none bg-background text-foreground placeholder:text-muted-foreground"
                  autoCapitalize="sentences"
                  autoCorrect="on"
                  spellCheck
                />
                <p className="text-xs text-muted-foreground">
                  Сообщение увидят клиенты на главной странице. Если оставить пустым — будет показан текст по умолчанию. Вы можете ввести сообщение заранее, перед включением режима сна.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sleep-date" className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-primary" />
                  Автоматический выход из режима сна
                </Label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    id="sleep-date"
                    type="date"
                    value={sleepDate}
                    onChange={event => setSleepDate(event.target.value)}
                    disabled={saving}
                    className="bg-background text-foreground placeholder:text-muted-foreground"
                    min={new Date().toISOString().slice(0, 10)}
                  />
                  <Input
                    id="sleep-time"
                    type="time"
                    value={sleepTime}
                    onChange={event => setSleepTime(event.target.value)}
                    disabled={saving}
                    className="bg-background text-foreground placeholder:text-muted-foreground"
                  />
                  {(sleepDate || sleepTime) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="self-start"
                      onClick={() => {
                        setSleepDate('');
                        setSleepTime('');
                      }}
                      disabled={saving}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Укажите дату и время, когда магазин снова станет доступен автоматически. Достаточно указать только дату — время по умолчанию будет 00:00.
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

