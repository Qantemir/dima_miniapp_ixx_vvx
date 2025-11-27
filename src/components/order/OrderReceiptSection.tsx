import { Button } from '@/components/ui/button';
import { ReceiptDialog } from '@/components/ReceiptDialog';
import { OrderSectionCard } from '@/components/order/OrderSectionCard';

interface OrderReceiptSectionProps {
  receiptUrl: string;
  filename?: string | null;
}

export const OrderReceiptSection = ({ receiptUrl, filename }: OrderReceiptSectionProps) => (
  <OrderSectionCard className="space-y-2">
    <h3 className="font-semibold text-foreground text-sm sm:text-base">Чек об оплате</h3>
    <p className="text-sm text-muted-foreground">
      {filename || 'Файл чека'} доступен для просмотра
    </p>
    <ReceiptDialog
      receiptUrl={receiptUrl}
      filename={filename}
      trigger={
        <Button className="w-full" variant="outline">
          Открыть чек
        </Button>
      }
    />
  </OrderSectionCard>
);

