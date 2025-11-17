import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Boxes, MoreVertical, Plus } from 'lucide-react';
import { AdminHeader } from '@/components/AdminHeader';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { api } from '@/lib/api';
import {
  hideBackButton,
  showAlert,
  showBackButton,
  showPopup,
} from '@/lib/telegram';
import type {
  CatalogResponse,
  Category,
  CategoryPayload,
} from '@/types/api';

type DialogMode = 'create' | 'edit';

const createEmptyCategory = (): CategoryPayload => ({
  name: '',
});

export const AdminCatalogPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categoryDialogMode, setCategoryDialogMode] = useState<DialogMode>('create');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryPayload>(createEmptyCategory());

  useEffect(() => {
    loadCatalog();
    showBackButton(() => navigate('/'));
    return () => {
      hideBackButton();
    };
  }, []);

  const loadCatalog = async () => {
    setLoading(true);
    try {
      const data = await api.getAdminCatalog();
      setCatalog(data);
    } catch (error) {
      showAlert('Ошибка загрузки каталога');
    } finally {
      setLoading(false);
    }
  };

  const openCategoryDialog = (category?: Category) => {
    if (category) {
      setCategoryDialogMode('edit');
      setSelectedCategory(category);
      setCategoryForm({
        name: category.name,
      });
    } else {
      setCategoryDialogMode('create');
      setSelectedCategory(null);
      setCategoryForm(createEmptyCategory());
    }
    setCategoryDialogOpen(true);
  };

  const handleCategorySubmit = async () => {
    if (!categoryForm.name) {
      showAlert('Укажите название категории');
      return;
    }

    setSaving(true);
    try {
      if (categoryDialogMode === 'create') {
        await api.createCategory(categoryForm);
        showAlert('Категория создана');
      } else if (selectedCategory) {
        await api.updateCategory(selectedCategory.id, categoryForm);
        showAlert('Категория обновлена');
      }
      setCategoryDialogOpen(false);
      await loadCatalog();
    } catch (error) {
      showAlert('Ошибка сохранения категории');
    } finally {
      setSaving(false);
    }
  };

  const handleCategoryDelete = (category: Category) => {
    showPopup(
      {
        title: 'Удаление категории',
        message: `Удалить категорию "${category.name}"? Все её товары останутся без категории.`,
        buttons: [
          { id: 'cancel', type: 'cancel', text: 'Отмена' },
          { id: 'confirm', type: 'destructive', text: 'Удалить' },
        ],
      },
      async (buttonId) => {
        if (buttonId !== 'confirm') return;
        try {
          await api.deleteCategory(category.id);
          showAlert('Категория удалена');
          await loadCatalog();
        } catch {
          showAlert('Не удалось удалить категорию');
        }
      }
    );
  };

  if (loading || !catalog) {
    return (
      <div className="min-h-screen bg-background pb-6">
        <AdminHeader
          title="Каталог"
          description="Создавайте и редактируйте карточки товаров"
          icon={Boxes}
        />

        <div className="p-4 space-y-6">
          <Card className="border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Категории</h2>
                <p className="text-sm text-muted-foreground">
                  Создавайте и редактируйте рубрики каталога
                </p>
              </div>
              <Button size="sm" onClick={() => openCategoryDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Новая категория
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Загрузить текущие категории не удалось. Вы всё равно можете добавить новую.
            </p>
          </Card>

          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>

        <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {categoryDialogMode === 'create' ? 'Новая категория' : 'Редактирование категории'}
              </DialogTitle>
              <DialogDescription>
                Опишите рубрику, чтобы сгруппировать товары в каталоге.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Название</Label>
                <Input
                  value={categoryForm.name}
                  onChange={event =>
                    setCategoryForm(prev => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="Например, Пицца"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCategoryDialogOpen(false)}
                disabled={saving}
              >
                Отмена
              </Button>
              <Button onClick={handleCategorySubmit} disabled={saving}>
                {categoryDialogMode === 'create' ? 'Создать' : 'Сохранить'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-6">
      <AdminHeader
        title="Каталог"
        description="Создавайте и редактируйте карточки товаров"
        icon={Boxes}
      />

      <div className="p-4 space-y-6">
        <Card className="border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Категории</h2>
              <p className="text-sm text-muted-foreground">
                Создавайте и редактируйте рубрики каталога
              </p>
            </div>
            <Button size="sm" onClick={() => openCategoryDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Новая категория
            </Button>
          </div>

          <div className="divide-y divide-border">
            {catalog.categories.length === 0 ? (
              <p className="py-3 text-sm text-muted-foreground">Категории ещё не созданы.</p>
            ) : (
              catalog.categories.map(category => (
                <div
                  key={category.id}
                  className="py-3 flex items-center justify-between cursor-pointer"
                  onClick={() => navigate(`/admin/catalog/${category.id}`)}
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
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openCategoryDialog(category)}>
                        Редактировать
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleCategoryDelete(category)}
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

      </div>

      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {categoryDialogMode === 'create' ? 'Новая категория' : 'Редактирование категории'}
            </DialogTitle>
            <DialogDescription>
              Укажите название категории. Его увидят клиенты в каталоге.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input
                value={categoryForm.name}
                onChange={event =>
                  setCategoryForm(prev => ({ ...prev, name: event.target.value }))
                }
                placeholder="Например, Пицца"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)} disabled={saving}>
              Отмена
            </Button>
            <Button onClick={handleCategorySubmit} disabled={saving}>
              {categoryDialogMode === 'create' ? 'Создать' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

