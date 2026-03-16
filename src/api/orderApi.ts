/**
 * Order API
 * API สำหรับจัดการคำสั่งซื้อ - เชื่อมต่อกับ Backend PHP จริง
 */

import { apiClient } from './client';
import type { Order, OrderStatus, PaymentStatus, PaymentMethod, CreateOrderRequest } from '@/types/order';

interface OrderListResponse {
  orders: Order[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface OrderDetailResponse {
  id: number;
  orderNo: string;
  status: OrderStatus;
  paymentStatus: string;
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  taxAmount: number;
  totalAmount: number;
  couponCode?: string;
  shippingMethod?: string;
  trackingNo?: string;
  shippingProvider?: string;
  delivery: {
    name: string;
    phone: string;
    address: string;
    province: string;
    postalCode: string;
    note?: string;
  };
  paymentMethod: string;
  paymentReference?: string;
  paymentSlipPath?: string;
  paymentSlipUploadedAt?: string;
  paidAt?: string;
  items: Array<{
    sku: string;
    productName: string;
    productImage?: string;
    unitPrice: number;
    quantity: number;
    totalAmount: number;
  }>;
  itemCount: number;
  odooOrderId?: number;
  odooOrderRef?: string;
  odooSyncStatus?: 'pending' | 'synced' | 'error';
  odooSyncError?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get user orders with pagination
 * GET /api/orders
 */
export const getOrders = async (options: {
  page?: number;
  limit?: number;
  status?: OrderStatus;
} = {}): Promise<{ orders: Order[]; pagination: OrderListResponse['pagination'] }> => {
  const params: Record<string, string | number | undefined> = {
    page: options.page || 1,
    limit: options.limit || 10,
  };

  if (options.status) {
    params.status = options.status;
  }

  const response = await apiClient.get<OrderListResponse>('/orders', params);

  if (!response.success || !response.data) {
    // Return empty list if error
    return {
      orders: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      },
    };
  }

  return {
    orders: response.data.orders,
    pagination: response.data.pagination,
  };
};

/**
 * Get order by order number
 * GET /api/orders/:orderNo
 */
export const getOrderByNumber = async (orderNo: string): Promise<Order> => {
  const response = await apiClient.get<OrderDetailResponse>(`/orders/${orderNo}`);

  if (!response.success || !response.data) {
    throw new Error(response.error || 'Order not found');
  }

  const data = response.data;
  return {
    id: data.id,
    orderNo: data.orderNo,
    status: data.status as OrderStatus,
    paymentStatus: data.paymentStatus as PaymentStatus,
    totalAmount: data.totalAmount,
    subtotal: data.subtotal,
    shippingFee: data.shippingFee,
    discountAmount: data.discountAmount,
    items: data.items.map(item => ({
      id: `${data.orderNo}-${item.sku}`,
      sku: item.sku,
      name: item.productName,
      image: item.productImage || '',
      price: item.unitPrice,
      quantity: item.quantity,
      total: item.totalAmount,
    })),
    shippingAddress: {
      name: data.delivery.name,
      phone: data.delivery.phone,
      address: data.delivery.address,
      province: data.delivery.province,
      postalCode: data.delivery.postalCode,
      note: data.delivery.note,
    },
    delivery: {
      name: data.delivery.name,
      phone: data.delivery.phone,
      address: data.delivery.address,
      province: data.delivery.province,
      postalCode: data.delivery.postalCode,
      note: data.delivery.note,
    },
    paymentMethod: data.paymentMethod as PaymentMethod,
    paymentProof: data.paymentSlipPath,
    paymentSlipPath: data.paymentSlipPath,
    paymentSlipUploadedAt: data.paymentSlipUploadedAt,
    trackingNumber: data.trackingNo,
    shippingMethod: data.shippingProvider,
    odooOrderId: data.odooOrderId,
    odooOrderRef: data.odooOrderRef,
    odooSyncStatus: data.odooSyncStatus,
    odooSyncError: data.odooSyncError,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
};

/**
 * Create new order
 * POST /api/orders
 */
export const createOrder = async (orderData: CreateOrderRequest): Promise<{ orderNo: string; status: string; totalAmount: number; odooSyncStatus?: string; odooSyncError?: string | null }> => {
  const body: Record<string, unknown> = {
    items: orderData.items.map(item => ({
      sku: item.sku,
      quantity: item.quantity,
    })),
    delivery: {
      name: orderData.delivery.name,
      phone: orderData.delivery.phone,
      address: orderData.delivery.address,
      province: orderData.delivery.province,
      postalCode: orderData.delivery.postalCode,
      note: orderData.delivery.note,
    },
    paymentMethod: orderData.paymentMethod,
    couponCode: orderData.couponCode,
    note: orderData.note,
  };

  const response = await apiClient.post<{ orderNo: string; status: string; totalAmount: number; message: string; odooSyncStatus?: string; odooSyncError?: string | null }>('/orders', body);

  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to create order');
  }

  return {
    orderNo: response.data.orderNo,
    status: response.data.status,
    totalAmount: response.data.totalAmount,
    odooSyncStatus: response.data.odooSyncStatus,
    odooSyncError: response.data.odooSyncError,
  };
};

/**
 * Cancel order (if supported by API)
 */
export const cancelOrder = async (_orderNo: string, _reason?: string): Promise<void> => {
  // This would need to be implemented in the PHP backend
  throw new Error('Cancel order not implemented in API');
};

/**
 * Get order status text in Thai
 */
export const getOrderStatusText = (status: OrderStatus): string => {
  const statusMap: Record<string, string> = {
    pending: 'รอดำเนินการ',
    pending_payment: 'รอตรวจสอบการชำระเงิน',
    confirmed: 'ยืนยันแล้ว',
    processing: 'กำลังเตรียมสินค้า',
    shipped: 'จัดส่งแล้ว',
    delivered: 'ส่งถึงแล้ว',
    cancelled: 'ยกเลิก',
    refunded: 'คืนเงินแล้ว',
  };
  return statusMap[status] || status;
};

/**
 * Get payment status text in Thai
 */
export const getPaymentStatusText = (status: string): string => {
  const statusMap: Record<string, string> = {
    pending: 'รอชำระเงิน',
    paid: 'ชำระเงินแล้ว',
    failed: 'ชำระเงินล้มเหลว',
    refunded: 'คืนเงินแล้ว',
  };
  return statusMap[status] || status;
};

/**
 * Get order status color
 */
export const getOrderStatusColor = (status: OrderStatus): string => {
  const colorMap: Record<string, string> = {
    pending: 'yellow',
    pending_payment: 'orange',
    confirmed: 'blue',
    processing: 'purple',
    shipped: 'indigo',
    delivered: 'green',
    cancelled: 'red',
    refunded: 'gray',
  };
  return colorMap[status] || 'gray';
};

/**
 * Check if order can be cancelled
 */
export const canCancelOrder = (status: OrderStatus): boolean => {
  return ['pending', 'pending_payment', 'confirmed'].includes(status);
};

// Export all functions
export const orderApi = {
  getOrders,
  getOrderByNumber,
  createOrder,
  cancelOrder,
  getOrderStatusText,
  getPaymentStatusText,
  getOrderStatusColor,
  canCancelOrder,
};

export default orderApi;
