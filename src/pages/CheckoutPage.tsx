import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  MapPin, 
  Truck, 
  CreditCard, 
  Banknote, 
  QrCode
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/stores/cartStore';
import { useUIStore } from '@/stores/uiStore';
import { useCreateOrder } from '@/hooks/useOrders';
import { formatPrice } from '@/utils/helpers';
import { cn } from '@/utils/helpers';

// Mock addresses
const mockAddresses = [
  {
    id: 1,
    name: 'นายสมชาย ใจดี',
    phone: '081-234-5678',
    address: '123/45 ถ.สุขุมวิท ซ.15',
    district: 'คลองเตย',
    province: 'กรุงเทพ',
    postalCode: '10110',
    isDefault: true,
  },
];

// Payment methods
const paymentMethods = [
  { id: 'promptpay', name: 'พร้อมเพย์', icon: QrCode, description: 'สแกน QR Code เพื่อชำระเงิน' },
  { id: 'bank_transfer', name: 'โอนเงินผ่านธนาคาร', icon: Banknote, description: 'โอนเงินไปยังบัญชีธนาคาร' },
  { id: 'cod', name: 'เก็บเงินปลายทาง', icon: CreditCard, description: 'ชำระเงินเมื่อได้รับสินค้า (+฿20)' },
];

// Shipping methods
const shippingMethods = [
  { id: 'standard', name: 'ส่งปกติ Flash', price: 0, eta: '2-3 วัน' },
  { id: 'express', name: 'ส่งด่วน Kerry', price: 50, eta: '1-2 วัน' },
];

