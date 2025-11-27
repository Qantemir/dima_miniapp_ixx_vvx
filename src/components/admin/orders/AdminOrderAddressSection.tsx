import { MapPin } from '@/components/icons';
import { AdminSectionCard } from '@/components/admin/orders/AdminSectionCard';

interface AdminOrderAddressSectionProps {
  address: string;
}

export const AdminOrderAddressSection = ({ address }: AdminOrderAddressSectionProps) => (
  <AdminSectionCard ariaLabel="Адрес доставки">
    <div className="flex items-center gap-2 mb-2">
      <MapPin className="h-5 w-5 text-primary" />
      <h2 className="font-semibold text-foreground">Адрес доставки</h2>
    </div>
    <p className="text-foreground whitespace-pre-line">{address}</p>
  </AdminSectionCard>
);

