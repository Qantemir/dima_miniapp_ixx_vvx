import { MoreVertical, Plus } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Category } from '@/types/api';

interface CategoryListCardProps {
  categories: Category[];
  onAdd: () => void;
  onSelect: (categoryId: string) => void;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}

export const CategoryListCard = ({
  categories,
  onAdd,
  onSelect,
  onEdit,
  onDelete,
}: CategoryListCardProps) => (
  <section aria-label="Категории">
    <Card className="border border-border bg-card p-4 sm:p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg sm:text-xl font-semibold text-foreground">Категории</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Создавайте и редактируйте рубрики каталога
          </p>
        </div>
        <div className="flex-shrink-0">
          <Button size="sm" onClick={onAdd} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Новая категория
          </Button>
        </div>
      </div>

      <div className="divide-y divide-border">
        {categories.length === 0 ? (
          <p className="py-3 text-sm text-muted-foreground">Категории ещё не созданы.</p>
        ) : (
          categories.map(category => (
            <div
              key={category.id}
              className="py-3 flex items-center justify-between cursor-pointer"
              onClick={() => onSelect(category.id)}
            >
              <div className="flex-1">
                <p className="font-medium text-foreground">{category.name}</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={event => event.stopPropagation()}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  onClick={event => event.stopPropagation()}
                >
                  <DropdownMenuItem onClick={() => onEdit(category)}>Редактировать</DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onDelete(category)}
                  >
                    Удалить
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))
        )}
      </div>
    </Card>
  </section>
);

