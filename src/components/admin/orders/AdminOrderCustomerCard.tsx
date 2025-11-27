import { User, Phone } from '@/components/icons';
import { AdminSectionCard } from '@/components/admin/AdminSectionCard';

interface AdminOrderCustomerCardProps {
  name: string;
  phone: string;
}

export const AdminOrderCustomerCard = ({ name, phone }: AdminOrderCustomerCardProps) => (
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

