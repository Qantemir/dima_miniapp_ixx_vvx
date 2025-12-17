import { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Minus } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { HoverScale } from '@/components/animations';
import type { Product, ProductVariant } from '@/types/api';

interface ProductCardProps {
  product: Product;
  onAddToCart: (
    productId: string,
    variantId: string | undefined,
    quantity: number
  ) => void;
  purchasesDisabled?: boolean;
  isAdding?: boolean;
}

export const ProductCard = ({
  product,
  onAddToCart,
  purchasesDisabled = false,
  isAdding = false,
}: ProductCardProps) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    product.variants?.[0] || null
  );

  const hasVariants = product.variants && product.variants.length > 0;
  const mustSelectVariant = !selectedVariant;
  const displayImage = product.images?.[0] ?? product.image;
  
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

  return (
    <HoverScale>
      <Card className="w-full overflow-hidden border-border bg-card rounded-2xl shadow-sm h-full transition-shadow hover:shadow-md">
        {displayImage && (
          <motion.div 
            className="aspect-[3/2] w-full overflow-hidden bg-muted"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.3 }}
          >
            <img
              src={displayImage}
              alt={product.name}
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
              fetchPriority="low"
            />
          </motion.div>
        )}
      
      <div className="p-3 sm:p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-sm sm:text-base text-foreground leading-tight line-clamp-1">{product.name}</h3>
          {product.description && (
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
              {product.description}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Вкус *:</p>
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
                    className={`px-3 py-2 text-xs sm:text-sm rounded-lg border transition-all min-h-[36px] flex items-center justify-center ${
                      selectedVariant?.id === variant.id
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-secondary text-secondary-foreground border-border hover:bg-secondary/80 active:scale-95'
                    } ${!variant.available || isOutOfStock ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <span className="font-medium">{variant.name}</span>
                    {variantQuantity > 0 && (
                      <span className="ml-1.5 text-xs opacity-75">
                        ({variantQuantity})
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {mustSelectVariant && (
              <p className="text-xs text-destructive mt-1">Выберите вкус</p>
            )}
          </div>

        <div className="flex items-center justify-between pt-1 gap-2.5">
          <div className="text-lg sm:text-xl font-bold text-foreground">
            {currentPrice} ₸
          </div>

          {isAvailable && !purchasesDisabled && selectedVariant ? (
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center gap-0.5 bg-secondary rounded-lg px-1.5 py-1 border border-border/50">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={decrement}
                  className="h-7 w-7 sm:h-8 sm:w-8 rounded-md"
                  disabled={quantity <= 1}
                >
                  <Minus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
                <span className="w-7 sm:w-8 text-center font-semibold text-xs sm:text-sm">{quantity}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={increment}
                  className="h-7 w-7 sm:h-8 sm:w-8 rounded-md"
                  disabled={hasVariants && quantity >= availableQuantity}
                >
                  <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </div>
              
              <Button 
                onClick={handleAddToCart} 
                size="sm" 
                className="px-3 sm:px-4 text-xs sm:text-sm font-medium h-9 sm:h-10 shadow-sm min-w-[90px] sm:min-w-[100px]"
                disabled={quantity > availableQuantity || isAdding}
              >
                {isAdding ? 'Добавление...' : 'В корзину'}
              </Button>
            </div>
          ) : mustSelectVariant ? (
            <span className="text-sm text-destructive font-medium">
              Выберите вкус
            </span>
          ) : isAvailable && purchasesDisabled ? (
            <span className="text-sm text-muted-foreground text-right">
              Магазин временно не принимает заказы
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">Нет в наличии</span>
          )}
        </div>
      </div>
    </Card>
    </HoverScale>
  );
};

// Мемоизация компонента для предотвращения лишних ререндеров
export const MemoizedProductCard = memo(ProductCard, (prevProps, nextProps) => {
  return (
    prevProps.product.id === nextProps.product.id &&
    prevProps.product.available === nextProps.product.available &&
    prevProps.purchasesDisabled === nextProps.purchasesDisabled &&
    prevProps.isAdding === nextProps.isAdding
  );
});
