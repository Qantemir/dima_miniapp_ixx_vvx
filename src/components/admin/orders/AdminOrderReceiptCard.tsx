import { Button } from '@/components/ui/button';
import { ReceiptDialog } from '@/components/ReceiptDialog';
import { AdminSectionCard } from '@/components/admin/AdminSectionCard';

interface AdminOrderReceiptCardProps {
  receiptUrl: string;
  filename?: string | null;
}

export const AdminOrderReceiptCard = ({ receiptUrl, filename }: AdminOrderReceiptCardProps) => (
  <AdminSectionCard title="Чек об оплате" ariaLabel="Чек об оплате">
    <p className="text-sm text-muted-foreground mb-2">
      {filename || 'Файл чека'} приложен к заказу
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
  </AdminSectionCard>
);

