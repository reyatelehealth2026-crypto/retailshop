import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import type { ProductCategory } from '@/types/product';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/utils/helpers';

// Category icons mapping
const categoryIcons: Record<string, string> = {
  'ยาและสุขภาพ': '💊',
  'ความงาม': '🧴',
  'เครื่องสำอาง': '💄',
  'แม่และเด็ก': '🍼',
  'อาหารเสริม': '💪',
  'อุปกรณ์การแพทย์': '🏥',
  'ผลิตภัณฑ์อาหาร': '🍎',
  'ของใช้ทั่วไป': '🏠',
};

interface CategoryGridProps {
  categories: ProductCategory[];
  isLoading?: boolean;
  columns?: 4 | 5;
}

export const CategoryGrid = ({
  categories,
  isLoading = false,
  columns = 4,
}: CategoryGridProps) => {
  if (isLoading) {
    return (
      <div className={cn('grid gap-3', columns === 4 ? 'grid-cols-4' : 'grid-cols-5')}>
        {Array.from({ length: columns === 4 ? 8 : 10 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <Skeleton className="w-14 h-14 rounded-xl" variant="default" />
            <Skeleton className="w-12 h-3" variant="text" />
          </div>
        ))}
      </div>
    );
  }

  if (categories.length === 0) {
    return null;
  }

  return (
    <div className={cn('grid gap-3', columns === 4 ? 'grid-cols-4' : 'grid-cols-5')}>
      {categories.map((category, index) => (
        <motion.div
          key={category.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <Link
            to={`/shop?category=${category.id}`}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="w-14 h-14 bg-gradient-to-br from-brand-50 to-brand-100 rounded-xl flex items-center justify-center text-2xl group-hover:from-brand-100 group-hover:to-brand-200 transition-all group-hover:scale-105">
              {category.imageUrl ? (
                <img
                  src={category.imageUrl}
                  alt={category.name}
                  className="w-8 h-8 object-contain"
                />
              ) : (
                categoryIcons[category.name] || '📦'
              )}
            </div>
            <span className="text-xs text-gray-600 text-center line-clamp-1 group-hover:text-brand-600 transition-colors">
              {category.name}
            </span>
          </Link>
        </motion.div>
      ))}
    </div>
  );
};