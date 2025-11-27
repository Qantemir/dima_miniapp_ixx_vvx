import { Plus } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface CategoryLoadingSectionProps {
  onAdd: () => void;
}

export const CategoryLoadingSection = ({ onAdd }: CategoryLoadingSectionProps) => (
  <section aria-busy className="space-y-3">
    <Card className="border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Категории</h2>
          <p className="text-sm text-muted-foreground">Создавайте и редактируйте рубрики каталога</p>
        </div>
        <Button size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Новая категория
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Загрузить текущие категории не удалось. Вы всё равно можете добавить новую.
      </p>
    </Card>

    <div className="space-y-3" aria-label="Загружаемые категории">
      {[1, 2, 3].map(i => (
        <Skeleton key={i} className="h-32 w-full" />
      ))}
    </div>
  </section>
);

