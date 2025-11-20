import { useEffect, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { Seo } from '@/components/Seo';
import { buildCanonicalUrl } from '@/lib/seo';
import { getUser, showAlert, showMainButton, hideMainButton, showBackButton, hideBackButton } from '@/lib/telegram';
import { useStoreStatus } from '@/contexts/StoreStatusContext';
import { useCart } from '@/hooks/useCart';

const RECEIPT_MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const RECEIPT_ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];

const formatFileSize = (size: number) => {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(2)} МБ`;
  }
  if (size >= 1024) {
    return `${(size / 1024).toFixed(0)} КБ`;
  }
  return `${size} Б`;
};

export const CheckoutPage = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    comment: '',
  });
  const { data: cartSummary, isFetching: cartLoading, refetch: refetchCart } = useCart(true);
  const { status: storeStatus } = useStoreStatus();
  const [paymentReceipt, setPaymentReceipt] = useState<File | null>(null);
  const [receiptError, setReceiptError] = useState<string | null>(null);

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

  const handleReceiptChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setPaymentReceipt(null);
      setReceiptError('Пожалуйста, прикрепите чек об оплате');
      return;
    }

    if (!RECEIPT_ALLOWED_TYPES.includes(file.type)) {
      event.target.value = '';
      setPaymentReceipt(null);
      setReceiptError('Допустимы только изображения (JPG, PNG, WEBP, HEIC) или PDF');
      return;
    }

    if (file.size > RECEIPT_MAX_SIZE) {
      event.target.value = '';
      setPaymentReceipt(null);
      setReceiptError(`Файл слишком большой. Максимум ${(RECEIPT_MAX_SIZE / (1024 * 1024)).toFixed(0)} МБ`);
      return;
    }

    setReceiptError(null);
    setPaymentReceipt(file);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.phone || !formData.address) {
      showAlert('Пожалуйста, заполните все обязательные поля');
      return;
    }

    if (!paymentReceipt) {
      showAlert('Пожалуйста, прикрепите чек об оплате');
      return;
    }

    if (storeStatus?.is_sleep_mode) {
      showAlert(storeStatus.sleep_message || 'Магазин временно не принимает заказы');
      return;
    }

    if (!cartSummary || cartSummary.items.length === 0) {
      showAlert('В корзине нет товаров');
      return;
    }

    setSubmitting(true);

    try {
      const order = await api.createOrder({
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        comment: formData.comment,
        payment_receipt: paymentReceipt,
      });

      showAlert('Заказ успешно оформлен!');
      navigate(`/order/${order.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка при оформлении заказа';
      showAlert(message);
    } finally {
      setSubmitting(false);
    }
  };

  const checkoutJsonLd = {
    "@context": "https://schema.org",
    "@type": "CheckoutPage",
    name: "Оформление заказа",
    description: "Введите контактные данные для подтверждения заказа в Mini Shop.",
    url: buildCanonicalUrl("/checkout"),
  };

  return (
    <>
      <Seo title="Оформление заказа" description="Введите контактные данные для подтверждения заказа." path="/checkout" jsonLd={checkoutJsonLd} />
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

          <div className="space-y-2">
            <Label htmlFor="receipt">Чек об оплате *</Label>
            <Input
              id="receipt"
              type="file"
              accept="image/*,.pdf"
              onChange={handleReceiptChange}
              disabled={submitting}
            />
            <p className="text-xs text-muted-foreground">
              Прикрепите скриншот или PDF до {(RECEIPT_MAX_SIZE / (1024 * 1024)).toFixed(0)} МБ
            </p>
            {receiptError && (
              <p className="text-sm text-destructive">
                {receiptError}
              </p>
            )}
            {paymentReceipt && !receiptError && (
              <div className="flex items-center justify-between rounded-md border border-dashed border-muted p-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{paymentReceipt.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(paymentReceipt.size)}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPaymentReceipt(null);
                    setReceiptError('Пожалуйста, прикрепите чек об оплате');
                    const input = document.getElementById('receipt') as HTMLInputElement | null;
                    if (input) input.value = '';
                  }}
                >
                  Удалить
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          * Обязательные поля
        </div>

        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">Состав заказа</p>
              <p className="text-sm text-muted-foreground">Проверьте товары перед оплатой</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => refetchCart()} disabled={cartLoading}>
              Обновить
            </Button>
          </div>

          {cartLoading ? (
            <div className="space-y-2">
              {[1, 2].map(item => (
                <Skeleton key={item} className="h-16 w-full" />
              ))}
            </div>
          ) : !cartSummary || cartSummary.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Корзина пуста. Вернитесь в каталог и добавьте товары.
            </p>
          ) : (
            <>
              <div className="space-y-3">
                {cartSummary.items.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <p className="text-foreground">
                      {item.product_name}
                      <span className="text-muted-foreground"> × {item.quantity}</span>
                    </p>
                    <p className="font-semibold text-foreground">{item.quantity * item.price} ₸</p>
                  </div>
                ))}
              </div>
              <div className="flex justify-between border-t pt-3 font-semibold text-lg">
                <span>Итого</span>
                <span>{cartSummary.total_amount} ₸</span>
              </div>
            </>
          )}
        </Card>

        <Button
          className="w-full h-12 text-base"
          disabled={
            submitting ||
            cartLoading ||
            !cartSummary ||
            cartSummary.items.length === 0 ||
            storeStatus?.is_sleep_mode ||
            !paymentReceipt ||
            !!receiptError
          }
          onClick={handleSubmit}
        >
          {submitting ? 'Отправка...' : 'Подтвердить заказ'}
        </Button>
      </div>
      </div>
    </>
  );
};
