import { useCallback, useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Package } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { buildApiAssetUrl } from '@/lib/utils';
import { hideMainButton, showBackButton, hideBackButton } from '@/lib/telegram';
import { toast } from '@/lib/toast';
import type { Order } from '@/types/api';
import { API_BASE_URL } from '@/types/api';
import { Skeleton } from '@/components/ui/skeleton';
import { Seo } from '@/components/Seo';
import { buildCanonicalUrl } from '@/lib/seo';
import { PageTransition } from '@/components/animations';
import { OrderHeader } from '@/components/order/OrderHeader';
import { OrderStatusSection } from '@/components/order/OrderStatusSection';
import { OrderAddressSection } from '@/components/order/OrderAddressSection';
import { OrderItemsSection } from '@/components/order/OrderItemsSection';
import { OrderCustomerSection } from '@/components/order/OrderCustomerSection';
import { OrderReceiptSection } from '@/components/order/OrderReceiptSection';

export const OrderPage = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [editingAddress, setEditingAddress] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [saving, setSaving] = useState(false);

  const loadOrder = useCallback(async () => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await api.getOrder(orderId);
      if (data && data.id) {
        setOrder(data);
        setNewAddress(data.delivery_address || '');
      } else {
        setOrder(null);
        toast.error('Заказ не найден');
      }
    } catch (error) {
      console.error('Error loading order:', error);
      setOrder(null);
      const errorMessage = error instanceof Error ? error.message : 'Ошибка загрузки заказа';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  const loadLastOrder = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getLastOrder();
      if (data && data.id) {
        setOrder(data);
        setNewAddress(data.delivery_address || '');
      } else {
        setOrder(null);
        toast.info('У вас пока нет активных заказов');
        // Не перенаправляем автоматически, показываем сообщение
      }
    } catch (error) {
      console.error('Error loading last order:', error);
      setOrder(null);
      const errorMessage = error instanceof Error ? error.message : 'Ошибка загрузки заказа';
      toast.error(errorMessage);
      // Не перенаправляем автоматически при ошибке
    } finally {
      setLoading(false);
    }
  }, []);

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
  }, [orderId, navigate, loadOrder, loadLastOrder]);

  const handleSaveAddress = async () => {
    if (!order || !newAddress.trim()) {
      toast.warning('Пожалуйста, укажите адрес');
      return;
    }

    setSaving(true);

    try {
      const updatedOrder = await api.updateOrderAddress(order.id, {
        address: newAddress,
      });
      
      setOrder(updatedOrder);
      setEditingAddress(false);
      toast.success('Адрес успешно обновлён');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Ошибка при изменении адреса';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  // Мемоизация базового jsonLd для предотвращения пересоздания на каждом рендере
  const jsonLdBase = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "Order",
    url: orderId ? buildCanonicalUrl(`/order/${orderId}`) : buildCanonicalUrl("/order"),
    orderStatus: "https://schema.org/OrderProcessing",
  }), [orderId]);

  // Формируем URL для получения чека через endpoint (до early returns)
  const receiptUrl = useMemo(() => {
    if (!order) return null;
    if (!order.payment_receipt_file_id && !order.payment_receipt_url) {
      return null;
    }
    // Если есть payment_receipt_url (старый формат), используем его
    if (order.payment_receipt_url) {
      return buildApiAssetUrl(order.payment_receipt_url);
    }
    // Если есть payment_receipt_file_id, формируем URL через endpoint
    if (order.payment_receipt_file_id) {
      const orderIdForReceipt = orderId || order.id;
      const baseUrl = API_BASE_URL;
      if (baseUrl.startsWith('http://') || baseUrl.startsWith('https://')) {
        const adjustedBaseUrl = baseUrl.replace(/\/app\/api/, '/api');
        return `${adjustedBaseUrl}/order/${orderIdForReceipt}/receipt`;
      }
      return `${baseUrl}/order/${orderIdForReceipt}/receipt`;
    }
    return null;
  }, [order, orderId]);

  // Формируем JSON-LD для заказа (до early returns)
  const orderJsonLd = useMemo(() => {
    if (!order) return jsonLdBase;
    // Фильтруем null/undefined элементы и элементы без обязательных полей
    const validItems = (order.items || []).filter(
      item => item && item.product_name && typeof item.price === 'number' && typeof item.quantity === 'number'
    );
    return {
      ...jsonLdBase,
      orderNumber: order.id,
      priceCurrency: "KZT",
      price: order.total_amount,
      acceptedOffer: validItems.map(item => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Product",
          name: item.product_name || 'Товар',
        },
        price: item.price,
        priceCurrency: "KZT",
        quantity: item.quantity,
      })),
      orderStatus: order.status === 'завершён' 
        ? "https://schema.org/OrderDelivered" 
        : order.status === 'отменён'
        ? "https://schema.org/OrderCancelled"
        : "https://schema.org/OrderProcessing",
    };
  }, [order, jsonLdBase]);

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
    order.status === 'в обработке';

  return (
    <>
      <Seo
        title={`Заказ ${order.id.slice(-6)}`}
        description="Отслеживайте статус заказа и редактируйте адрес доставки."
        path={orderId ? `/order/${orderId}` : '/order'}
        jsonLd={orderJsonLd}
      />
      <PageTransition>
        <div className="min-h-screen bg-background pb-24">
          <OrderHeader shortOrderId={order.id.slice(-6)} onBack={() => navigate('/')} />

          <div className="px-3 py-4 sm:px-4 sm:py-6 space-y-4 sm:space-y-6">
            <OrderStatusSection status={order.status || 'в обработке'} />

            <OrderAddressSection
              address={order.delivery_address || ''}
              editing={editingAddress}
              canEdit={canEditAddress}
              saving={saving}
              newAddress={newAddress}
              onAddressChange={value => setNewAddress(value)}
              onSave={handleSaveAddress}
              onCancel={() => {
                setEditingAddress(false);
                setNewAddress(order.delivery_address || '');
              }}
              onEditRequest={() => setEditingAddress(true)}
            />

            <OrderItemsSection items={order.items || []} totalAmount={order.total_amount || 0} />

            <OrderCustomerSection
              name={order.customer_name || ''}
              phone={order.customer_phone || ''}
              comment={order.comment}
            />

            {receiptUrl ? (
              <OrderReceiptSection
                receiptUrl={receiptUrl}
                filename={order.payment_receipt_filename}
              />
            ) : null}
          </div>
        </div>
      </PageTransition>
    </>
  );
};
