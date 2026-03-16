import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Package, ChevronRight, Clock, Truck, CheckCircle, XCircle } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrders } from '@/hooks/useOrders';
import { formatPrice, formatDate } from '@/utils/helpers';
import { cn } from '@/utils/helpers';
import type { OrderStatus } from '@/types/order';

// Status config
const statusConfig: Record<string, { label: string; color: string; icon: typeof Package }> = {
  pending: { label: 'รอชำระเงิน', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  pending_payment: { label: 'รอตรวจสอบสลิป', color: 'bg-orange-100 text-orange-700', icon: Clock },
  paid: { label: 'ชำระเงินแล้ว', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  confirmed: { label: 'ยืนยันแล้ว', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  processing: { label: 'กำลังเตรียมสินค้า', color: 'bg-purple-100 text-purple-700', icon: Package },
  shipped: { label: 'จัดส่งแล้ว', color: 'bg-indigo-100 text-indigo-700', icon: Truck },
  delivered: { label: 'สำเร็จ', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  cancelled: { label: 'ยกเลิก', color: 'bg-red-100 text-red-700', icon: XCircle },
  refunded: { label: 'คืนเงิน', color: 'bg-gray-100 text-gray-700', icon: XCircle },
};

// Tabs
const tabs = [
  { value: '', label: 'ทั้งหมด' },
  { value: 'pending', label: 'รอชำระ' },
  { value: 'processing', label: 'จัดส่ง' },
  { value: 'delivered', label: 'สำเร็จ' },
];

export const OrdersPage = () => {
  const [activeTab, setActiveTab] = useState('');
  const { data: ordersData, isLoading } = useOrders(1, 20, (activeTab as OrderStatus) || undefined);

  const orders = ordersData?.orders || [];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header title="ออเดอร์ของฉัน" />

      {/* Tabs */}
      <div className="sticky top-14 z-30 bg-white border-b border-gray-100">
        <div className="flex overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                'flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.value
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="p-4">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex justify-between mb-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-16 w-full mb-3" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Package className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">ยังไม่มีออเดอร์</h3>
            <p className="text-gray-500 text-center mb-6">
              เริ่มต้นช้อปปิ้งเพื่อสร้างออเดอร์แรกของคุณ
            </p>
            <Link to="/shop">
              <Button>เลือกซื้อสินค้า</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order, index) => {
              const status = statusConfig[order.status] || statusConfig.pending;
              const StatusIcon = status.icon;

              return (
                <motion.div
                  key={order.orderNo}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link to={`/orders/${order.orderNo}`}>
                    <div className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">{order.orderNo}</span>
                          <span className="text-sm text-gray-400">
                            {formatDate(order.createdAt)}
                          </span>
                        </div>
                        <Badge className={status.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {status.label}
                        </Badge>
                      </div>

                      {/* Items Preview */}
                      <div className="flex items-center gap-3 mb-3">
                        <img
                          src={order.firstImage || 'https://placehold.co/60x60'}
                          alt=""
                          className="w-14 h-14 object-cover rounded-lg"
                        />
                        <div className="flex-1">
                          <p className="text-sm text-gray-600">
                            {order.itemCount || order.items?.length || 0} รายการ
                          </p>
                          <p className="font-semibold">{formatPrice(order.totalAmount)}</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">
                          {order.paymentMethod === 'cod' ? 'เก็บเงินปลายทาง' : 'โอนเงิน'}
                        </span>
                        <div className="flex items-center text-brand-600 text-sm font-medium">
                          ดูรายละเอียด
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};
