import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Package, 
  Truck, 
  CheckCircle, 
  Clock,
  MapPin,
  CreditCard,
  Copy,
  MessageCircle
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrder, useTrackingInfo, useUploadPaymentProof } from '@/hooks/useOrders';
import { formatPrice, formatDateTime, copyToClipboard } from '@/utils/helpers';
import { cn } from '@/utils/helpers';
import type { OrderStatus } from '@/types/order';
import { useUIStore } from '@/stores/uiStore';

// Status config
const statusConfig: Record<string, { label: string; color: string; description: string }> = {
  pending: { label: 'รอชำระเงิน', color: 'bg-yellow-100 text-yellow-700', description: 'กรุณาชำระเงินภายใน 24 ชั่วโมง' },
  pending_payment: { label: 'รอตรวจสอบสลิป', color: 'bg-orange-100 text-orange-700', description: 'ระบบได้รับสลิปแล้วและกำลังตรวจสอบการชำระเงิน' },
  paid: { label: 'ชำระเงินแล้ว', color: 'bg-blue-100 text-blue-700', description: 'รอร้านค้าจัดเตรียมสินค้า' },
  confirmed: { label: 'ยืนยันแล้ว', color: 'bg-blue-100 text-blue-700', description: 'รอร้านค้าจัดเตรียมสินค้า' },
  processing: { label: 'กำลังเตรียมสินค้า', color: 'bg-purple-100 text-purple-700', description: 'ร้านค้ากำลังเตรียมสินค้า' },
  shipped: { label: 'จัดส่งแล้ว', color: 'bg-indigo-100 text-indigo-700', description: 'สินค้ากำลังจัดส่งถึงคุณ' },
  delivered: { label: 'สำเร็จ', color: 'bg-green-100 text-green-700', description: 'สินค้าถูกจัดส่งสำเร็จ' },
  cancelled: { label: 'ยกเลิก', color: 'bg-red-100 text-red-700', description: 'ออเดอร์ถูกยกเลิก' },
  refunded: { label: 'คืนเงิน', color: 'bg-gray-100 text-gray-700', description: 'เงินถูกคืนแล้ว' },
};

const paymentMethodLabels: Record<string, string> = {
  bank_transfer: 'โอนเงินผ่านธนาคาร',
  promptpay: 'พร้อมเพย์',
  cod: 'เก็บเงินปลายทาง',
  credit_card: 'บัตรเครดิต/เดบิต',
  cash_on_delivery: 'เก็บเงินปลายทาง',
  line_pay: 'LINE Pay',
};

