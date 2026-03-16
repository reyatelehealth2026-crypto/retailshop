import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Store, ShoppingCart, ClipboardList, User } from 'lucide-react';
import { useCartStore } from '@/stores/cartStore';
import { cn } from '@/utils/helpers';

const navItems = [
  { path: '/', icon: Home, label: 'หน้าหลัก' },
  { path: '/shop', icon: Store, label: 'ร้านค้า' },
  { path: '/cart', icon: ShoppingCart, label: 'ตะกร้า', showBadge: true },
  { path: '/orders', icon: ClipboardList, label: 'ออเดอร์' },
  { path: '/profile', icon: User, label: 'โปรไฟล์' },
];

export const BottomNav = () => {
  const location = useLocation();
  const { cart } = useCartStore();
  const [pressedIndex, setPressedIndex] = useState<number | null>(null);

  const cartItemCount = cart.totalItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item, index) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className="relative flex-1"
              onTouchStart={() => setPressedIndex(index)}
              onTouchEnd={() => setPressedIndex(null)}
              onMouseDown={() => setPressedIndex(index)}
              onMouseUp={() => setPressedIndex(null)}
              onMouseLeave={() => setPressedIndex(null)}
            >
              <motion.div
                className={cn(
                  'flex flex-col items-center justify-center py-2 transition-colors',
                  isActive ? 'text-brand-500' : 'text-gray-400'
                )}
                animate={{
                  scale: pressedIndex === index ? 0.9 : 1,
                }}
                transition={{ duration: 0.1 }}
              >
                <div className="relative">
                  <Icon
                    className={cn(
                      'w-6 h-6 transition-all',
                      isActive && 'stroke-[2.5px]'
                    )}
                  />
                  
                  {/* Cart badge */}
                  {item.showBadge && cartItemCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={cn(
                        'absolute -top-2 -right-2 min-w-[18px] h-[18px] flex items-center justify-center',
                        'bg-red-500 text-white text-[10px] font-bold rounded-full px-1'
                      )}
                    >
                      {cartItemCount > 99 ? '99+' : cartItemCount}
                    </motion.span>
                  )}

                  {/* Active indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-brand-500 rounded-full"
                    />
                  )}
                </div>
                
                <span
                  className={cn(
                    'text-[10px] mt-1 font-medium transition-colors',
                    isActive ? 'text-brand-500' : 'text-gray-400'
                  )}
                >
                  {item.label}
                </span>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};