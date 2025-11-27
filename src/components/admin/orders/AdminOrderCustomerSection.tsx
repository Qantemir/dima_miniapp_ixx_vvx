import { User, Phone } from '@/components/icons';
import { AdminSectionCard } from '@/components/admin/orders/AdminSectionCard';

interface AdminOrderCustomerSectionProps {
  name: string;
  phone: string;
}

export const AdminOrderCustomerSection = ({ name, phone }: AdminOrderCustomerSectionProps) => (
  <AdminSectionCard title="Клиент" ariaLabel="Данные клиента">
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-muted-foreground" />
        <span className="text-foreground">{name}</span>
      </div>
      <div className="flex items-center gap-2">
        <Phone className="h-4 w-4 text-muted-foreground" />
        <a href={`tel:${phone}`} className="text-primary hover:underline">
          {phone}
        </a>
      </div>
    </div>
  </AdminSectionCard>
);

