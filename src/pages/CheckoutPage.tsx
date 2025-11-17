import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { getUser, showAlert, showMainButton, hideMainButton, showBackButton, hideBackButton } from '@/lib/telegram';

export const CheckoutPage = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    comment: '',
  });

  useEffect(() => {
    const user = getUser();
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`,
      }));
    }

    showBackButton(() => navigate('/cart'));
    showMainButton('Подтвердить заказ', handleSubmit);

    return () => {
      hideMainButton();
      hideBackButton();
    };
  }, []);

  const handleSubmit = async () => {
    if (!formData.name || !formData.phone || !formData.address) {
      showAlert('Пожалуйста, заполните все обязательные поля');
      return;
    }

    const user = getUser();
    if (!user) {
      showAlert('Ошибка: не удалось определить пользователя');
      return;
    }

    setSubmitting(true);

    try {
      const order = await api.createOrder({
        user_id: user.id,
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        comment: formData.comment,
      });

      showAlert('Заказ успешно оформлен!');
      navigate(`/order/${order.id}`);
    } catch (error) {
      showAlert('Ошибка при оформлении заказа');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border p-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/cart')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Оформление заказа</h1>
        </div>
      </div>

      {/* Form */}
      <div className="p-4 space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Имя *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Как к вам обращаться?"
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Телефон *</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="+7 (900) 123-45-67"
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Адрес доставки *</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
              placeholder="Укажите полный адрес доставки"
              rows={3}
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Комментарий</Label>
            <Textarea
              id="comment"
              value={formData.comment}
              onChange={e => setFormData(prev => ({ ...prev, comment: e.target.value }))}
              placeholder="Дополнительная информация о заказе"
              rows={2}
              disabled={submitting}
            />
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          * Обязательные поля
        </div>
      </div>
    </div>
  );
};
