import { MapPin } from '@/components/icons';
import { AdminSectionCard } from '@/components/admin/AdminSectionCard';

interface AdminOrderAddressCardProps {
  address: string;
}

export const AdminOrderAddressCard = ({ address }: AdminOrderAddressCardProps) => (
  <AdminSectionCard ariaLabel="Адрес доставки">
    <div className="flex items-center gap-2 mb-3">
      <MapPin className="h-5 w-5 text-primary" />
      <h2 className="font-semibold text-foreground">Адрес доставки</h2>
    </div>
    <p className="text-foreground whitespace-pre-line">{address}</p>
  </AdminSectionCard>
);

