import { AdminSectionCard } from '@/components/admin/AdminSectionCard';

interface AdminOrderCommentCardProps {
  comment: string;
}

export const AdminOrderCommentCard = ({ comment }: AdminOrderCommentCardProps) => (
  <AdminSectionCard title="Комментарий" ariaLabel="Комментарий клиента">
    <p className="text-foreground whitespace-pre-line">{comment}</p>
  </AdminSectionCard>
);

