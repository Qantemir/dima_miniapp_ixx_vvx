import { useState } from 'react';
import { Megaphone } from '@/components/icons';
import { AdminPageLayout } from '@/components/AdminPageLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';
import type { BroadcastRequest } from '@/types/api';
import { Seo } from '@/components/Seo';
import { useAdminGuard } from '@/hooks/useAdminGuard';

export const AdminBroadcastPage = () => {
  const isAuthorized = useAdminGuard('/');
  const [sending, setSending] = useState(false);
  const [formData, setFormData] = useState<Pick<BroadcastRequest, 'title' | 'message'>>({
    title: '',
    message: '',
  });

  if (!isAuthorized) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.title || !formData.message) {
      toast.warning('Заполните заголовок и текст сообщения');
      return;
    }

    setSending(true);
    try {
      const result = await api.sendBroadcast({
        title: formData.title,
        message: formData.message,
        segment: 'all',
      });
      
      // Формируем детальное сообщение о результатах рассылки
      let message = `✅ Рассылка завершена!\n\n`;
      message += `📊 Всего клиентов: ${result.total_count}\n`;
      message += `✅ Доставлено: ${result.sent_count}\n`;
      if (result.failed_count > 0) {
        message += `❌ Ошибок: ${result.failed_count} (недоступные клиенты удалены из базы)`;
      }
      
      toast.success(message);
      setFormData({
        title: '',
        message: '',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось отправить рассылку';
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Seo title="Админ: Рассылка" description="Создавайте push-рассылки для клиентов." path="/admin/broadcast" noIndex />
      <AdminPageLayout
        title="Рассылка"
        description="Отправляйте сообщения клиентам"
        icon={Megaphone}
        contentClassName="space-y-4"
        contentLabel="Рассылка клиентам"
      >
        <section aria-label="Форма рассылки">
          <Card className="border border-border bg-card p-4">
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label>Заголовок</Label>
                <Input
                  value={formData.title}
                  onChange={event =>
                    setFormData(prev => ({ ...prev, title: event.target.value }))
                  }
                  placeholder="Например, Черная пятница"
                />
              </div>

              <div className="space-y-2">
                <Label>Сообщение</Label>
                <Textarea
                  rows={5}
                  value={formData.message}
                  onChange={event =>
                    setFormData(prev => ({
                      ...prev,
                      message: event.target.value,
                    }))
                  }
                  onInput={event =>
                    setFormData(prev => ({
                      ...prev,
                      message: (event.target as HTMLTextAreaElement).value,
                    }))
                  }
                  placeholder="Расскажите клиентам о новостях и акциях"
                  inputMode="text"
                />
              </div>

              <Button type="submit" disabled={sending} className="w-full">
                {sending ? 'Отправка...' : 'Отправить рассылку'}
              </Button>
            </form>
          </Card>
        </section>
      </AdminPageLayout>
    </>
  );
};
