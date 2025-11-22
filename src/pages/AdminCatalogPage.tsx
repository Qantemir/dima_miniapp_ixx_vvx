import { useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Boxes, MoreVertical, Plus } from '@/components/icons';
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
  getUserId,
  isAdmin,
  hideBackButton,
  showBackButton,
} from '@/lib/telegram';
import { toast } from '@/lib/toast';
import { ADMIN_IDS } from '@/types/api';
import type {
  CatalogResponse,
  Category,
  CategoryPayload,
} from '@/types/api';
import { Seo } from '@/components/Seo';

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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const userId = getUserId();
    const isUserAdmin = userId ? isAdmin(userId, ADMIN_IDS) : false;
    
    if (!isUserAdmin) {
      toast.error('Доступ запрещён. Требуются права администратора.');
      navigate('/');
      return;
    }

    loadCatalog();
    showBackButton(() => navigate('/'));
    return () => {
      hideBackButton();
    };
  }, [navigate]);

  const loadCatalog = async () => {
    setLoading(true);
    try {
      const data = await api.getAdminCatalog();
      setCatalog(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка загрузки каталога';
      console.error('Ошибка загрузки каталога:', error);
      toast.error(`Ошибка загрузки каталога: ${message}`);
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
    const trimmedName = categoryForm.name?.trim();
    if (!trimmedName) {
      toast.warning('Укажите название категории');
      return;
    }

    setSaving(true);
    try {
      if (categoryDialogMode === 'create') {
        await api.createCategory({ name: trimmedName });
        toast.success('Категория создана');
      } else if (selectedCategory) {
        await api.updateCategory(selectedCategory.id, { name: trimmedName });
        toast.success('Категория обновлена');
      }
      setCategoryDialogOpen(false);
      setCategoryForm(createEmptyCategory());
      await loadCatalog();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка сохранения категории';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleCategoryDelete = (category: Category, event?: MouseEvent<HTMLElement>) => {
    if (event) {
      event.stopPropagation();
    }
    setCategoryToDelete(category);
    setDeleteDialogOpen(true);
  };

  const handleDeleteDialogChange = (open: boolean) => {
    setDeleteDialogOpen(open);
    if (!open && !deleting) {
      setCategoryToDelete(null);
    }
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    setDeleting(true);
    try {
      await api.deleteCategory(categoryToDelete.id);
      toast.success('Категория удалена');
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
      await loadCatalog();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Не удалось удалить категорию';
      toast.error(`Ошибка удаления: ${errorMessage}`);
    } finally {
      setDeleting(false);
    }
  };

  const seoProps = {
    title: "Админ: Категории",
    description: "Создавайте и редактируйте категории каталога.",
    path: "/admin/catalog",
    noIndex: true,
  };

  if (loading || !catalog) {
    return (
      <>
        <Seo {...seoProps} />
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
      </>
    );
  }

  return (
    <>
      <Seo {...seoProps} />
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
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          openCategoryDialog(category);
                        }}
                      >
                        Редактировать
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={(e) => handleCategoryDelete(category, e)}
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

        <AlertDialog open={deleteDialogOpen} onOpenChange={handleDeleteDialogChange}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Удалить категорию?</AlertDialogTitle>
              <AlertDialogDescription>
                {categoryToDelete
                  ? `Категория "${categoryToDelete.name}" и все её товары будут удалены без возможности восстановления.`
                  : 'Категория и её товары будут удалены без возможности восстановления.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Отмена</AlertDialogCancel>
              <AlertDialogAction
                disabled={deleting || !categoryToDelete}
                onClick={(event) => {
                  event.preventDefault();
                  void confirmDeleteCategory();
                }}
              >
                Удалить
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
};