// Timeline component
const OrderTimeline = ({ status }: { status: OrderStatus }) => {
  const steps = [
    { key: 'pending', label: 'สั่งซื้อ', icon: Clock },
    { key: 'paid', label: 'ชำระเงิน', icon: CheckCircle },
    { key: 'processing', label: 'เตรียมสินค้า', icon: Package },
    { key: 'shipped', label: 'จัดส่ง', icon: Truck },
    { key: 'delivered', label: 'สำเร็จ', icon: CheckCircle },
  ];

  const timelineStatus = status === 'pending_payment' ? 'paid' : status;
  const currentStepIndex = steps.findIndex((s) => s.key === timelineStatus);

  return (
    <div className="flex items-center justify-between py-4 overflow-x-auto">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isCompleted = index <= currentStepIndex;
        const isCurrent = index === currentStepIndex;

        return (
          <div key={step.key} className="flex flex-col items-center min-w-[60px]">
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center mb-1',
                isCompleted
                  ? 'bg-brand-500 text-white'
                  : 'bg-gray-100 text-gray-400',
                isCurrent && 'ring-4 ring-brand-100'
              )}
            >
              <Icon className="w-5 h-5" />
            </div>
            <span
              className={cn(
                'text-xs',
                isCompleted ? 'text-gray-900' : 'text-gray-400'
              )}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export const OrderDetailPage = () => {
  const { orderNo } = useParams<{ orderNo: string }>();
  const { addToast } = useUIStore();
  const uploadPaymentProof = useUploadPaymentProof();
  const [paymentReference, setPaymentReference] = useState('');
  
  const { data: order, isLoading } = useOrder(orderNo || '');
  const { data: trackingInfo } = useTrackingInfo(orderNo || '');

  const handleCopyOrderNo = () => {
    if (orderNo) {
      copyToClipboard(orderNo);
      addToast('คัดลอกเลขที่คำสั่งซื้อแล้ว', 'success');
    }
  };

  const handlePaymentSlipChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !orderNo) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        addToast('ไม่สามารถอ่านไฟล์ได้', 'error');
        return;
      }

      void uploadPaymentProof
        .mutateAsync({
          orderNo,
          imageBase64: reader.result,
          filename: file.name,
          reference: paymentReference,
        })
        .then(() => {
          addToast('อัปโหลดหลักฐานชำระเงินสำเร็จ', 'success');
        })
        .catch(() => {
          addToast('ไม่สามารถอัปโหลดหลักฐานชำระเงินได้', 'error');
        });
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <Header showBack title="รายละเอียดคำสั่งซื้อ" />
        <div className="p-4 space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-60 w-full" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <h2 className="text-xl font-bold text-gray-900 mb-2">ไม่พบคำสั่งซื้อ</h2>
        <p className="text-gray-500 mb-4">เลขที่คำสั่งซื้อนี้อาจถูกลบหรือไม่มีอยู่</p>
        <Link to="/orders">
          <Button>กลับไปคำสั่งซื้อของฉัน</Button>
        </Link>
      </div>
    );
  }

  const status = statusConfig[order.status] || statusConfig.pending;
  const paymentMethod = order.paymentMethod ? paymentMethodLabels[order.paymentMethod] : 'ไม่ระบุ';
  
  // Handle shipping address - can be string or object
  const shippingAddress = typeof order.shippingAddress === 'string' 
    ? { address: order.shippingAddress, name: order.shippingName || '', phone: order.shippingPhone || '' }
    : order.shippingAddress;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header showBack title="รายละเอียดคำสั่งซื้อ" />

      <div className="p-4 space-y-4">
        {/* Order Header */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-gray-500">เลขที่คำสั่งซื้อ</p>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{order.orderNo}</span>
                <button
                  onClick={handleCopyOrderNo}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <Copy className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>
            <Badge className={status.color}>{status.label}</Badge>
          </div>
          
          <p className="text-sm text-gray-500">
            สั่งซื้อเมื่อ {formatDateTime(order.createdAt)}
          </p>
          
          {order.status !== 'cancelled' && order.status !== 'delivered' && (
            <>
              <div className="my-4 border-t" />
              <OrderTimeline status={order.status} />
              <p className="text-sm text-gray-500 text-center mt-2">
                {status.description}
              </p>
            </>
          )}
        </div>

        {/* Tracking Info */}
        {(order.status === 'shipped' || order.status === 'delivered') && trackingInfo && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <Truck className="w-5 h-5 text-brand-500" />
              <h3 className="font-semibold">ข้อมูลการจัดส่ง</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">เลขพัสดุ</span>
                <span className="font-medium">{order.trackingNo || order.trackingNumber || '-'}</span>
              </div>
              {trackingInfo && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-500">ขนส่ง</span>
                    <span>{(trackingInfo as { carrier?: string }).carrier || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">สถานะ</span>
                    <span>{(trackingInfo as { status?: string }).status || '-'}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Items */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold mb-4">รายการสินค้า</h3>
          <div className="space-y-4">
            {order.items.map((item, index: number) => (
              <div key={index} className="flex gap-3">
                <img
                  src={item.imageUrl || item.productImage || 'https://placehold.co/80x80'}
                  alt={item.name}
                  className="w-20 h-20 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <p className="font-medium line-clamp-2">{item.name}</p>
                  <p className="text-sm text-gray-500">{item.sku}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-gray-500">
                      x{item.quantity}
                    </span>
                    <span className="font-semibold">
                      {formatPrice(item.subtotal || item.totalPrice || 0)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Shipping Address */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <MapPin className="w-5 h-5 text-brand-500" />
            <h3 className="font-semibold">ที่อยู่จัดส่ง</h3>
          </div>
          <div className="text-sm">
            <p className="font-medium">{shippingAddress.name || order.shippingName}</p>
            <p className="text-gray-500">{shippingAddress.phone || order.shippingPhone}</p>
            <p className="text-gray-500 mt-1">
              {typeof shippingAddress === 'object' && shippingAddress.address}
            </p>
            <p className="text-gray-500">
              {typeof shippingAddress === 'object' && shippingAddress.district} {typeof shippingAddress === 'object' && shippingAddress.province} {typeof shippingAddress === 'object' && shippingAddress.postalCode}
            </p>
          </div>
        </div>

        {/* Payment Info */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <CreditCard className="w-5 h-5 text-brand-500" />
            <h3 className="font-semibold">ข้อมูลการชำระเงิน</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">วิธีการชำระเงิน</span>
              <span>{paymentMethod}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">สถานะการชำระเงิน</span>
              <Badge 
                variant={order.paymentStatus === 'paid' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {order.paymentStatus === 'paid' ? 'ชำระเงินแล้ว' : 'รอชำระเงิน'}
              </Badge>
            </div>
            {order.paymentStatus !== 'paid' && ['promptpay', 'bank_transfer'].includes(order.paymentMethod || '') && (
              <div className="pt-2 space-y-3">
                <input
                  value={paymentReference}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setPaymentReference(event.target.value)}
                  placeholder="เลขอ้างอิงการโอน"
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
                <label className="block">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePaymentSlipChange}
                  />
                  <Button
                    variant="outline"
                    className="w-full"
                    isLoading={uploadPaymentProof.isPending}
                    type="button"
                  >
                    <span>อัปโหลดสลิปการโอน</span>
                  </Button>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Price Summary */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold mb-4">สรุปราคา</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">ยอดรวมสินค้า</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">ค่าจัดส่ง</span>
              <span>{order.shippingFee > 0 ? formatPrice(order.shippingFee) : 'ฟรี'}</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>ส่วนลด</span>
                <span>-{formatPrice(order.discountAmount)}</span>
              </div>
            )}
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between font-semibold text-lg">
                <span>ยอดรวมทั้งหมด</span>
                <span className="text-brand-600">{formatPrice(order.totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Support */}
        <Link to="/chat">
          <Button variant="outline" className="w-full gap-2">
            <MessageCircle className="w-4 h-4" />
            ติดต่อสอบถาม
          </Button>
        </Link>
      </div>
    </div>
  );
};
