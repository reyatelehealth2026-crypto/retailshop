import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trash2, 
  Minus, 
  Plus, 
  ShoppingBag, 
  Tag,
  X,
  Check
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/hooks/useCart';
import { useUIStore } from '@/stores/uiStore';
import { formatPrice } from '@/utils/helpers';
import { cn } from '@/utils/helpers';

// Mock coupons
const availableCoupons = [
  { code: 'FIRST', discount: 100, description: 'สำหรับออเดอร์แรก', minOrder: 0 },
  { code: 'HEALTH', discount: 50, description: 'สินค้าสุขภาพ', minOrder: 299 },
  { code: 'SAVE100', discount: 100, description: 'ลด 100 บาท', minOrder: 499 },
];

export const CartPage = () => {
  const navigate = useNavigate();
  const { cart, updateQuantity, removeItem, clearCart } = useCart();
  const { addToast } = useUIStore();
  
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [couponCode, setCouponCode] = useState('');
  const [showCouponInput, setShowCouponInput] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);

  const allSelected = cart.items.length > 0 && selectedItems.length === cart.items.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedItems([]);
    } else {
      setSelectedItems(cart.items.map((item) => item.sku));
    }
  };

  const toggleSelectItem = (sku: string) => {
    setSelectedItems((prev) =>
      prev.includes(sku) ? prev.filter((s) => s !== sku) : [...prev, sku]
    );
  };

  const handleQuantityChange = async (sku: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    await updateQuantity(sku, Math.floor(newQuantity));
  };

  const handleRemoveItem = async (sku: string, name: string) => {
    await removeItem(sku);
    addToast(`ลบ ${name} ออกจากตะกร้าแล้ว`, 'success');
  };

  const handleApplyCoupon = () => {
    const coupon = availableCoupons.find((c) => c.code === couponCode.toUpperCase());
    if (coupon) {
      if (cart.totalAmount >= coupon.minOrder) {
        setAppliedCoupon(coupon.code);
        addToast(`ใช้โค้ด ${coupon.code} สำเร็จ`, 'success');
        setCouponCode('');
        setShowCouponInput(false);
      } else {
        addToast(`ยอดสั่งซื้อขั้นต่ำ ${formatPrice(coupon.minOrder)}`, 'error');
      }
    } else {
      addToast('โค้ดไม่ถูกต้อง', 'error');
    }
  };

  const selectedTotal = cart.items
    .filter((item) => selectedItems.includes(item.sku))
    .reduce((sum, item) => sum + item.subtotal, 0);

  const discountAmount = appliedCoupon
    ? availableCoupons.find((c) => c.code === appliedCoupon)?.discount || 0
    : 0;

  const finalTotal = selectedTotal - discountAmount;

  if (cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <Header showBack title="ตะกร้าสินค้า" />
        
        <main className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <ShoppingBag className="w-12 h-12 text-gray-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">ตะกร้าว่างเปล่า</h2>
          <p className="text-gray-500 text-center mb-6">
            ยังไม่มีสินค้าในตะกร้า<br />ไปเลือกสินค้ากันเลย!
          </p>
          <Link to="/shop">
            <Button size="lg">เลือกซื้อสินค้า</Button>
          </Link>
        </main>

        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <Header showBack title={`ตะกร้าสินค้า (${cart.totalItems})`} />

      <main className="p-4 space-y-4">
        {/* Clear all button */}
        <div className="flex justify-end">
          <button
            onClick={() => {
              clearCart();
              addToast('ล้างตะกร้าแล้ว', 'success');
            }}
            className="text-sm text-red-500 flex items-center gap-1"
          >
            <Trash2 className="w-4 h-4" />
            ลบทั้งหมด
          </button>
        </div>

        {/* Cart Items */}
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {cart.items.map((item) => (
              <motion.div
                key={item.sku}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className="bg-white rounded-xl p-3 shadow-sm"
              >
                <div className="flex gap-3">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleSelectItem(item.sku)}
                    className={cn(
                      'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-4',
                      selectedItems.includes(item.sku)
                        ? 'bg-brand-500 border-brand-500'
                        : 'border-gray-300'
                    )}
                  >
                    {selectedItems.includes(item.sku) && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </button>

                  {/* Image */}
                  <Link to={`/product/${item.sku}`} className="flex-shrink-0">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-20 h-20 object-cover rounded-lg bg-gray-100"
                    />
                  </Link>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <Link to={`/product/${item.sku}`}>
                      <h3 className="font-medium text-gray-900 line-clamp-2">
                        {item.name}
                      </h3>
                    </Link>

                    <div className="mt-1 flex items-center gap-2">
                      <span className="font-bold text-brand-600">
                        {formatPrice(item.price || item.unitPrice || 0)}
                      </span>
                      {item.originalPrice && (
                        <span className="text-sm text-gray-400 line-through">
                          {formatPrice(item.originalPrice)}
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      {/* Quantity */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleQuantityChange(item.sku, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="w-7 h-7 flex items-center justify-center bg-gray-100 rounded-lg disabled:opacity-50"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <button
                          onClick={() => handleQuantityChange(item.sku, item.quantity + 1)}
                          disabled={item.quantity >= (item.maxQty || 99)}
                          className="w-7 h-7 flex items-center justify-center bg-gray-100 rounded-lg disabled:opacity-50"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Subtotal */}
                      <span className="font-medium">
                        {formatPrice(item.subtotal)}
                      </span>
                    </div>
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={() => handleRemoveItem(item.sku, item.name)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Coupon Section */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-brand-500" />
              <span className="font-medium">โค้ดส่วนลด</span>
            </div>
            {!showCouponInput && !appliedCoupon && (
              <button
                onClick={() => setShowCouponInput(true)}
                className="text-sm text-brand-600"
              >
                เพิ่มโค้ด
              </button>
            )}
          </div>

          {appliedCoupon ? (
            <div className="flex items-center justify-between bg-green-50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <Badge variant="success">{appliedCoupon}</Badge>
                <span className="text-sm text-green-700">
                  ลด {formatPrice(discountAmount)}
                </span>
              </div>
              <button
                onClick={() => {
                  setAppliedCoupon(null);
                  addToast('ยกเลิกโค้ดแล้ว', 'success');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : showCouponInput ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="ใส่โค้ดส่วนลด"
                className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 uppercase"
              />
              <Button size="sm" onClick={handleApplyCoupon}>
                ใช้
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availableCoupons.map((coupon) => (
                <button
                  key={coupon.code}
                  onClick={() => {
                    setCouponCode(coupon.code);
                    handleApplyCoupon();
                  }}
                  className="px-3 py-1.5 bg-brand-50 text-brand-700 rounded-full text-sm hover:bg-brand-100 transition-colors"
                >
                  {coupon.code} ลด {formatPrice(coupon.discount)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-medium mb-3">สรุปราคา</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">ราคาสินค้า</span>
              <span>{formatPrice(selectedTotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>ส่วนลด</span>
                <span>-{formatPrice(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">ค่าจัดส่ง</span>
              <span className="text-green-600">ฟรี</span>
            </div>
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between text-lg font-bold">
                <span>รวมทั้งสิ้น</span>
                <span className="text-brand-600">{formatPrice(finalTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Actions */}
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t p-4 safe-area-bottom">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-2 text-sm"
          >
            <div
              className={cn(
                'w-5 h-5 rounded border-2 flex items-center justify-center',
                allSelected ? 'bg-brand-500 border-brand-500' : 'border-gray-300'
              )}
            >
              {allSelected && <Check className="w-3 h-3 text-white" />}
            </div>
            เลือกทั้งหมด ({cart.totalItems})
          </button>
          <span className="font-bold text-lg">{formatPrice(finalTotal)}</span>
        </div>
        <Button
          fullWidth
          size="lg"
          disabled={selectedItems.length === 0}
          onClick={() => navigate('/checkout', { state: { selectedItems, coupon: appliedCoupon } })}
        >
          สั่งซื้อ ({selectedItems.length} ชิ้น)
        </Button>
      </div>

      <BottomNav />
    </div>
  );
};