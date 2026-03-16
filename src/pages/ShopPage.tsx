import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SlidersHorizontal, ChevronDown, X } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { ProductGrid } from '@/components/product/ProductGrid';
import { Button } from '@/components/ui/button';
import { useProducts, useCategories } from '@/hooks/useProducts';
import { cn } from '@/utils/helpers';

// Sort options
const sortOptions = [
  { value: 'popular', label: 'ขายดี' },
  { value: 'newest', label: 'ใหม่ล่าสุด' },
  { value: 'price_asc', label: 'ราคาน้อยไปมาก' },
  { value: 'price_desc', label: 'ราคามากไปน้อย' },
  { value: 'rating', label: 'คะแนนรีวิว' },
];

export const ShopPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(
    searchParams.get('category') ? Number(searchParams.get('category')) : null
  );
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'popular');
  const [searchQuery] = useState(searchParams.get('q') || '');

  const { data: categories } = useCategories();
  
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useProducts({
    categoryId: selectedCategory || undefined,
    search: searchQuery || undefined,
    sortBy: sortBy as any,
    page: 1,
    limit: 20,
  });

  // Flatten products from infinite query
  const products = data?.pages.flatMap((page) => page.products) || [];

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedCategory) params.set('category', selectedCategory.toString());
    if (sortBy !== 'popular') params.set('sort', sortBy);
    if (searchQuery) params.set('q', searchQuery);
    setSearchParams(params);
  }, [selectedCategory, sortBy, searchQuery, setSearchParams]);

  const activeFiltersCount = [
    selectedCategory,
    sortBy !== 'popular',
    searchQuery,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header showBack title="ร้านค้า" />

      {/* Category Tabs */}
      <div className="sticky top-14 z-30 bg-white border-b border-gray-100">
        <div className="flex items-center gap-1 px-2 py-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setSelectedCategory(null)}
            className={cn(
              'flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors',
              selectedCategory === null
                ? 'bg-brand-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            ทั้งหมด
          </button>
          {categories?.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                'flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors',
                selectedCategory === cat.id
                  ? 'bg-brand-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        <p className="text-sm text-gray-500">
          {isLoading ? 'กำลังโหลด...' : `${products.length} สินค้า`}
        </p>
        
        <div className="flex items-center gap-2">
          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none bg-gray-100 text-sm px-4 py-2 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          </div>

          {/* Filter Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFilterOpen(true)}
            className="relative"
          >
            <SlidersHorizontal className="w-4 h-4 mr-1" />
            ตัวกรอง
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-500 text-white text-[10px] rounded-full flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Products Grid */}
      <main className="p-4">
        <ProductGrid
          products={products}
          isLoading={isLoading}
          isFetchingNextPage={isFetchingNextPage}
          hasNextPage={hasNextPage}
          fetchNextPage={fetchNextPage}
          emptyMessage={searchQuery ? `ไม่พบสินค้าที่ตรงกับ "${searchQuery}"` : 'ไม่พบสินค้า'}
        />
      </main>

      {/* Filter Drawer */}
      {isFilterOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50"
        >
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsFilterOpen(false)}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute right-0 top-0 bottom-0 w-80 bg-white shadow-xl"
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-bold">ตัวกรอง</h2>
              <button
                onClick={() => setIsFilterOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-6">
              {/* Categories */}
              <div>
                <h3 className="font-medium mb-3">หมวดหมู่</h3>
                <div className="flex flex-wrap gap-2">
                  {categories?.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() =>
                        setSelectedCategory(
                          selectedCategory === cat.id ? null : cat.id
                        )
                      }
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm transition-colors',
                        selectedCategory === cat.id
                          ? 'bg-brand-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      )}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div>
                <h3 className="font-medium mb-3">ช่วงราคา</h3>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="ต่ำสุด"
                    className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <span className="self-center">-</span>
                  <input
                    type="number"
                    placeholder="สูงสุด"
                    className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              {/* Rating */}
              <div>
                <h3 className="font-medium mb-3">คะแนน</h3>
                <div className="space-y-2">
                  {[4, 3, 2, 1].map((rating) => (
                    <label key={rating} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="rounded text-brand-500" />
                      <span className="text-sm">{rating} ดาวขึ้นไป</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => {
                    setSelectedCategory(null);
                    setSortBy('popular');
                  }}
                >
                  รีเซ็ต
                </Button>
                <Button fullWidth onClick={() => setIsFilterOpen(false)}>
                  แสดงผล
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      <BottomNav />
    </div>
  );
};