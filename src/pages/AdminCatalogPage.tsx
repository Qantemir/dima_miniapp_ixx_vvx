import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Boxes } from '@/components/icons';
import { AdminPageLayout } from '@/components/AdminPageLayout';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';
import type {
  CatalogResponse,
  Category,
  CategoryPayload,
  Product,
} from '@/types/api';
import { Seo } from '@/components/Seo';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CategoryListCard } from '@/components/admin/catalog/CategoryListCard';
import { CategoryDialog } from '@/components/admin/catalog/CategoryDialog';
import { CategoryDeleteDialog } from '@/components/admin/catalog/CategoryDeleteDialog';
import { CategoryLoadingSection } from '@/components/admin/catalog/CategoryLoadingSection';
import { useAdminGuard } from '@/hooks/useAdminGuard';

type DialogMode = 'create' | 'edit';

const createEmptyCategory = (): CategoryPayload => ({
  name: '',
});

export const AdminCatalogPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categoryDialogMode, setCategoryDialogMode] = useState<DialogMode>('create');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryPayload>(createEmptyCategory());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isAuthorized = useAdminGuard('/');

  const {
    data: catalog,
    isLoading: catalogLoading,
  } = useQuery({
    queryKey: ['admin-catalog'],
    queryFn: () => api.getAdminCatalog(),
    enabled: isAuthorized,
    staleTime: 0,
    gcTime: 60 * 1000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

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

    await queryClient.cancelQueries({ queryKey: ['admin-catalog'], exact: true });
    await queryClient.cancelQueries({ queryKey: ['catalog'] });
    setSaving(true);
    
    // Оптимистичное обновление
    const previousCatalog = queryClient.getQueryData<{ categories: Category[]; products: Product[] }>(['admin-catalog']);
    const previousPublicCatalog = queryClient.getQueryData<CatalogResponse>(['catalog']);
    
    let newCategory: Category | null = null;
    let updatedCategory: Category | null = null;
    
    if (categoryDialogMode === 'create') {
      // Создаём временную категорию для оптимистичного обновления
      newCategory = {
        id: `temp-${Date.now()}`,
        name: trimmedName,
      } as Category;
      
      if (previousCatalog) {
        queryClient.setQueryData(['admin-catalog'], {
          ...previousCatalog,
          categories: [...previousCatalog.categories, newCategory],
        });
      }
      if (previousPublicCatalog) {
        queryClient.setQueryData(['catalog'], {
          ...previousPublicCatalog,
          categories: [...previousPublicCatalog.categories, newCategory],
        });
      }
    } else if (selectedCategory) {
      // Обновляем категорию оптимистично
      updatedCategory = {
        ...selectedCategory,
        name: trimmedName,
      };
      
      if (previousCatalog) {
        queryClient.setQueryData(['admin-catalog'], {
          ...previousCatalog,
          categories: previousCatalog.categories.map(c => 
            c.id === selectedCategory.id ? updatedCategory : c
          ),
        });
      }
      if (previousPublicCatalog) {
        queryClient.setQueryData(['catalog'], {
          ...previousPublicCatalog,
          categories: previousPublicCatalog.categories.map(c =>
            c.id === selectedCategory.id ? updatedCategory : c
          ),
        });
      }
    }
    
    setCategoryDialogOpen(false);
    setCategoryForm(createEmptyCategory());
    
    try {
      let createdOrUpdatedCategory: Category;
      if (categoryDialogMode === 'create') {
        createdOrUpdatedCategory = await api.createCategory({ name: trimmedName });
        toast.success('Категория создана');
      } else if (selectedCategory) {
        createdOrUpdatedCategory = await api.updateCategory(selectedCategory.id, { name: trimmedName });
        toast.success('Категория обновлена');
      } else {
        throw new Error('Неизвестный режим диалога');
      }
      
      // Обновляем с реальными данными с сервера
      queryClient.setQueryData(['admin-catalog'], (oldData: { categories: Category[]; products: Product[] } | undefined) => {
        if (!oldData) return oldData;
        const tempId = categoryDialogMode === 'create' ? newCategory?.id : selectedCategory?.id;
        if (!tempId) return oldData;
        const exists = oldData.categories.some(c => c.id === tempId);
        return {
          ...oldData,
          categories: exists
            ? oldData.categories.map(c => (c.id === tempId ? createdOrUpdatedCategory : c))
            : [...oldData.categories, createdOrUpdatedCategory],
        };
      });

      queryClient.setQueryData(['catalog'], (oldData: CatalogResponse | undefined) => {
        if (!oldData) return oldData;
        const tempId = categoryDialogMode === 'create' ? newCategory?.id : selectedCategory?.id;
        if (!tempId) return oldData;
        const exists = oldData.categories.some(c => c.id === tempId);
        return {
          ...oldData,
          categories: exists
            ? oldData.categories.map(c => (c.id === tempId ? createdOrUpdatedCategory : c))
            : [...oldData.categories, createdOrUpdatedCategory],
        };
      });
      
      const detailQueryKey = ['admin-category', createdOrUpdatedCategory.id];

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-catalog'] }),
        queryClient.invalidateQueries({ queryKey: ['catalog'] }),
      ]);
      
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['admin-catalog'], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['catalog'], type: 'active' }),
      ]);
      queryClient.removeQueries({ queryKey: detailQueryKey, exact: true });
    } catch (error) {
      // Откатываем изменения при ошибке
      if (previousCatalog) {
        queryClient.setQueryData(['admin-catalog'], previousCatalog);
      }
      if (previousPublicCatalog) {
        queryClient.setQueryData(['catalog'], previousPublicCatalog);
      }
      setCategoryDialogOpen(true); // Открываем диалог обратно при ошибке
      if (categoryDialogMode === 'create') {
        setCategoryForm({ name: trimmedName });
      } else if (selectedCategory) {
        setCategoryForm({ name: trimmedName });
        setSelectedCategory(selectedCategory);
      }
      const errorMessage = error instanceof Error ? error.message : 'Ошибка сохранения категории';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleCategoryDelete = (category: Category) => {
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
    await queryClient.cancelQueries({ queryKey: ['admin-catalog'], exact: true });
    await queryClient.cancelQueries({ queryKey: ['catalog'] });
    setDeleting(true);
    
    // Оптимистичное обновление - сразу удаляем категорию из UI
    const previousCatalog = queryClient.getQueryData<{ categories: Category[]; products: Product[] }>(['admin-catalog']);
    const previousPublicCatalog = queryClient.getQueryData<CatalogResponse>(['catalog']);
    if (previousCatalog) {
      queryClient.setQueryData(['admin-catalog'], {
        ...previousCatalog,
        categories: previousCatalog.categories.filter(c => c.id !== categoryToDelete.id),
        products: previousCatalog.products.filter(p => p.category_id !== categoryToDelete.id),
      });
    }
    if (previousPublicCatalog) {
      queryClient.setQueryData(['catalog'], {
        ...previousPublicCatalog,
        categories: previousPublicCatalog.categories.filter(c => c.id !== categoryToDelete.id),
        products: previousPublicCatalog.products.filter(p => p.category_id !== categoryToDelete.id),
      });
    }
    
    setDeleteDialogOpen(false);
    const deletedCategory = categoryToDelete;
    setCategoryToDelete(null);
    
    try {
      await api.deleteCategory(deletedCategory.id);
      toast.success('Категория удалена');
      // Инвалидируем для синхронизации с сервером в фоне
      const detailQueryKey = ['admin-category', deletedCategory.id];

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-catalog'] }),
        queryClient.invalidateQueries({ queryKey: ['catalog'] }),
      ]);
      
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['admin-catalog'], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['catalog'], type: 'active' }),
      ]);
      queryClient.removeQueries({ queryKey: detailQueryKey, exact: true });
    } catch (error) {
      // Откатываем изменения при ошибке
      if (previousCatalog) {
        queryClient.setQueryData(['admin-catalog'], previousCatalog);
      }
      if (previousPublicCatalog) {
        queryClient.setQueryData(['catalog'], previousPublicCatalog);
      }
      setDeleteDialogOpen(true);
      setCategoryToDelete(deletedCategory);
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

  if (!isAuthorized || catalogLoading || !catalog) {
    return (
      <>
        <Seo {...seoProps} />
        <AdminPageLayout
          title="Каталог"
          description="Создавайте и редактируйте карточки товаров"
          icon={Boxes}
          contentClassName="space-y-6"
          contentLabel="Категории магазина"
        >
          <CategoryLoadingSection onAdd={() => openCategoryDialog()} />
        </AdminPageLayout>
        <CategoryDialog
          open={categoryDialogOpen}
          onOpenChange={setCategoryDialogOpen}
          mode={categoryDialogMode}
          value={categoryForm.name}
          saving={saving}
          onChange={value => setCategoryForm(prev => ({ ...prev, name: value }))}
          onSubmit={handleCategorySubmit}
        />
      </>
    );
  }

  return (
    <>
      <Seo {...seoProps} />
      <AdminPageLayout
        title="Каталог"
        description="Создавайте и редактируйте карточки товаров"
        icon={Boxes}
        contentClassName="space-y-6"
        contentLabel="Категории магазина"
      >
        <CategoryListCard
          categories={catalog.categories}
          onAdd={() => openCategoryDialog()}
          onSelect={categoryId => navigate(`/admin/catalog/${categoryId}`)}
          onEdit={category => openCategoryDialog(category)}
          onDelete={category => handleCategoryDelete(category)}
        />
      </AdminPageLayout>

      <CategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        mode={categoryDialogMode}
        value={categoryForm.name}
        saving={saving}
        onChange={value => setCategoryForm(prev => ({ ...prev, name: value }))}
        onSubmit={handleCategorySubmit}
      />

      <CategoryDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={handleDeleteDialogChange}
        categoryName={categoryToDelete?.name}
        deleting={deleting}
        onConfirm={() => {
          void confirmDeleteCategory();
        }}
      />
    </>
  );
};
