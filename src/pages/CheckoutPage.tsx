import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
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
import { showBackButton, hideBackButton, hideMainButton } from '@/lib/telegram';
import { toast } from '@/lib/toast';
import { useStoreStatus } from '@/contexts/StoreStatusContext';
import { useCart } from '@/hooks/useCart';
import { PageTransition } from '@/components/animations';

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

  const handleSubmit = useCallback(async () => {
    if (!formData.name || !formData.phone || !formData.address) {
      toast.warning('Пожалуйста, заполните все обязательные поля');
      return;
    }

    if (!paymentReceipt) {
      toast.warning('Пожалуйста, прикрепите чек об оплате');
      return;
    }

    if (storeStatus?.is_sleep_mode) {
      toast.warning(storeStatus.sleep_message || 'Магазин временно не принимает заказы');
      return;
    }

    if (!cartSummary || cartSummary.items.length === 0) {
      toast.warning('В корзине нет товаров');
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

      toast.success('Заказ оформлен');
      navigate('/');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка при оформлении заказа';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }, [formData, paymentReceipt, storeStatus, cartSummary, navigate]);

  useEffect(() => {
    hideMainButton();
    showBackButton(() => navigate('/cart'));

    return () => {
      hideBackButton();
      hideMainButton();
    };
  }, [navigate]);

  const isSubmitDisabled = useMemo(
    () =>
      submitting ||
      cartLoading ||
      !cartSummary ||
      cartSummary.items.length === 0 ||
      storeStatus?.is_sleep_mode ||
      !paymentReceipt ||
      !!receiptError,
    [
      submitting,
      cartLoading,
      cartSummary,
      storeStatus?.is_sleep_mode,
      paymentReceipt,
      receiptError,
    ],
  );

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
      <PageTransition>
      <div className="min-h-screen bg-background pb-32 sm:pb-24">
      {/* Header */}
      <div className="sticky z-10 bg-card/95 backdrop-blur-sm border-b border-border px-4 py-3 sm:px-6 sm:py-4 shadow-sm" style={{ top: 'calc(env(safe-area-inset-top, 0px) + var(--tg-header-height, 0px))' }}>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/cart')}
            className="h-10 w-10 sm:h-11 sm:w-11 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">Оформление заказа</h1>
        </div>
      </div>

      {/* Form */}
      <div className="px-4 py-5 sm:px-6 sm:py-6 space-y-6">
        <div className="space-y-5">
          <div className="space-y-2.5">
            <Label htmlFor="name" className="text-sm font-medium">Имя *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Как к вам обращаться?"
              disabled={submitting}
              className="h-11 text-base"
            />
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="phone" className="text-sm font-medium">Телефон *</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="+7 (900) 123-45-67"
              disabled={submitting}
              className="h-11 text-base"
            />
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="address" className="text-sm font-medium">Адрес доставки *</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
              onInput={e => setFormData(prev => ({ ...prev, address: (e.target as HTMLTextAreaElement).value }))}
              placeholder="Укажите полный адрес доставки"
              rows={3}
              disabled={submitting}
              className="text-base resize-none"
              inputMode="text"
            />
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="comment" className="text-sm font-medium">Комментарий</Label>
            <Textarea
              id="comment"
              value={formData.comment}
              onChange={e => setFormData(prev => ({ ...prev, comment: e.target.value }))}
              onInput={e => setFormData(prev => ({ ...prev, comment: (e.target as HTMLTextAreaElement).value }))}
              placeholder="Дополнительная информация о заказе"
              rows={2}
              disabled={submitting}
              inputMode="text"
              className="text-base resize-none"
            />
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="receipt" className="text-sm font-medium">Чек об оплате *</Label>
            <Input
              id="receipt"
              type="file"
              accept="image/*,.pdf"
              onChange={handleReceiptChange}
              disabled={submitting}
              className="h-11 text-base file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
            <p className="text-xs sm:text-sm text-muted-foreground">
              Прикрепите скриншот или PDF до {(RECEIPT_MAX_SIZE / (1024 * 1024)).toFixed(0)} МБ
            </p>
            {receiptError && (
              <p className="text-sm text-destructive mt-1">
                {receiptError}
              </p>
            )}
            {paymentReceipt && !receiptError && (
              <div className="flex items-center justify-between rounded-lg border border-dashed border-muted bg-muted/30 p-3 sm:p-4">
                <div className="min-w-0 flex-1 pr-3">
                  <p className="font-medium text-foreground truncate text-sm sm:text-base">{paymentReceipt.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatFileSize(paymentReceipt.size)}</p>
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
                  className="flex-shrink-0 h-9 px-3"
                >
                  Удалить
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="text-xs sm:text-sm text-muted-foreground">
          * Обязательные поля
        </div>

        <Card className="p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-base sm:text-lg">Состав заказа</p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Проверьте товары перед оплатой</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => refetchCart()} disabled={cartLoading} className="flex-shrink-0 h-9 px-3 text-sm">
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
            <p className="text-xs sm:text-sm text-muted-foreground">
              Корзина пуста. Вернитесь в каталог и добавьте товары.
            </p>
          ) : (
            <>
              <div className="space-y-3">
                {cartSummary.items.map(item => (
                  <div key={item.id} className="flex justify-between items-start gap-3 py-2 border-b border-border/50 last:border-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm sm:text-base text-foreground font-medium truncate">
                        {item.product_name}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                        {item.variant_name && `${item.variant_name} × `}{item.quantity}
                      </p>
                    </div>
                    <p className="font-semibold text-foreground flex-shrink-0 text-sm sm:text-base whitespace-nowrap">
                      {item.quantity * item.price} ₸
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center border-t border-border pt-4 mt-2">
                <span className="font-semibold text-base sm:text-lg text-foreground">Итого</span>
                <span className="font-bold text-lg sm:text-xl text-foreground">{cartSummary.total_amount} ₸</span>
              </div>
            </>
          )}
        </Card>

        <Button
          className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold shadow-lg"
          disabled={isSubmitDisabled}
          onClick={handleSubmit}
        >
          {submitting ? 'Отправка...' : 'Подтвердить заказ'}
        </Button>
        </div>
      </div>
      </PageTransition>
    </>
  );
};
