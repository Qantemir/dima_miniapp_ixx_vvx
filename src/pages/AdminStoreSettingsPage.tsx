import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Moon } from 'lucide-react';
import { AdminHeader } from '@/components/AdminHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import {
  hideBackButton,
  showAlert,
  showBackButton,
} from '@/lib/telegram';
import type { StoreStatus } from '@/types/api';
import { Seo } from '@/components/Seo';

export const AdminStoreSettingsPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<StoreStatus | null>(null);
  const [sleepEnabled, setSleepEnabled] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadStatus();
    showBackButton(() => navigate('/'));
    return () => {
      hideBackButton();
    };
  }, []);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const data = await api.getStoreStatus();
      setStatus(data);
      setSleepEnabled(data.is_sleep_mode);
      setMessage(data.sleep_message || '');
    } catch (error) {
      showAlert('Не удалось загрузить статус магазина');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await api.setStoreSleepMode({
        sleep: sleepEnabled,
        message: message || undefined,
      });
      setStatus(updated);
      showAlert('Статус магазина обновлён');
    } catch (error) {
      showAlert('Не удалось обновить статус магазина');
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
                <Label>Сообщение для клиентов</Label>
                <Textarea
                  rows={4}
                  value={message}
                  onChange={event => setMessage(event.target.value)}
                  placeholder="Например: Мы временно не принимаем заказы. Вернёмся завтра!"
                />
                <p className="text-xs text-muted-foreground">
                  Сообщение увидят клиенты на главной странице. Если оставить пустым — будет показан текст по умолчанию. Вы можете ввести сообщение заранее, перед включением режима сна.
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
                  {status.is_sleep_mode
                    ? `Магазин закрыт. Сообщение: ${status.sleep_message || 'используется текст по умолчанию'}.`
                    : 'Магазин принимает заказы.'}
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

