import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Bell, ShoppingCart, ArrowLeft, X } from 'lucide-react';
import { useCartStore } from '@/stores/cartStore';

interface HeaderProps {
  showBack?: boolean;
  title?: string;
  showSearch?: boolean;
  showCart?: boolean;
  showNotification?: boolean;
  onBack?: () => void;
}

export const Header = ({
  showBack = false,
  title,
  showSearch = true,
  showCart = true,
  showNotification = true,
  onBack,
}: HeaderProps) => {
  const navigate = useNavigate();
  const { cart } = useCartStore();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 safe-area-top">
        <div className="flex items-center justify-between h-14 px-4">
          {/* Left side */}
          <div className="flex items-center gap-3">
            {showBack ? (
              <button
                onClick={handleBack}
                className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            ) : null}
            
            {title ? (
              <h1 className="text-lg font-semibold">{title}</h1>
            ) : (
              <Link to="/" className="flex items-center">
                <span className="text-xl font-bold text-brand-500">Re-ya</span>
                <span className="ml-1 text-xs bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded">
                  Retail
                </span>
              </Link>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-1">
            {showSearch && (
              <button
                onClick={() => setIsSearchOpen(true)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <Search className="w-5 h-5" />
              </button>
            )}

            {showNotification && (
              <button className="p-2 rounded-full hover:bg-gray-100 transition-colors relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              </button>
            )}

            {showCart && (
              <Link
                to="/cart"
                className="p-2 rounded-full hover:bg-gray-100 transition-colors relative"
              >
                <ShoppingCart className="w-5 h-5" />
                {cart.totalItems > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
                    {cart.totalItems > 99 ? '99+' : cart.totalItems}
                  </span>
                )}
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Search Overlay */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-white"
          >
            <div className="flex items-center gap-2 h-14 px-4 border-b border-gray-100">
              <button
                onClick={() => setIsSearchOpen(false)}
                className="p-2 -ml-2 rounded-full hover:bg-gray-100"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              
              <form onSubmit={handleSearch} className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ค้นหาสินค้า..."
                    className="w-full pl-10 pr-10 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Search suggestions */}
            <div className="p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-3">ค้นหายอดนิยม</h3>
              <div className="flex flex-wrap gap-2">
                {['ยาพารา', 'วิตามิน C', 'เจลแอลกอฮอล์', 'หน้ากากอนามัย', 'ยาแก้ไอ'].map(
                  (term) => (
                    <button
                      key={term}
                      onClick={() => {
                        setSearchQuery(term);
                        navigate(`/search?q=${encodeURIComponent(term)}`);
                        setIsSearchOpen(false);
                      }}
                      className="px-4 py-2 bg-gray-100 rounded-full text-sm hover:bg-gray-200 transition-colors"
                    >
                      {term}
                    </button>
                  )
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};