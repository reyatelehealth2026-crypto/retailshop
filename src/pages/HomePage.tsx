import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Flame, TrendingUp, Sparkles, Zap } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { BannerCarousel } from '@/components/home/BannerCarousel';
import { CategoryGrid } from '@/components/home/CategoryGrid';
import { ProductCard } from '@/components/product/ProductCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCategories } from '@/hooks/useProducts';
import { useFeaturedProducts, useNewProducts, useBestsellerProducts, useFlashSaleProducts } from '@/hooks/useProducts';
import { useCartStore } from '@/stores/cartStore';

// Mock banners data
const banners = [
  {
    id: 1,
    title: '🎉 FLASH SALE',
    subtitle: 'ลดสูงสุด 50% ถึงวันที่ 31 มี.ค.',
    bgColor: 'bg-gradient-to-r from-red-500 to-pink-500',
    link: '/shop?flash_sale=true',
  },
  {
    id: 2,
    title: '💊 ยาและสุขภาพ',
    subtitle: 'สินค้าดีมีคุณภาพ ราคาพิเศษ',
    bgColor: 'bg-gradient-to-r from-brand-500 to-teal-400',
    link: '/shop?category=1',
  },
  {
    id: 3,
    title: '🆕 สมาชิกใหม่',
    subtitle: 'ใช้โค้ด FIRST ลดเพิ่ม ฿100',
    bgColor: 'bg-gradient-to-r from-orange-500 to-yellow-500',
    link: '/shop',
  },
];

// Flash Sale Countdown Component
const FlashSaleHeader = ({ endTime }: { endTime: Date }) => {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = endTime.getTime() - now;

      if (distance > 0) {
        setTimeLeft({
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000),
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime]);

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {Object.entries(timeLeft).map(([unit, value]) => (
          <div
            key={unit}
            className="w-7 h-7 bg-gray-900 text-white rounded flex items-center justify-center text-xs font-bold"
          >
            {String(value).padStart(2, '0')}
          </div>
        ))}
      </div>
    </div>
  );
};

// Section Header Component
const SectionHeader = ({
  title,
  icon: Icon,
  actionText,
  actionLink,
  badge,
}: {
  title: string;
  icon?: React.ElementType;
  actionText?: string;
  actionLink?: string;
  badge?: React.ReactNode;
}) => (
  <div className="flex items-center justify-between mb-3">
    <div className="flex items-center gap-2">
      {Icon && <Icon className="w-5 h-5 text-brand-500" />}
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      {badge}
    </div>
    {actionText && actionLink && (
      <Link
        to={actionLink}
        className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700"
      >
        {actionText}
        <ChevronRight className="w-4 h-4" />
      </Link>
    )}
  </div>
);

// Product Section Component
const ProductSection = ({
  title,
  icon,
  products,
  isLoading,
  actionLink,
  actionText = 'ดูทั้งหมด',
}: {
  title: string;
  icon?: React.ElementType;
  products: any[];
  isLoading: boolean;
  actionLink?: string;
  actionText?: string;
}) => {
  if (!isLoading && products.length === 0) return null;

  return (
    <section className="py-4">
      <div className="px-4">
        <SectionHeader
          title={title}
          icon={icon}
          actionText={actionLink ? actionText : undefined}
          actionLink={actionLink}
        />
      </div>

      {isLoading ? (
        <div className="px-4">
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-3 shadow-sm">
                <Skeleton className="aspect-square w-full rounded-lg" />
                <div className="mt-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="px-4">
          <div className="grid grid-cols-2 gap-3">
            {products.slice(0, 4).map((product) => (
              <ProductCard key={product.sku} product={product} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export const HomePage = () => {
  const { fetchCart } = useCartStore();

  // Fetch data
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { data: featuredProducts, isLoading: featuredLoading } = useFeaturedProducts(8);
  const { data: newProducts, isLoading: newLoading } = useNewProducts(8);
  const { data: bestsellerProducts, isLoading: bestsellerLoading } = useBestsellerProducts(8);
  const { data: flashSaleProducts } = useFlashSaleProducts();

  // Fetch cart on mount
  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header />

      <main className="space-y-2">
        {/* Banner Carousel */}
        <section className="px-4 pt-4">
          <BannerCarousel banners={banners} />
        </section>

        {/* Categories */}
        <section className="px-4 py-4">
          <SectionHeader title="หมวดหมู่สินค้า" icon={Zap} />
          <CategoryGrid
            categories={categories || []}
            isLoading={categoriesLoading}
            columns={4}
          />
        </section>

        {/* Flash Sale */}
        {flashSaleProducts && flashSaleProducts.length > 0 && (
          <section className="bg-gradient-to-r from-red-50 to-pink-50 py-4">
            <div className="px-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-red-500" />
                  <h2 className="text-lg font-bold text-gray-900">FLASH SALE</h2>
                  <Badge variant="hot" className="text-[10px]">ถึง 23:59</Badge>
                </div>
                <FlashSaleHeader endTime={new Date(Date.now() + 3600000 * 4)} />
              </div>
            </div>

            <div className="overflow-x-auto scrollbar-hide">
              <div className="flex gap-3 px-4 pb-2">
                {flashSaleProducts.slice(0, 6).map((product) => (
                  <div key={product.sku} className="flex-shrink-0 w-36">
                    <ProductCard product={product} variant="compact" />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Bestsellers */}
        <ProductSection
          title="สินค้าขายดี"
          icon={TrendingUp}
          products={bestsellerProducts || []}
          isLoading={bestsellerLoading}
          actionLink="/shop?sort=popular"
        />

        {/* New Arrivals */}
        <ProductSection
          title="สินค้าใหม่"
          icon={Sparkles}
          products={newProducts || []}
          isLoading={newLoading}
          actionLink="/shop?sort=newest"
        />

        {/* Featured Products */}
        <ProductSection
          title="สินค้าแนะนำ"
          icon={Zap}
          products={featuredProducts || []}
          isLoading={featuredLoading}
          actionLink="/shop?featured=true"
        />

        {/* Promo Banner */}
        <section className="px-4 py-4">
          <div className="bg-gradient-to-r from-brand-500 to-teal-400 rounded-xl p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">🎁 โปรโมชั่นพิเศษ</h3>
                <p className="text-sm opacity-90 mt-1">ใช้โค้ด FIRST ลด ฿100</p>
                <p className="text-xs opacity-75">สำหรับออเดอร์แรก</p>
              </div>
              <Button variant="white" size="sm">
                ใช้เลย
              </Button>
            </div>
          </div>
        </section>

        {/* All Products CTA */}
        <section className="px-4 py-4">
          <Link to="/shop">
            <Button fullWidth size="lg" className="gap-2">
              ดูสินค้าทั้งหมด
              <ChevronRight className="w-5 h-5" />
            </Button>
          </Link>
        </section>
      </main>

      <BottomNav />
    </div>
  );
};