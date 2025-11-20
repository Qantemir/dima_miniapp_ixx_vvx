import { useState } from 'react';
import { Plus, Minus } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { Product, ProductVariant } from '@/types/api';

interface ProductCardProps {
  product: Product;
  onAddToCart: (
    productId: string,
    variantId: string | undefined,
    quantity: number
  ) => void;
  purchasesDisabled?: boolean;
}

export const ProductCard = ({
  product,
  onAddToCart,
  purchasesDisabled = false,
}: ProductCardProps) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    product.variants?.[0] || null
  );

  const hasVariants = product.variants && product.variants.length > 0;
  const mustSelectVariant = !selectedVariant;
  
  // Товар без вариаций не может быть продан
  if (!hasVariants) {
    return (
      <Card className="w-full overflow-hidden border-border bg-card rounded-2xl shadow-sm h-full opacity-60">
        {displayImage && (
          <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
            <img
              src={displayImage}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          </div>
        )}
        <div className="p-3 space-y-3">
          <div>
            <h3 className="font-semibold text-foreground">{product.name}</h3>
            {product.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {product.description}
              </p>
            )}
          </div>
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">Товар недоступен</p>
            <p className="text-xs text-muted-foreground mt-1">Нет доступных вариаций</p>
          </div>
        </div>
      </Card>
    );
  }
  
  const currentPrice = product.price || 0; // Используем цену товара
  const isAvailable = selectedVariant?.available ?? product.available;
  const availableQuantity = selectedVariant?.quantity ?? 0;

  const handleAddToCart = () => {
    if (mustSelectVariant) {
      return;
    }
    if (hasVariants && availableQuantity < quantity) {
      return;
    }
    if (isAvailable && !purchasesDisabled) {
      onAddToCart(product.id, selectedVariant?.id, quantity);
      setQuantity(1);
    }
  };

  const increment = () => {
    if (selectedVariant && availableQuantity > quantity) {
      setQuantity(prev => Math.min(prev + 1, availableQuantity));
    } else if (!selectedVariant) {
      setQuantity(prev => prev + 1);
    }
  };
  const decrement = () => setQuantity(prev => Math.max(1, prev - 1));

  const displayImage = product.images?.[0] ?? product.image;

  return (
    <Card className="w-full overflow-hidden border-border bg-card rounded-2xl shadow-sm h-full">
      {displayImage && (
        <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
          <img
            src={displayImage}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        </div>
      )}
      
      <div className="p-3 space-y-3">
        <div>
          <h3 className="font-semibold text-foreground">{product.name}</h3>
          {product.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {product.description}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Вкус *:</p>
            <div className="flex flex-wrap gap-2">
              {product.variants.map((variant) => {
                const variantQuantity = variant.quantity ?? 0;
                const isOutOfStock = variantQuantity === 0;
                return (
                  <button
                    key={variant.id}
                    onClick={() => {
                      setSelectedVariant(variant);
                      setQuantity(1);
                    }}
                    disabled={!variant.available || isOutOfStock}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors relative ${
                      selectedVariant?.id === variant.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-secondary text-secondary-foreground border-border hover:bg-secondary/80'
                    } ${!variant.available || isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {variant.name}
                    {variantQuantity > 0 && (
                      <span className="ml-1 text-xs opacity-75">
                        ({variantQuantity})
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {mustSelectVariant && (
              <p className="text-xs text-destructive">Выберите вкус</p>
            )}
          </div>

        <div className="flex items-end justify-between pt-2 gap-2">
          <div className="text-xl font-bold text-foreground">
            {currentPrice} ₸
          </div>

          {isAvailable && !purchasesDisabled && selectedVariant ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-secondary rounded-xl px-2 py-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={decrement}
                  className="h-7 w-7"
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-6 text-center font-medium">{quantity}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={increment}
                  className="h-7 w-7"
                  disabled={hasVariants && quantity >= availableQuantity}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              <Button 
                onClick={handleAddToCart} 
                size="sm" 
                className="px-4"
                disabled={quantity > availableQuantity}
              >
                В корзину
              </Button>
            </div>
          ) : mustSelectVariant ? (
            <span className="text-sm text-destructive font-medium">
              Выберите вкус
            </span>
          ) : isAvailable && purchasesDisabled ? (
            <span className="text-sm text-muted-foreground">
              Магазин временно не принимает заказы
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">Нет в наличии</span>
          )}
        </div>
      </div>
    </Card>
  );
};
