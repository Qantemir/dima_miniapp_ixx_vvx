import { AdminSectionCard } from '@/components/admin/orders/AdminSectionCard';

interface AdminOrderCommentSectionProps {
  comment: string;
}

export const AdminOrderCommentSection = ({ comment }: AdminOrderCommentSectionProps) => (
  <AdminSectionCard title="Комментарий" ariaLabel="Комментарий клиента">
    <p className="text-foreground whitespace-pre-line">{comment}</p>
  </AdminSectionCard>
);

