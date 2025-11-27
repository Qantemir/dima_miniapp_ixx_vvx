import { ArrowLeft } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface OrderDetailHeaderProps {
  orderNumber: string;
  onBack?: () => void;
  className?: string;
}

export const OrderDetailHeader = ({ orderNumber, onBack, className }: OrderDetailHeaderProps) => {
  return (
    <div
      className={cn(
        'sticky bg-card border-b border-border px-3 py-2.5 sm:px-4 sm:py-4',
        className,
      )}
      style={{
        top: 'calc(env(safe-area-inset-top, 0px) + var(--tg-header-height, 0px))',
        zIndex: 5,
      }}
    >
      <div className="flex items-center gap-2 sm:gap-3">
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="h-9 w-9 sm:h-10 sm:w-10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">Заказ #{orderNumber}</h1>
      </div>
    </div>
  );
};

