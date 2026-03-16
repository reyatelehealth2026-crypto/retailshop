import { useEffect, useRef, useCallback } from 'react';
import type { Product } from '@/types/product';
import { ProductCard } from './ProductCard';
import { ProductListSkeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Loader2, PackageX } from 'lucide-react';

interface ProductGridProps {
  products: Product[];
  isLoading?: boolean;
  isFetchingNextPage?: boolean;
  hasNextPage?: boolean;
  fetchNextPage?: () => void;
  emptyMessage?: string;
  columns?: 1 | 2 | 3;
}

export const ProductGrid = ({
  products,
  isLoading = false,
  isFetchingNextPage = false,
  hasNextPage = false,
  fetchNextPage,
  emptyMessage = 'ไม่พบสินค้า',
  columns = 2,
}: ProductGridProps) => {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Infinite scroll observer
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && hasNextPage && !isFetchingNextPage && fetchNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;

    observerRef.current = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: '100px',
      threshold: 0.1,
    });

    observerRef.current.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleObserver]);

  // Loading state
  if (isLoading) {
    return <ProductListSkeleton count={8} />;
  }

  // Empty state
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <PackageX className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">{emptyMessage}</h3>
        <p className="text-sm text-gray-500">ลองค้นหาด้วยคำอื่นหรือดูหมวดหมู่อื่น</p>
      </div>
    );
  }

  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
  };

  return (
    <div className="space-y-4">
      <div className={`grid ${gridCols[columns]} gap-3`}>
        {products.map((product, index) => (
          <ProductCard
            key={`${product.sku}-${index}`}
            product={product}
            variant={columns === 1 ? 'horizontal' : 'default'}
          />
        ))}
      </div>

      {/* Load more trigger */}
      {(hasNextPage || isFetchingNextPage) && (
        <div ref={loadMoreRef} className="py-4 flex justify-center">
          {isFetchingNextPage ? (
            <Button variant="ghost" disabled>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              กำลังโหลด...
            </Button>
          ) : hasNextPage ? (
            <Button variant="outline" onClick={fetchNextPage}>
              โหลดเพิ่มเติม
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
};