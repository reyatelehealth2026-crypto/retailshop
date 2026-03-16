export type OrderStatus = 
  | 'pending'      // รอดำเนินการ
  | 'pending_payment'
  | 'confirmed'    // ยืนยันแล้ว
  | 'processing'   // กำลังเตรียมสินค้า
  | 'shipped'      // จัดส่งแล้ว
  | 'delivered'    // ส่งถึงแล้ว
  | 'cancelled'    // ยกเลิก
  | 'refunded'    // คืนเงินแล้ว
  | 'paid';        // ชำระเงินแล้ว (for backward compatibility)

export type PaymentMethod = 
  | 'bank_transfer' 
  | 'promptpay' 
  | 'cod' 
  | 'credit_card'
  | 'cash_on_delivery'
  | 'line_pay';

export type PaymentStatus = 
  | 'pending' 
  | 'paid' 
  | 'failed' 
  | 'refunded';

export interface ShippingAddress {
  name: string;
  phone: string;
  address: string;
  district?: string;
  subdistrict?: string;
  province?: string;
  postalCode?: string;
  note?: string;
}

export interface OrderItem {
  id?: string | number;
  productId?: number;
  sku: string;
  name: string;
  productName?: string;
  image?: string;
  imageUrl?: string;
  productImage?: string;
  price: number;
  unitPrice?: number;
  quantity: number;
  subtotal?: number;
  total?: number;
  totalPrice?: number;
  totalAmount?: number;
  discountAmount?: number;
}

export interface OrderStatusHistory {
  id: number;
  statusFrom?: string;
  statusTo: string;
  notes?: string;
  createdAt: string;
}

export interface Order {
  id?: number;
  orderNo: string;
  orderNumber?: string;
  
  // Customer
  lineUserId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  shippingName?: string;
  shippingPhone?: string;
  
  // Shipping - can be string or object for flexibility
  shippingAddress: ShippingAddress | string;
  delivery?: ShippingAddress;
  shippingProvince?: string;
  shippingDistrict?: string;
  shippingSubdistrict?: string;
  shippingPostalCode?: string;
  shippingMethod?: string;
  
  // Items
  items: OrderItem[];
  itemCount?: number;
  firstImage?: string;
  
  // Pricing
  subtotal: number;
  shippingFee: number;
  discountAmount: number;
  taxAmount?: number;
  couponCode?: string;
  discountCode?: string;
  totalAmount: number;
  
  // Status
  status: OrderStatus;
  
  // Payment
  paymentMethod?: PaymentMethod | string;
  paymentStatus?: PaymentStatus;
  paymentProof?: string;
  paymentSlipPath?: string;
  paymentSlipUploadedAt?: string;
  paidAt?: string;
  
  // Shipping tracking
  trackingNumber?: string;
  trackingNo?: string;
  shippedAt?: string;
  deliveredAt?: string;
  
  // Notes
  customerNote?: string;
  customerNotes?: string;
  adminNote?: string;
  adminNotes?: string;
  note?: string;
  
  // Status history
  statusHistory?: OrderStatusHistory[];
  
  // Odoo
  odooOrderId?: number;
  odooOrderRef?: string;
  odooSyncStatus?: 'pending' | 'synced' | 'error';
  odooSyncError?: string | null;
  
  // Timestamps
  createdAt: string;
  updatedAt?: string;
  cancelledAt?: string;
  cancelledReason?: string;
}

export interface CreateOrderRequest {
  // Items
  items: { sku: string; quantity: number }[];
  
  // Delivery info
  delivery: {
    name: string;
    phone: string;
    address: string;
    province: string;
    postalCode: string;
    note?: string;
  };
  
  // Payment
  paymentMethod: string;
  
  // Discount
  discountCode?: string;
  couponCode?: string;
  
  // Notes
  note?: string;
  customerNotes?: string;
  customerNote?: string;
}

export interface CreateOrderResponse {
  orderNo: string;
  totalAmount: number;
  paymentInfo?: {
    promptpayQr?: string;
    bankAccounts?: {
      bank: string;
      accountNo: string;
      accountName: string;
    }[];
  };
}

export interface OrderListResponse {
  orders: Order[];
  pagination: {
    total?: number;
    totalCount?: number;
    page: number;
    totalPages: number;
    hasMore?: boolean;
    hasNext?: boolean;
    hasPrev?: boolean;
    limit: number;
  };
}

export interface OrderDetailResponse {
  order: Order;
}

export interface TrackingInfo {
  trackingNo: string;
  carrier: string;
  status: string;
  events: {
    date: string;
    location: string;
    status: string;
  }[];
}
