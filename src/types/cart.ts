export interface CartItem {
  cartId?: number;
  productId: number;
  sku: string;
  name: string;
  shortDescription?: string;
  imageUrl: string;
  price?: number;
  retailPrice?: number;
  unitPrice?: number;
  originalPrice?: number;
  discountPercent?: number;
  quantity: number;
  maxQty?: number;
  stockQty?: number;
  stockStatus?: string;
  subtotal: number;
  notes?: string;
  isMedicine?: boolean;
}

export interface Cart {
  items: CartItem[];
  totalItems: number;
  totalQuantity?: number;
  totalAmount: number;
  totalOriginalAmount?: number;
  discountAmount?: number;
}
