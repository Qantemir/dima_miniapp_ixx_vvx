import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface CategoryDeleteDialogProps {
  open: boolean;
  categoryName?: string | null;
  deleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export const CategoryDeleteDialog = ({
  open,
  categoryName,
  deleting,
  onOpenChange,
  onConfirm,
}: CategoryDeleteDialogProps) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Удалить категорию?</AlertDialogTitle>
        <AlertDialogDescription>
          {categoryName
            ? `Категория "${categoryName}" и все её товары будут удалены без возможности восстановления.`
            : 'Категория и её товары будут удалены без возможности восстановления.'}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={deleting}>Отмена</AlertDialogCancel>
        <AlertDialogAction
          disabled={deleting}
          onClick={event => {
            event.preventDefault();
            onConfirm();
          }}
        >
          Удалить
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

