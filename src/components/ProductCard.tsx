import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';
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

  const currentPrice = selectedVariant?.price || product.price || 0;
  const isAvailable = selectedVariant?.available ?? product.available;

  const handleAddToCart = () => {
    if (isAvailable && !purchasesDisabled) {
      onAddToCart(product.id, selectedVariant?.id, quantity);
      setQuantity(1);
    }
  };

  const increment = () => setQuantity(prev => prev + 1);
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

        {product.variants && product.variants.length > 1 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Вариант:</p>
            <div className="flex flex-wrap gap-2">
              {product.variants.map((variant) => (
                <button
                  key={variant.id}
                  onClick={() => setSelectedVariant(variant)}
                  disabled={!variant.available}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                    selectedVariant?.id === variant.id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-secondary text-secondary-foreground border-border hover:bg-secondary/80'
                  } ${!variant.available ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {variant.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-end justify-between pt-2 gap-2">
          <div className="text-xl font-bold text-foreground">
            {currentPrice} ₽
          </div>

          {isAvailable && !purchasesDisabled ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-secondary rounded-xl px-2 py-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={decrement}
                  className="h-7 w-7"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-6 text-center font-medium">{quantity}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={increment}
                  className="h-7 w-7"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              <Button onClick={handleAddToCart} size="sm" className="px-4">
                В корзину
              </Button>
            </div>
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
