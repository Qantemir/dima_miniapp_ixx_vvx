import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface CategoryDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  value: string;
  saving: boolean;
  onChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
}

export const CategoryDialog = ({
  open,
  mode,
  value,
  saving,
  onChange,
  onOpenChange,
  onSubmit,
}: CategoryDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{mode === 'create' ? 'Новая категория' : 'Редактирование категории'}</DialogTitle>
        <DialogDescription>
          {mode === 'create'
            ? 'Опишите рубрику, чтобы сгруппировать товары в каталоге.'
            : 'Укажите новое название категории.'}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-2">
        <div className="space-y-2">
          <Label>Название</Label>
          <Input value={value} onChange={event => onChange(event.target.value)} placeholder="Например, Пицца" />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
          Отмена
        </Button>
        <Button onClick={onSubmit} disabled={saving}>
          {mode === 'create' ? 'Создать' : 'Сохранить'}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

