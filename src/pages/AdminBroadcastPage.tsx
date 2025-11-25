import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Megaphone } from '@/components/icons';
import { AdminHeader } from '@/components/AdminHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import {
  getUserId,
  isAdmin,
  hideBackButton,
  showBackButton,
} from '@/lib/telegram';
import { toast } from '@/lib/toast';
import { ADMIN_IDS } from '@/types/api';
import type { BroadcastRequest } from '@/types/api';
import { Seo } from '@/components/Seo';

export const AdminBroadcastPage = () => {
  const navigate = useNavigate();
  const [sending, setSending] = useState(false);
  const [formData, setFormData] = useState<Pick<BroadcastRequest, 'title' | 'message'>>({
    title: '',
    message: '',
  });

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
      toast.error('Не удалось отправить рассылку');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Seo title="Админ: Рассылка" description="Создавайте push-рассылки для клиентов." path="/admin/broadcast" noIndex />
      <div className="min-h-screen bg-background pb-6">
        <AdminHeader
          title="Рассылка"
          description="Отправляйте сообщения клиентам"
          icon={Megaphone}
        />

        <div className="p-4">
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
        </div>
      </div>
    </>
  );
};

