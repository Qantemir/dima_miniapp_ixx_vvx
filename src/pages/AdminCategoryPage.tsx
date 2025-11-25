import { ChangeEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Boxes, MoreVertical, Plus, Trash2, X } from '@/components/icons';
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
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
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
  showPopup,
} from '@/lib/telegram';
import { toast } from '@/lib/toast';
import { ADMIN_IDS } from '@/types/api';
import type { Category, Product, ProductPayload, ProductVariant } from '@/types/api';
import { Seo } from '@/components/Seo';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useQuery, useQueryClient } from '@tanstack/react-query';

type DialogMode = 'create' | 'edit';

const createEmptyProduct = (categoryId: string): ProductPayload => ({
  name: '',
  description: '',
  price: 0,
  image: '',
  images: [],
  category_id: categoryId,
  available: true,
});

export const AdminCategoryPage = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>('create');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductPayload | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);

  useEffect(() => {
    const userId = getUserId();
    const isUserAdmin = userId ? isAdmin(userId, ADMIN_IDS) : false;
    
    if (!isUserAdmin) {
      toast.error('Доступ запрещён. Требуются права администратора.');
      navigate('/');
      return;
    }

    setIsAuthorized(true);
    showBackButton(() => navigate('/admin/catalog'));
    return () => hideBackButton();
  }, [navigate]);

  const fetchCategory = async () => {
    if (!categoryId) throw new Error('Категория не найдена');
    return api.getAdminCategory(categoryId);
  };

  const {
    data: categoryData,
    isLoading: categoryLoading,
  } = useQuery({
    queryKey: ['admin-category', categoryId],
    queryFn: fetchCategory,
    enabled: isAuthorized && Boolean(categoryId),
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
    onError: error => {
      const message = error instanceof Error ? error.message : 'Не удалось загрузить категорию';
      toast.error(message);
      navigate('/admin/catalog');
    },
  });

  const category = categoryData?.category ?? null;
  const products = categoryData?.products ?? [];

  useEffect(() => {
    if (category && categoryId) {
      setFormData(prev => prev ?? createEmptyProduct(categoryId));
    }
  }, [category, categoryId]);

  const openCreateDialog = () => {
    if (!categoryId) return;
    setDialogMode('create');
    setSelectedProduct(null);
    setFormData(createEmptyProduct(categoryId));
    setVariants([]);
    setDialogOpen(true);
  };

  const openEditDialog = (product: Product) => {
    if (!categoryId) return;
    setDialogMode('edit');
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price || 0,
      image: product.image || product.images?.[0] || '',
      images: product.images || (product.image ? [product.image] : []),
      category_id: product.category_id,
      available: product.available,
    });
    setVariants(product.variants || []);
    setDialogOpen(true);
  };

  const handleDelete = (product: Product) => {
    showPopup(
      {
        title: 'Удаление товара',
        message: `Удалить "${product.name}" без возможности восстановления?`,
        buttons: [
          { id: 'cancel', type: 'cancel', text: 'Отмена' },
          { id: 'confirm', type: 'destructive', text: 'Удалить' },
        ],
      },
      async buttonId => {
        if (buttonId !== 'confirm') return;
        try {
          await api.deleteProduct(product.id);
          toast.success('Товар удалён');
          await queryClient.invalidateQueries({ queryKey: ['admin-category', categoryId] });
        } catch {
          toast.error('Не удалось удалить товар');
        }
      }
    );
  };

  const readFileAsDataURL = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  const handleImagesUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      const converted = await Promise.all(Array.from(files).map(readFileAsDataURL));
      setFormData(prev => {
        if (!prev) return prev;
        const nextImages = [...(prev.images ?? []), ...converted];
        return {
          ...prev,
          images: nextImages,
          image: nextImages[0] || prev.image,
        };
      });
    } catch (error) {
      toast.error('Не удалось загрузить изображения');
    }
  };

  const handleImagesInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    await handleImagesUpload(event.target.files);
    event.target.value = '';
  };

  const removeImage = (index: number) => {
    setFormData(prev => {
      if (!prev) return prev;
      const nextImages = (prev.images ?? []).filter((_, i) => i !== index);
      return {
        ...prev,
        images: nextImages,
        image: nextImages[0] || '',
      };
    });
  };

  const addVariant = () => {
    const newVariant: ProductVariant = {
      id: `variant-${Date.now()}`,
      name: '',
      quantity: 0,
      available: true,
    };
    setVariants(prev => [...prev, newVariant]);
  };

  const updateVariant = (index: number, field: keyof ProductVariant, value: string | number | boolean) => {
    setVariants(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeVariant = (index: number) => {
    setVariants(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!formData || !category) return;
    if (!formData.name || !formData.price) {
      toast.warning('Заполните обязательные поля');
      return;
    }

    // Вариации обязательны для всех товаров
    if (variants.length === 0) {
      toast.warning('Необходимо добавить хотя бы одну вариацию (вкус)');
      return;
    }

    // Валидация вариаций
    const invalidVariants = variants.filter(
      v => !v.name.trim() || v.quantity < 0
    );
    if (invalidVariants.length > 0) {
      toast.warning('Заполните все поля вариаций корректно');
      return;
    }

    const payload: ProductPayload = {
      ...formData,
      category_id: category.id,
      image: formData.images?.[0] || formData.image || '',
      images: formData.images,
      variants: variants,
    };

    setSaving(true);
    try {
      if (dialogMode === 'create') {
        await api.createProduct(payload);
        toast.success('Товар создан');
      } else if (selectedProduct) {
        await api.updateProduct(selectedProduct.id, payload);
        toast.success('Товар обновлён');
      }
      setDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['admin-category', categoryId] });
    } catch (error) {
      toast.error('Ошибка сохранения товара');
    } finally {
      setSaving(false);
    }
  };

  const seoTitle = category ? `Админ: ${category.name}` : "Админ: Категория";
  const seoPath = categoryId ? `/admin/catalog/${categoryId}` : "/admin/catalog";
  const seoProps = {
    title: seoTitle,
    description: "Редактируйте товары внутри выбранной категории.",
    path: seoPath,
    noIndex: true,
  };

  if (!isAuthorized || categoryLoading || !category || !formData) {
    return (
      <>
        <Seo {...seoProps} />
        <div className="min-h-screen bg-background pb-6">
        <AdminHeader
          title="Каталог"
          description="Создавайте и редактируйте карточки товаров"
          icon={Boxes}
        />
        <div className="p-4">
          <Skeleton className="h-48 w-full" />
        </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Seo {...seoProps} />
      <div className="min-h-screen bg-background pb-6">
      <AdminHeader
        title={category.name}
        description="Управляйте товарами категории"
        icon={Boxes}
      />

      <div className="p-4 space-y-6">
        <div className="flex justify-end">
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Добавить товар
          </Button>
        </div>

        <Card className="border border-border bg-card">
          <div className="divide-y divide-border">
            {products.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">В этой категории пока нет товаров</p>
            ) : (
              products.map(product => (
                <div
                  key={product.id}
                  className="p-4 flex items-start gap-3 sm:items-center sm:justify-between relative"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">{product.name}</p>
                    {product.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {product.description}
                      </p>
                    )}
                    <div className="text-sm text-muted-foreground mt-2 flex flex-wrap gap-3">
                      <span>
                        Цена:{' '}
                        <span className="text-foreground font-medium">{product.price ?? 0} ₸</span>
                      </span>
                      <span>
                        Статус:{' '}
                        <span className="text-foreground font-medium">
                          {product.available ? 'В наличии' : 'Нет в наличии'}
                        </span>
                      </span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-10 sm:w-10">
                          <MoreVertical className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(product)}>
                          Редактировать
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDelete(product)}
                        >
                          Удалить
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
            <DialogTitle>{dialogMode === 'create' ? 'Новый товар' : 'Редактирование товара'}</DialogTitle>
            <DialogDescription>Заполните информацию о товаре и сохраните изменения.</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-4">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input
                value={formData.name}
                onChange={event => setFormData(prev => (prev ? { ...prev, name: event.target.value } : prev))}
                placeholder="Например, Пицца Маргарита"
              />
            </div>

            <div className="space-y-2">
              <Label>Описание</Label>
              <Textarea
                value={formData.description}
                onChange={event =>
                  setFormData(prev =>
                    prev
                      ? {
                          ...prev,
                          description: event.target.value,
                        }
                      : prev
                  )
                }
                onInput={event =>
                  setFormData(prev =>
                    prev
                      ? {
                          ...prev,
                          description: (event.target as HTMLTextAreaElement).value,
                        }
                      : prev
                  )
                }
                rows={3}
                placeholder="Краткое описание товара"
                inputMode="text"
              />
            </div>

            <div className="space-y-2">
              <Label>Цена (₸)</Label>
              <Input
                type="text"
                value={formData.price === 0 ? '' : formData.price.toString()}
                onChange={event => {
                  const value = event.target.value.trim();
                  if (value === '') {
                    setFormData(prev =>
                      prev
                        ? {
                            ...prev,
                            price: 0,
                          }
                        : prev
                    );
                    return;
                  }
                  const numValue = parseFloat(value.replace(',', '.'));
                  if (!isNaN(numValue) && numValue >= 0) {
                    setFormData(prev =>
                      prev
                        ? {
                            ...prev,
                            price: numValue,
                          }
                        : prev
                    );
                  }
                }}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label>Фотографии</Label>
              <Input type="file" accept="image/*" multiple onChange={handleImagesInputChange} />
              <p className="text-xs text-muted-foreground">
                Загрузите одно или несколько фото. Первое изображение будет отображаться в каталоге.
              </p>
              {formData.images && formData.images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {formData.images.map((image, index) => (
                    <div
                      key={`${image}-${index}`}
                      className="relative overflow-hidden rounded-lg border border-border"
                    >
                      <img src={image} alt={`Изображение ${index + 1}`} className="h-32 w-full object-cover" />
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        className="absolute top-2 right-2 h-6 w-6 rounded-full"
                        onClick={() => removeImage(index)}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-medium">Вариации (вкусы)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addVariant}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Добавить вкус
                </Button>
              </div>
              {variants.length > 0 ? (
                <div className="space-y-3 border border-border rounded-lg p-3">
                  {variants.map((variant, index) => (
                    <div key={variant.id} className="space-y-2 p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 space-y-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Название вкуса *</Label>
                            <Input
                              value={variant.name}
                              onChange={e => updateVariant(index, 'name', e.target.value)}
                              placeholder="Например, Клубника"
                              className="text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Количество на складе *</Label>
                            <Input
                              type="text"
                              value={variant.quantity === 0 ? '' : variant.quantity.toString()}
                              onChange={e => {
                                const value = e.target.value.trim();
                                if (value === '') {
                                  updateVariant(index, 'quantity', 0);
                                  return;
                                }
                                const numValue = parseInt(value, 10);
                                if (!isNaN(numValue) && numValue >= 0) {
                                  updateVariant(index, 'quantity', numValue);
                                }
                              }}
                              placeholder="0"
                              className="text-sm"
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Цена: {formData?.price || 0} ₸ (общая для всех вкусов)
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeVariant(index)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-destructive p-3 border border-destructive/50 rounded-lg bg-destructive/5">
                  ⚠️ Необходимо добавить хотя бы одну вариацию (вкус). Товар без вариаций не может быть продан.
                </p>
              )}
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <Label className="font-medium">В наличии</Label>
                <p className="text-sm text-muted-foreground">Если выключить — товар скрыт из каталога</p>
              </div>
              <Switch
                checked={formData.available}
                onCheckedChange={checked =>
                  setFormData(prev => (prev ? { ...prev, available: checked } : prev))
                }
              />
            </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Отмена
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {dialogMode === 'create' ? 'Создать' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </>
  );
};

