import { Button } from '@/components/ui/button';
import { ArrowLeft } from '@/components/icons';

interface AdminOrderHeaderProps {
  shortOrderId: string;
  createdAt: string;
  onBack: () => void;
}

export const AdminOrderHeader = ({ shortOrderId, createdAt, onBack }: AdminOrderHeaderProps) => (
  <header className="bg-card border-b border-border p-4">
    <div className="flex items-center gap-3">
      <Button variant="ghost" size="icon" onClick={onBack} aria-label="Назад к списку заказов">
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <div>
        <h1 className="text-xl font-bold text-foreground">Заказ #{shortOrderId}</h1>
        <p className="text-sm text-muted-foreground">{createdAt}</p>
      </div>
    </div>
  </header>
);

