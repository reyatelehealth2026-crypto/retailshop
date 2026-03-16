import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, TrendingUp } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { ProductGrid } from '@/components/product/ProductGrid';
import { useSearchProducts } from '@/hooks/useProducts';
import { cn } from '@/utils/helpers';

// Popular searches
const popularSearches = [
  'ยาพารา',
  'วิตามิน C',
  'เจลแอลกอฮอล์',
  'หน้ากากอนามัย',
  'ยาแก้ไอ',
  'ยาทาแผลสด',
  'วิตามิน D',
  'โฟมล้างหน้า',
];

// Recent searches (from localStorage)
const getRecentSearches = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem('recent_searches') || '[]');
  } catch {
    return [];
  }
};

const saveRecentSearch = (query: string) => {
  try {
    const searches = getRecentSearches();
    const updated = [query, ...searches.filter((s) => s !== query)].slice(0, 10);
    localStorage.setItem('recent_searches', JSON.stringify(updated));
  } catch {
    // Ignore
  }
};

const clearRecentSearches = () => {
  localStorage.removeItem('recent_searches');
};

export const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const { data: products, isLoading } = useSearchProducts(query, 20);

  // Load recent searches
  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  // Update URL when query changes
  const handleSearch = useCallback(
    (searchQuery: string) => {
      if (searchQuery.trim()) {
        setQuery(searchQuery);
        setSearchParams({ q: searchQuery });
        saveRecentSearch(searchQuery);
        setRecentSearches(getRecentSearches());
      }
    },
    [setSearchParams]
  );

  const handleClearRecent = () => {
    clearRecentSearches();
    setRecentSearches([]);
  };

  const hasSearch = query.trim().length > 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header showSearch={false} />

      <main className="p-4">
        {!hasSearch ? (
          <div className="space-y-6">
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    ค้นหาล่าสุด
                  </h3>
                  <button
                    onClick={handleClearRecent}
                    className="text-sm text-gray-500 hover:text-red-500"
                  >
                    ล้าง
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((term) => (
                    <button
                      key={term}
                      onClick={() => handleSearch(term)}
                      className="flex items-center gap-1 px-3 py-2 bg-white rounded-full text-sm shadow-sm hover:shadow-md transition-shadow"
                    >
                      <Clock className="w-3 h-3 text-gray-400" />
                      {term}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Popular Searches */}
            <section>
              <h3 className="font-medium flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4" />
                ค้นหายอดนิยม
              </h3>
              <div className="flex flex-wrap gap-2">
                {popularSearches.map((term, index) => (
                  <motion.button
                    key={term}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleSearch(term)}
                    className={cn(
                      'px-4 py-2 rounded-full text-sm transition-colors',
                      index < 3
                        ? 'bg-brand-100 text-brand-700 hover:bg-brand-200'
                        : 'bg-white shadow-sm hover:shadow-md'
                    )}
                  >
                    {index < 3 && (
                      <span className="inline-block w-5 h-5 bg-brand-500 text-white text-xs rounded-full text-center leading-5 mr-1">
                        {index + 1}
                      </span>
                    )}
                    {term}
                  </motion.button>
                ))}
              </div>
            </section>

            {/* Categories */}
            <section>
              <h3 className="font-medium mb-3">หมวดหมู่</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { name: 'ยาและสุขภาพ', icon: '💊', color: 'bg-red-50' },
                  { name: 'ความงาม', icon: '🧴', color: 'bg-pink-50' },
                  { name: 'เครื่องสำอาง', icon: '💄', color: 'bg-purple-50' },
                  { name: 'แม่และเด็ก', icon: '🍼', color: 'bg-blue-50' },
                  { name: 'อาหารเสริม', icon: '💪', color: 'bg-green-50' },
                  { name: 'อุปกรณ์การแพทย์', icon: '🏥', color: 'bg-gray-50' },
                ].map((cat) => (
                  <button
                    key={cat.name}
                    onClick={() => handleSearch(cat.name)}
                    className={cn(
                      'flex items-center gap-3 p-4 rounded-xl transition-transform active:scale-95',
                      cat.color
                    )}
                  >
                    <span className="text-2xl">{cat.icon}</span>
                    <span className="font-medium text-sm">{cat.name}</span>
                  </button>
                ))}
              </div>
            </section>
          </div>
        ) : (
          <div>
            {/* Search Results Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">
                ผลลัพธ์สำหรับ "{query}"
              </h2>
              <button
                onClick={() => {
                  setQuery('');
                  setSearchParams({});
                }}
                className="text-sm text-gray-500"
              >
                ล้าง
              </button>
            </div>

            {/* Results */}
            <ProductGrid
              products={products || []}
              isLoading={isLoading}
              emptyMessage={`ไม่พบสินค้าที่ตรงกับ "${query}"`}
            />
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};