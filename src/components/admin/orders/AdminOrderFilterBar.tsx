import { Filter } from '@/components/icons';
import { Button } from '@/components/ui/button';
import type { OrderStatus } from '@/types/api';

interface FilterOption {
  value: OrderStatus | 'all';
  label: string;
}

interface AdminOrderFilterBarProps {
  options: FilterOption[];
  selected: OrderStatus | 'all';
  onSelect: (value: OrderStatus | 'all') => void;
}

export const AdminOrderFilterBar = ({ options, selected, onSelect }: AdminOrderFilterBarProps) => (
  <section
    className="bg-card border border-border rounded-lg p-4 space-y-3"
    aria-label="Фильтр заказов по статусу"
  >
    <div className="flex items-center gap-2">
      <Filter className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">Статус:</span>
    </div>
    <div className="flex gap-2 overflow-x-auto pb-1">
      {options.map(option => (
        <Button
          key={option.value}
          variant={selected === option.value ? 'default' : 'outline'}
          size="sm"
          onClick={() => onSelect(option.value)}
          className="flex-shrink-0"
        >
          {option.label}
        </Button>
      ))}
    </div>
  </section>
);

