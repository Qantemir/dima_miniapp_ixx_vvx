import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Megaphone } from 'lucide-react';
import { AdminHeader } from '@/components/AdminHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import {
  hideBackButton,
  showAlert,
  showBackButton,
} from '@/lib/telegram';
import type { BroadcastRequest } from '@/types/api';

export const AdminBroadcastPage = () => {
  const navigate = useNavigate();
  const [sending, setSending] = useState(false);
  const [formData, setFormData] = useState<Pick<BroadcastRequest, 'title' | 'message'>>({
    title: '',
    message: '',
  });

  useEffect(() => {
    showBackButton(() => navigate('/'));
    return () => {
      hideBackButton();
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.title || !formData.message) {
      showAlert('Заполните заголовок и текст сообщения');
      return;
    }

    setSending(true);
    try {
      await api.sendBroadcast({
        title: formData.title,
        message: formData.message,
        segment: 'all',
      });
      showAlert('Рассылка отправлена');
      setFormData({
        title: '',
        message: '',
      });
    } catch (error) {
      showAlert('Не удалось отправить рассылку');
    } finally {
      setSending(false);
    }
  };

  return (
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
                placeholder="Расскажите клиентам о новостях и акциях"
              />
            </div>

            <Button type="submit" disabled={sending} className="w-full">
              {sending ? 'Отправка...' : 'Отправить рассылку'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

