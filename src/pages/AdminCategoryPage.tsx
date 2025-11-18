import { ChangeEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  hideBackButton,
  showAlert,
  showBackButton,
  showPopup,
} from '@/lib/telegram';
import type { Category, Product, ProductPayload } from '@/types/api';
import { Seo } from '@/components/Seo';

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>('create');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductPayload | null>(null);

  useEffect(() => {
    showBackButton(() => navigate('/admin/catalog'));
    return () => hideBackButton();
  }, [navigate]);

  useEffect(() => {
    loadCategory();
  }, [categoryId]);

  const loadCategory = async () => {
    if (!categoryId) {
      navigate('/admin/catalog');
      return;
    }
    setLoading(true);
    try {
      const data = await api.getAdminCatalog();
      const current = data.categories.find(cat => cat.id === categoryId);
      if (!current) {
        showAlert('Категория не найдена');
        navigate('/admin/catalog');
        return;
      }
      setCategory(current);
      setProducts(data.products.filter(product => product.category_id === categoryId));
      setFormData(createEmptyProduct(categoryId));
    } catch (error) {
      showAlert('Не удалось загрузить категорию');
      navigate('/admin/catalog');
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    if (!categoryId) return;
    setDialogMode('create');
    setSelectedProduct(null);
    setFormData(createEmptyProduct(categoryId));
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
          showAlert('Товар удалён');
          await loadCategory();
        } catch {
          showAlert('Не удалось удалить товар');
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
      showAlert('Не удалось загрузить изображения');
      console.error(error);
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

  const handleSubmit = async () => {
    if (!formData || !category) return;
    if (!formData.name || !formData.price) {
      showAlert('Заполните обязательные поля');
      return;
    }

    const payload: ProductPayload = {
      ...formData,
      category_id: category.id,
      image: formData.images?.[0] || formData.image || '',
      images: formData.images,
    };

    setSaving(true);
    try {
      if (dialogMode === 'create') {
        await api.createProduct(payload);
        showAlert('Товар создан');
      } else if (selectedProduct) {
        await api.updateProduct(selectedProduct.id, payload);
        showAlert('Товар обновлён');
      }
      setDialogOpen(false);
      await loadCategory();
    } catch (error) {
      showAlert('Ошибка сохранения товара');
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

  if (loading || !category || !formData) {
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
                  className="p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-foreground">{product.name}</p>
                    {product.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {product.description}
                      </p>
                    )}
                    <div className="text-sm text-muted-foreground mt-2 flex flex-wrap gap-3">
                      <span>
                        Цена:{' '}
                        <span className="text-foreground font-medium">{product.price ?? 0} ₽</span>
                      </span>
                      <span>
                        Статус:{' '}
                        <span className="text-foreground font-medium">
                          {product.available ? 'В наличии' : 'Нет в наличии'}
                        </span>
                      </span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
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
              ))
            )}
          </div>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogMode === 'create' ? 'Новый товар' : 'Редактирование товара'}</DialogTitle>
            <DialogDescription>Заполните информацию о товаре и сохраните изменения.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
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
                rows={3}
                placeholder="Краткое описание товара"
              />
            </div>

            <div className="space-y-2">
              <Label>Цена (₽)</Label>
              <Input
                type="number"
                min={0}
                value={formData.price}
                onChange={event =>
                  setFormData(prev =>
                    prev
                      ? {
                          ...prev,
                          price: Number(event.target.value),
                        }
                      : prev
                  )
                }
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

          <DialogFooter>
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

