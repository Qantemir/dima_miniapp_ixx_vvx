import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Package } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { api } from '@/lib/api';
import { buildApiAssetUrl } from '@/lib/utils';
import { showAlert, hideMainButton, showBackButton, hideBackButton } from '@/lib/telegram';
import type { Order } from '@/types/api';
import { Skeleton } from '@/components/ui/skeleton';
import { Seo } from '@/components/Seo';
import { buildCanonicalUrl } from '@/lib/seo';

export const OrderPage = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [editingAddress, setEditingAddress] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (orderId) {
      loadOrder();
    } else {
      loadLastOrder();
    }

    showBackButton(() => navigate('/'));

    return () => {
      hideMainButton();
      hideBackButton();
    };
  }, [orderId]);

  const loadOrder = async () => {
    if (!orderId) return;

    try {
      const data = await api.getOrder(orderId);
      setOrder(data);
      setNewAddress(data.delivery_address);
    } catch (error) {
      showAlert('Ошибка загрузки заказа');
    } finally {
      setLoading(false);
    }
  };

  const loadLastOrder = async () => {
    try {
      const data = await api.getLastOrder();
      if (data) {
        setOrder(data);
        setNewAddress(data.delivery_address);
      } else {
        showAlert('У вас пока нет активных заказов');
        navigate('/');
      }
    } catch (error) {
      showAlert('Ошибка загрузки заказа');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAddress = async () => {
    if (!order || !newAddress.trim()) {
      showAlert('Пожалуйста, укажите адрес');
      return;
    }

    setSaving(true);

    try {
      const updatedOrder = await api.updateOrderAddress(order.id, {
        address: newAddress,
      });
      
      setOrder(updatedOrder);
      setEditingAddress(false);
      showAlert('Адрес успешно обновлён');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Ошибка при изменении адреса';
      showAlert(message);
    } finally {
      setSaving(false);
    }
  };

  const jsonLdBase = {
    "@context": "https://schema.org",
    "@type": "Order",
    url: orderId ? buildCanonicalUrl(`/order/${orderId}`) : buildCanonicalUrl("/order"),
    orderStatus: "https://schema.org/OrderProcessing",
  };

  if (loading) {
    return (
      <>
        <Seo title="Заказ" description="Отслеживайте состояние заказа и обновляйте адрес доставки." path={orderId ? `/order/${orderId}` : '/order'} jsonLd={jsonLdBase} />
        <div className="min-h-screen bg-background p-4 space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </>
    );
  }

  if (!order) {
    return (
      <>
        <Seo title="Заказ не найден" description="Создайте заказ в каталоге Mini Shop." path="/order" jsonLd={jsonLdBase} />
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="text-center">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Заказ не найден</p>
            <Button onClick={() => navigate('/')} className="mt-4">
              Вернуться в каталог
            </Button>
          </div>
        </div>
      </>
    );
  }

  const canEditAddress =
    order.can_edit_address &&
    (order.status === 'новый' || order.status === 'в обработке');
  const receiptUrl = order.payment_receipt_url ? buildApiAssetUrl(order.payment_receipt_url) : null;
  const orderJsonLd = {
    ...jsonLdBase,
    orderNumber: order.id,
    priceCurrency: "KZT",
    price: order.total_amount,
    acceptedOffer: order.items.map(item => ({
      "@type": "Offer",
      itemOffered: {
        "@type": "Product",
        name: item.product_name,
      },
      price: item.price,
      priceCurrency: "KZT",
      eligibleQuantity: {
        "@type": "QuantitativeValue",
        value: item.quantity,
      },
    })),
    orderStatus: order.status,
  };

  return (
    <>
      <Seo
        title={`Заказ ${order.id.slice(-6)}`}
        description="Отслеживайте статус заказа и редактируйте адрес доставки."
        path={orderId ? `/order/${orderId}` : '/order'}
        jsonLd={orderJsonLd}
      />
      <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border p-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Заказ #{order.id.slice(-6)}</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Status */}
        <div className="bg-card rounded-lg p-4 border border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Статус заказа:</span>
            <OrderStatusBadge status={order.status} />
          </div>
        </div>

        {/* Address */}
        <div className="bg-card rounded-lg p-4 border border-border space-y-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <Label className="text-base font-semibold">Адрес доставки</Label>
          </div>

          {editingAddress ? (
            <div className="space-y-3">
              <Textarea
                value={newAddress}
                onChange={e => setNewAddress(e.target.value)}
                rows={3}
                disabled={saving}
                placeholder="Укажите адрес доставки"
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleSaveAddress}
                  disabled={saving}
                  className="flex-1"
                >
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingAddress(false);
                    setNewAddress(order.delivery_address);
                  }}
                  disabled={saving}
                >
                  Отмена
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-foreground">{order.delivery_address}</p>
              {canEditAddress ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingAddress(true)}
                  className="w-full"
                >
                  Изменить адрес
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Адрес нельзя изменить после того, как заказ выехал
                </p>
              )}
            </>
          )}
        </div>

        {/* Order Items */}
        <div className="bg-card rounded-lg p-4 border border-border space-y-3">
          <h3 className="font-semibold text-foreground">Состав заказа</h3>
          <div className="space-y-2">
            {order.items.map((item, index) => (
              <div key={index} className="flex justify-between text-sm">
                <div className="flex-1">
                  <p className="text-foreground">
                    {item.product_name}
                    {item.variant_name && ` (${item.variant_name})`}
                  </p>
                  <p className="text-muted-foreground">
                    {item.quantity} × {item.price} ₸
                  </p>
                </div>
                <span className="font-medium text-foreground">
                  {item.quantity * item.price} ₸
                </span>
              </div>
            ))}
          </div>
          <div className="pt-3 border-t border-border flex justify-between">
            <span className="font-semibold text-foreground">Итого:</span>
            <span className="text-xl font-bold text-foreground">
              {order.total_amount} ₸
            </span>
          </div>
        </div>

        {/* Customer Info */}
        <div className="bg-card rounded-lg p-4 border border-border space-y-2">
          <h3 className="font-semibold text-foreground">Контактная информация</h3>
          <div className="space-y-1 text-sm">
            <p className="text-muted-foreground">Имя: <span className="text-foreground">{order.customer_name}</span></p>
            <p className="text-muted-foreground">Телефон: <span className="text-foreground">{order.customer_phone}</span></p>
            {order.comment && (
              <p className="text-muted-foreground">Комментарий: <span className="text-foreground">{order.comment}</span></p>
            )}
          </div>
        </div>

        {receiptUrl && (
          <div className="bg-card rounded-lg p-4 border border-border space-y-2">
            <h3 className="font-semibold text-foreground">Чек об оплате</h3>
            <p className="text-sm text-muted-foreground">
              {order.payment_receipt_filename || 'Файл чека'} доступен для скачивания
            </p>
            <a
              href={receiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
            >
              Открыть чек
            </a>
          </div>
        )}
      </div>
      </div>
    </>
  );
};
