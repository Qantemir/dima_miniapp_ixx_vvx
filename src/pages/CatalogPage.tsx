import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Package, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/ProductCard';
import { CartDialog } from '@/components/CartDialog';
import { api } from '@/lib/api';
import { getUserId, showAlert, showPopup } from '@/lib/telegram';
import type { Category, Product } from '@/types/api';
import { Skeleton } from '@/components/ui/skeleton';

export const CatalogPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cartItemsCount, setCartItemsCount] = useState(0);
  const [cartDialogOpen, setCartDialogOpen] = useState(false);

  useEffect(() => {
    loadCatalog();
    loadCartCount();
  }, []);

  const loadCatalog = async () => {
    try {
      const data = await api.getCatalog();
      setCategories(data.categories);
      setProducts(data.products);
    } catch (error) {
      showAlert('Ошибка загрузки каталога');
    } finally {
      setLoading(false);
    }
  };

  const loadCartCount = async () => {
    const userId = getUserId();
    if (!userId) return;

    try {
      const cart = await api.getCart(userId);
      setCartItemsCount(cart.items.length);
    } catch (error) {
      // Cart might be empty
    }
  };

  const handleAddToCart = async (
    productId: string,
    variantId: string | undefined,
    quantity: number
  ) => {
    const userId = getUserId();
    if (!userId) {
      showAlert('Ошибка: не удалось определить пользователя');
      return;
    }

    try {
      await api.addToCart({
        user_id: userId,
        product_id: productId,
        variant_id: variantId,
        quantity,
      });
      await loadCartCount();
      showAlert('Товар добавлен в корзину');
    } catch (error) {
      showAlert('Ошибка при добавлении в корзину');
    }
  };

  const handleHelp = () => {
    showPopup({
      title: 'Помощь',
      message: 'По всем вопросам обращайтесь в поддержку через бота или напишите администратору.',
      buttons: [{ type: 'ok', text: 'Понятно' }]
    });
  };

  const filteredProducts = selectedCategory
    ? products.filter(p => p.category_id === selectedCategory)
    : products;

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-4">
        <Skeleton className="h-12 w-full" />
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-10 w-24 flex-shrink-0" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-80 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Магазин</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleHelp}
            >
              <HelpCircle className="h-6 w-6" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCartDialogOpen(true)}
              className="relative"
            >
              <ShoppingCart className="h-7 w-7" />
              {cartItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                  {cartItemsCount}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div className="p-4 border-b border-border bg-card">
          <div className="flex gap-2 overflow-x-auto pb-2">
            <Button
              variant={selectedCategory === null ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(null)}
              className="flex-shrink-0"
            >
              Все
            </Button>
            {categories.map(category => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(category.id)}
                className="flex-shrink-0"
              >
                {category.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Products */}
      <div className="p-4">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Товары не найдены</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredProducts.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        )}
      </div>

      {/* Cart Dialog */}
      <CartDialog 
        open={cartDialogOpen} 
        onOpenChange={setCartDialogOpen}
        onCartUpdate={loadCartCount}
      />
    </div>
  );
};
