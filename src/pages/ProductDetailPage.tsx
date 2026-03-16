import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Heart, 
  Share2, 
  Star, 
  ShoppingCart, 
  Truck, 
  Shield, 
  RotateCcw,
  ChevronRight,
  Minus,
  Plus
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductCard } from '@/components/product/ProductCard';
import { useProduct, useRelatedProducts } from '@/hooks/useProducts';
import { useCart } from '@/hooks/useCart';
import { useUIStore } from '@/stores/uiStore';
import { formatPrice, calculateDiscount } from '@/utils/helpers';
import { cn } from '@/utils/helpers';

export const ProductDetailPage = () => {
  const { sku } = useParams<{ sku: string }>();
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const { addToast } = useUIStore();
  const { addProduct } = useCart();

  const { data: product, isLoading } = useProduct(sku || '');
  const { data: relatedProducts } = useRelatedProducts(sku || '', 8);

  const handleAddToCart = async () => {
    if (!product) return;
    
    try {
      await addProduct(product, quantity);
      addToast(`เพิ่ม ${product.name} x${quantity} ลงตะกร้าแล้ว`, 'success');
    } catch (error) {
      addToast('ไม่สามารถเพิ่มลงตะกร้าได้', 'error');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product?.name,
          text: product?.description,
          url: window.location.href,
        });
      } catch {
        // User cancelled
      }
    } else {
      // Copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      addToast('คัดลอกลิงก์แล้ว', 'success');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <Header showBack />
        <div className="p-4 space-y-4">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-8 w-1/3" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <h2 className="text-xl font-bold text-gray-900 mb-2">ไม่พบสินค้า</h2>
        <p className="text-gray-500 mb-4">สินค้านี้อาจถูกลบหรือไม่มีอยู่</p>
        <Link to="/shop">
          <Button>กลับไปร้านค้า</Button>
        </Link>
      </div>
    );
  }

  const discount = product.originalPrice
    ? calculateDiscount(product.originalPrice, product.retailPrice)
    : 0;

  const gallery = product.gallery || [product.imageUrl];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header showBack showCart={false} />

      <main className="pb-4">
        {/* Image Gallery */}
        <div className="relative bg-white">
          <div className="aspect-square relative overflow-hidden">
            <motion.img
              key={currentImageIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              src={gallery[currentImageIndex]}
              alt={product.name}
              className="w-full h-full object-cover"
            />

            {/* Badges */}
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              {discount > 0 && (
                <Badge variant="sale" className="text-sm px-3 py-1">
                  ลด {discount}%
                </Badge>
              )}
              {product.isNew && (
                <Badge variant="new" className="text-sm px-3 py-1">
                  ใหม่
                </Badge>
              )}
              {product.isBestseller && (
                <Badge variant="bestseller" className="text-sm px-3 py-1">
                  ขายดี
                </Badge>
              )}
            </div>

            {/* Actions */}
            <div className="absolute top-4 right-4 flex flex-col gap-2">
              <button
                onClick={() => setIsLiked(!isLiked)}
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-colors',
                  isLiked ? 'bg-red-500 text-white' : 'bg-white text-gray-600'
                )}
              >
                <Heart className={cn('w-5 h-5', isLiked && 'fill-current')} />
              </button>
              <button
                onClick={handleShare}
                className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>

            {/* Image dots */}
            {gallery.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {gallery.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={cn(
                      'w-2 h-2 rounded-full transition-all',
                      index === currentImageIndex
                        ? 'bg-white w-4'
                        : 'bg-white/50'
                    )}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Thumbnail strip */}
          {gallery.length > 1 && (
            <div className="flex gap-2 p-4 overflow-x-auto scrollbar-hide">
              {gallery.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={cn(
                    'flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2',
                    index === currentImageIndex
                      ? 'border-brand-500'
                      : 'border-transparent'
                  )}
                >
                  <img
                    src={img}
                    alt={`${product.name} - ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="p-4 space-y-4">
          {/* Category */}
          <Link to={`/shop?category=${product.categoryId}`}>
            <Badge variant="outline" className="text-xs">
              {product.categoryName || 'สินค้าทั่วไป'}
            </Badge>
          </Link>

          {/* Name */}
          <h1 className="text-xl font-bold text-gray-900">{product.name}</h1>

          {/* Rating */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              <span className="font-bold">{product.rating || 4.5}</span>
            </div>
            <span className="text-gray-300">|</span>
            <span className="text-gray-500">
              {product.reviewCount || 0} รีวิว
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-500">
              ขายแล้ว {product.soldCount || 0}
            </span>
          </div>

          {/* Price */}
          <div className="flex items-end gap-3">
            <span className="text-3xl font-bold text-brand-600">
              {formatPrice(product.retailPrice)}
            </span>
            {product.originalPrice && product.originalPrice > product.retailPrice && (
              <>
                <span className="text-lg text-gray-400 line-through">
                  {formatPrice(product.originalPrice)}
                </span>
                <Badge variant="sale">ลด {discount}%</Badge>
              </>
            )}
          </div>

          {/* Stock */}
          {product.stockQty <= 5 && product.stockQty > 0 && (
            <p className="text-red-500 text-sm">
              ⚠️ เหลือ {product.stockQty} ชิ้น
            </p>
          )}
          {product.stockQty <= 0 && (
            <p className="text-red-500 text-sm font-medium">
              ❌ สินค้าหมด
            </p>
          )}

          {/* Promotions */}
          <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl p-4">
            <h3 className="font-medium text-orange-800 mb-2">🎁 โปรโมชั่น</h3>
            <ul className="space-y-1 text-sm text-orange-700">
              <li>• ซื้อ 2 แถม 1 (สินค้าร่วมรายการ)</li>
              <li>• ส่งฟรี ขั้นต่ำ ฿199</li>
              <li>• ใช้โค้ด HEALTH ลดเพิ่ม ฿10</li>
            </ul>
          </div>

          {/* Quantity */}
          <div>
            <h3 className="font-medium mb-2">จำนวน</h3>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-lg disabled:opacity-50"
              >
                <Minus className="w-5 h-5" />
              </button>
              <span className="w-12 text-center text-lg font-medium">{quantity}</span>
              <button
                onClick={() => setQuantity(Math.min(product.maxOrderQty || 99, quantity + 1))}
                disabled={quantity >= (product.maxOrderQty || 99) || quantity >= product.stockQty}
                className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-lg disabled:opacity-50"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="font-medium mb-2">รายละเอียดสินค้า</h3>
            <div className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
              {product.description || 'ไม่มีรายละเอียดเพิ่มเติม'}
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col items-center text-center p-3 bg-gray-50 rounded-lg">
              <Truck className="w-6 h-6 text-brand-500 mb-1" />
              <span className="text-xs text-gray-600">ส่งฟรี</span>
            </div>
            <div className="flex flex-col items-center text-center p-3 bg-gray-50 rounded-lg">
              <Shield className="w-6 h-6 text-brand-500 mb-1" />
              <span className="text-xs text-gray-600">ของแท้</span>
            </div>
            <div className="flex flex-col items-center text-center p-3 bg-gray-50 rounded-lg">
              <RotateCcw className="w-6 h-6 text-brand-500 mb-1" />
              <span className="text-xs text-gray-600">คืนได้</span>
            </div>
          </div>
        </div>

        {/* Reviews */}
        <div className="border-t bg-white p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold">รีวิวจากลูกค้า</h3>
            <button className="flex items-center gap-1 text-sm text-brand-600">
              ดูทั้งหมด
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          
          {/* Sample reviews */}
          <div className="space-y-4">
            {[
              { name: 'สมชาย ส.', rating: 5, text: 'สินค้าดีมาก ส่งไว ของแท้แน่นอน', date: '2 วันที่แล้ว' },
              { name: 'สมหญิง ก.', rating: 5, text: 'ซื้อประจำค่ะ ราคาถูกดี', date: '1 สัปดาห์ที่แล้ว' },
            ].map((review, index) => (
              <div key={index} className="border-b pb-4 last:border-0">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center text-brand-600 font-medium text-sm">
                    {review.name[0]}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{review.name}</p>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: review.rating }).map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                  </div>
                  <span className="ml-auto text-xs text-gray-400">{review.date}</span>
                </div>
                <p className="text-sm text-gray-600">{review.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts && relatedProducts.length > 0 && (
          <div className="border-t bg-white p-4">
            <h3 className="font-bold mb-4">สินค้าที่เกี่ยวข้อง</h3>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
              {relatedProducts.map((product) => (
                <div key={product.sku} className="flex-shrink-0 w-40">
                  <ProductCard product={product} variant="compact" />
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Sticky Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 safe-area-bottom z-40">
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleAddToCart}
            disabled={product.stockQty <= 0}
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            ใส่ตะกร้า
          </Button>
          <Button
            className="flex-1"
            onClick={handleAddToCart}
            disabled={product.stockQty <= 0}
          >
            ซื้อเลย
          </Button>
        </div>
      </div>
    </div>
  );
};