import { Button } from '@/components/ui/button';
import { ArrowLeft } from '@/components/icons';

interface OrderHeaderProps {
  shortOrderId: string;
  onBack: () => void;
}

export const OrderHeader = ({ shortOrderId, onBack }: OrderHeaderProps) => (
  <header
    className="sticky bg-card border-b border-border px-3 py-2.5 sm:px-4 sm:py-4"
    style={{
      top: 'calc(env(safe-area-inset-top, 0px) + var(--tg-header-height, 0px))',
      zIndex: 5,
    }}
  >
    <div className="flex items-center gap-2 sm:gap-3">
      <Button variant="ghost" size="icon" onClick={onBack} className="h-9 w-9 sm:h-10 sm:w-10">
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">Заказ #{shortOrderId}</h1>
    </div>
  </header>
);

