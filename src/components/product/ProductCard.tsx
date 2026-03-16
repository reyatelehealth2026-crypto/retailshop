import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Star, TrendingUp, Sparkles, Flame } from 'lucide-react';
import type { Product } from '@/types/product';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatPrice, calculateDiscount, truncateText } from '@/utils/helpers';
import { useCart } from '@/hooks/useCart';
import { useUIStore } from '@/stores/uiStore';

interface ProductCardProps {
  product: Product;
  variant?: 'default' | 'compact' | 'horizontal';
  showBadge?: boolean;
}

export const ProductCard = ({ 
  product, 
  variant = 'default',
  showBadge = true 
}: ProductCardProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const { addProduct, isInCart } = useCart();
  const { addToast } = useUIStore();

  const discount = product.originalPrice 
    ? calculateDiscount(product.originalPrice, product.retailPrice)
    : 0;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isAdding) return;
    
    setIsAdding(true);
    try {
      await addProduct(product, 1);
      addToast(`เพิ่ม ${product.name} ลงตะกร้าแล้ว`, 'success');
    } catch (error) {
      addToast('ไม่สามารถเพิ่มลงตะกร้าได้', 'error');
    } finally {
      setIsAdding(false);
    }
  };

  // Get badge based on product status
  const getBadge = () => {
    if (!showBadge) return null;
    
    if (discount >= 20) {
      return (
        <Badge variant="sale" className="absolute top-2 left-2 z-10 flex items-center gap-1">
          <Flame className="w-3 h-3" />
          ลด {discount}%
        </Badge>
      );
    }
    if (product.isNew) {
      return (
        <Badge variant="new" className="absolute top-2 left-2 z-10 flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          ใหม่
        </Badge>
      );
    }
    if (product.isBestseller) {
      return (
        <Badge variant="bestseller" className="absolute top-2 left-2 z-10 flex items-center gap-1">
          <TrendingUp className="w-3 h-3" />
          ขายดี
        </Badge>
      );
    }
    return null;
  };

  // Compact variant
  if (variant === 'compact') {
    return (
      <motion.div
        whileTap={{ scale: 0.98 }}
        className="group relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
      >
        <a href={`/product/${product.sku}`} className="block">
          {/* Image */}
          <div className="relative aspect-square bg-gray-100 overflow-hidden">
            {!imageLoaded && (
              <div className="absolute inset-0 bg-gray-200 animate-pulse" />
            )}
            <img
              src={product.imageUrl || '/placeholder-product.png'}
              alt={product.name}
              className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => setImageLoaded(true)}
              loading="lazy"
            />
            {getBadge()}
          </div>

          {/* Content */}
          <div className="p-2">
            <h3 className="text-sm font-medium text-gray-900 line-clamp-2 min-h-[2.5rem]">
              {product.name}
            </h3>
            
            <div className="mt-1 flex items-center gap-1">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              <span className="text-xs text-gray-600">
                {product.rating || 4.5}
              </span>
              <span className="text-xs text-gray-400">
                ({formatNumber(product.reviewCount || 0)})
              </span>
            </div>

            <div className="mt-1 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-brand-600">
                  {formatPrice(product.retailPrice)}
                </span>
                {product.originalPrice && product.originalPrice > product.retailPrice && (
                  <span className="text-xs text-gray-400 line-through">
                    {formatPrice(product.originalPrice)}
                  </span>
                )}
              </div>
              
              <Button
                size="icon-sm"
                variant="default"
                onClick={handleAddToCart}
                isLoading={isAdding}
                className="rounded-full"
              >
                <ShoppingCart className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </a>
      </motion.div>
    );
  }

  // Horizontal variant
  if (variant === 'horizontal') {
    return (
      <motion.div
        whileTap={{ scale: 0.98 }}
        className="group flex gap-3 bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow"
      >
        <a href={`/product/${product.sku}`} className="block flex-shrink-0">
          <div className="relative w-24 h-24 bg-gray-100 rounded-lg overflow-hidden">
            {!imageLoaded && (
              <div className="absolute inset-0 bg-gray-200 animate-pulse" />
            )}
            <img
              src={product.imageUrl || '/placeholder-product.png'}
              alt={product.name}
              className={`w-full h-full object-cover ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => setImageLoaded(true)}
              loading="lazy"
            />
            {discount > 0 && (
              <Badge variant="sale" className="absolute top-1 left-1 text-[10px] px-1.5">
                -{discount}%
              </Badge>
            )}
          </div>
        </a>

        <div className="flex-1 min-w-0">
          <a href={`/product/${product.sku}`}>
            <h3 className="font-medium text-gray-900 line-clamp-2">
              {product.name}
            </h3>
          </a>
          
          <div className="mt-1 flex items-center gap-1">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            <span className="text-xs text-gray-600">{product.rating || 4.5}</span>
            <span className="text-xs text-gray-400">|</span>
            <span className="text-xs text-gray-400">ขายแล้ว {formatNumber(product.soldCount || 0)}</span>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-brand-600">
                {formatPrice(product.retailPrice)}
              </span>
              {product.originalPrice && product.originalPrice > product.retailPrice && (
                <span className="text-sm text-gray-400 line-through">
                  {formatPrice(product.originalPrice)}
                </span>
              )}
            </div>
            
            <Button
              size="sm"
              variant="default"
              onClick={handleAddToCart}
              isLoading={isAdding}
            >
              <ShoppingCart className="w-4 h-4 mr-1" />
              เพิ่ม
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Default variant
  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      className="group relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300"
    >
      <a href={`/product/${product.sku}`} className="block">
        {/* Image Container */}
        <div className="relative aspect-square bg-gray-100 overflow-hidden">
          {!imageLoaded && (
            <div className="absolute inset-0 bg-gray-200 animate-pulse" />
          )}
          <img
            src={product.imageUrl || '/placeholder-product.png'}
            alt={product.name}
            className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImageLoaded(true)}
            loading="lazy"
          />
          
          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {getBadge()}
          </div>

          {/* Stock indicator */}
          {product.stockQty <= 5 && product.stockQty > 0 && (
            <div className="absolute bottom-2 left-2 right-2">
              <div className="bg-red-500/90 text-white text-xs py-1 px-2 rounded-full text-center">
                เหลือ {product.stockQty} ชิ้น
              </div>
            </div>
          )}

          {/* Out of stock overlay */}
          {product.stockQty <= 0 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="bg-gray-800 text-white px-4 py-2 rounded-full text-sm font-medium">
                สินค้าหมด
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3">
          {/* Category */}
          <p className="text-xs text-gray-500 mb-1">{product.categoryName || 'สินค้าทั่วไป'}</p>
          
          {/* Name */}
          <h3 className="font-medium text-gray-900 line-clamp-2 min-h-[2.75rem] group-hover:text-brand-600 transition-colors">
            {truncateText(product.name, 60)}
          </h3>
          
          {/* Rating */}
          <div className="mt-2 flex items-center gap-2">
            <div className="flex items-center gap-0.5">
              <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
              <span className="text-sm text-gray-700 font-medium">{product.rating || 4.5}</span>
            </div>
            <span className="text-gray-300">|</span>
            <span className="text-xs text-gray-500">
              ขายแล้ว {formatNumber(product.soldCount || 0)}
            </span>
          </div>

          {/* Price */}
          <div className="mt-2 flex items-end gap-2">
            <span className="text-lg font-bold text-brand-600">
              {formatPrice(product.retailPrice)}
            </span>
            {product.originalPrice && product.originalPrice > product.retailPrice && (
              <>
                <span className="text-sm text-gray-400 line-through">
                  {formatPrice(product.originalPrice)}
                </span>
                <Badge variant="sale" className="text-[10px]">
                  -{discount}%
                </Badge>
              </>
            )}
          </div>

          {/* Add to cart button */}
          <Button
            variant="default"
            fullWidth
            className="mt-3"
            onClick={handleAddToCart}
            isLoading={isAdding}
            disabled={product.stockQty <= 0}
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            {isInCart(product.sku) ? 'เพิ่มอีก' : 'ใส่ตะกร้า'}
          </Button>
        </div>
      </a>
    </motion.div>
  );
};

// Helper function
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return num.toString();
}