export const CheckoutPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { cart } = useCartStore();
  const { addToast } = useUIStore();
  const createOrder = useCreateOrder();

  const [selectedAddress] = useState(mockAddresses[0]);
  const [selectedPayment, setSelectedPayment] = useState('promptpay');
  const [selectedShipping, setSelectedShipping] = useState('standard');
  const [note, setNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Get selected items from cart
  const selectedSkus = location.state?.selectedItems || [];
  const selectedItems = cart.items.filter((item) => selectedSkus.includes(item.sku));

  // Calculate totals
  const subtotal = selectedItems.reduce((sum, item) => sum + item.subtotal, 0);
  const shippingFee = shippingMethods.find((s) => s.id === selectedShipping)?.price || 0;
  const couponDiscount = location.state?.coupon ? 100 : 0; // Mock discount
  const total = subtotal + shippingFee - couponDiscount;

  const handlePlaceOrder = async () => {
    setIsProcessing(true);
    
    try {
      const order = await createOrder.mutateAsync({
        items: selectedItems.map((item) => ({
          sku: item.sku,
          quantity: Math.floor(item.quantity),
        })),
        delivery: {
          name: selectedAddress.name,
          phone: selectedAddress.phone,
          address: selectedAddress.address,
          province: selectedAddress.province,
          postalCode: selectedAddress.postalCode,
          note: note,
        },
        paymentMethod: selectedPayment,
        couponCode: location.state?.coupon,
      });

      addToast('สั่งซื้อสำเร็จ!', 'success');
      navigate(`/orders/${order.orderNo}`, { replace: true });
    } catch (error) {
      addToast('ไม่สามารถสั่งซื้อได้ กรุณาลองใหม่', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  if (selectedItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <h2 className="text-xl font-bold text-gray-900 mb-2">ไม่มีสินค้า</h2>
        <p className="text-gray-500 mb-4">กรุณาเลือกสินค้าก่อนทำการสั่งซื้อ</p>
        <Button onClick={() => navigate('/cart')}>กลับไปตะกร้า</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <Header showBack title="ชำระเงิน" />

      <main className="p-4 space-y-4">
        {/* Address */}
        <section className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-5 h-5 text-brand-500" />
            <h3 className="font-medium">ที่อยู่จัดส่ง</h3>
          </div>
          
          <div className="border rounded-lg p-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">{selectedAddress.name}</p>
                <p className="text-sm text-gray-500">{selectedAddress.phone}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedAddress.address}
                  <br />
                  {selectedAddress.district} {selectedAddress.province} {selectedAddress.postalCode}
                </p>
              </div>
              <button className="text-sm text-brand-600">เปลี่ยน</button>
            </div>
          </div>
        </section>

        {/* Products */}
        <section className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-medium mb-3">สินค้า ({selectedItems.length} ชิ้น)</h3>
          <div className="space-y-3">
            {selectedItems.map((item) => (
              <div key={item.sku} className="flex gap-3">
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-16 h-16 object-cover rounded-lg bg-gray-100"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-2">{item.name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatPrice(item.price || item.unitPrice || 0)} x {item.quantity}
                  </p>
                </div>
                <p className="font-medium text-sm">{formatPrice(item.subtotal)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Shipping */}
        <section className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Truck className="w-5 h-5 text-brand-500" />
            <h3 className="font-medium">การจัดส่ง</h3>
          </div>
          
          <div className="space-y-2">
            {shippingMethods.map((method) => (
              <label
                key={method.id}
                className={cn(
                  'flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors',
                  selectedShipping === method.id
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-gray-200 hover:bg-gray-50'
                )}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="shipping"
                    value={method.id}
                    checked={selectedShipping === method.id}
                    onChange={() => setSelectedShipping(method.id)}
                    className="text-brand-500"
                  />
                  <div>
                    <p className="font-medium text-sm">{method.name}</p>
                    <p className="text-xs text-gray-500">{method.eta}</p>
                  </div>
                </div>
                <span className={cn('font-medium', method.price === 0 && 'text-green-600')}>
                  {method.price === 0 ? 'ฟรี' : formatPrice(method.price)}
                </span>
              </label>
            ))}
          </div>
        </section>

        {/* Payment */}
        <section className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-5 h-5 text-brand-500" />
            <h3 className="font-medium">วิธีชำระเงิน</h3>
          </div>
          
          <div className="space-y-2">
            {paymentMethods.map((method) => {
              const Icon = method.icon;
              return (
                <label
                  key={method.id}
                  className={cn(
                    'flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors',
                    selectedPayment === method.id
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  )}
                >
                  <input
                    type="radio"
                    name="payment"
                    value={method.id}
                    checked={selectedPayment === method.id}
                    onChange={() => setSelectedPayment(method.id)}
                    className="text-brand-500"
                  />
                  <Icon className="w-5 h-5 text-gray-600" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{method.name}</p>
                    <p className="text-xs text-gray-500">{method.description}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </section>

        {/* Note */}
        <section className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-medium mb-3">หมายเหตุถึงร้านค้า</h3>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="เช่น ฝากระวังของแตกด้วยนะคะ..."
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            rows={3}
          />
        </section>

        {/* Summary */}
        <section className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-medium mb-3">สรุปคำสั่งซื้อ</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">ราคาสินค้า</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">ค่าจัดส่ง</span>
              <span className={shippingFee === 0 ? 'text-green-600' : ''}>
                {shippingFee === 0 ? 'ฟรี' : formatPrice(shippingFee)}
              </span>
            </div>
            {couponDiscount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>ส่วนลด ({location.state?.coupon})</span>
                <span>-{formatPrice(couponDiscount)}</span>
              </div>
            )}
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between text-lg font-bold">
                <span>ยอดชำระทั้งหมด</span>
                <span className="text-brand-600">{formatPrice(total)}</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 safe-area-bottom z-40">
        <div className="flex items-center justify-between mb-3">
          <span className="text-gray-500">ยอดชำระ</span>
          <span className="text-2xl font-bold text-brand-600">{formatPrice(total)}</span>
        </div>
        <Button
          fullWidth
          size="lg"
          onClick={handlePlaceOrder}
          isLoading={isProcessing}
        >
          ยืนยันคำสั่งซื้อ
        </Button>
      </div>
    </div>
  );
};