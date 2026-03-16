export interface Product {
  id: number;
  sku: string;
  barcode?: string;
  name: string;
  nameEn?: string;
  description?: string;
  shortDescription?: string;
  
  // Pricing
  retailPrice: number;
  originalPrice?: number;
  memberPrice?: number;
  wholesalePrice?: number;
  costPrice?: number;
  discountPercent?: number;
  
  // Stock
  stockQty: number;
  stockStatus?: 'in_stock' | 'low_stock' | 'out_of_stock';
  reservedQty?: number;
  availableQty?: number;
  lowStockThreshold?: number;
  
  // Images
  imageUrl: string;
  imageGallery?: string[];
  gallery?: string[];
  
  // Category
  categoryId?: number;
  categoryName?: string;
  category?: {
    id: number;
    name: string;
    slug: string;
  };
  subcategory?: {
    id: number;
    name: string;
    slug: string;
  };
  
  // Tags
  tags?: string[];
  
  // Status
  isActive?: boolean;
  isRetailActive?: boolean;
  isFeatured: boolean;
  isNew: boolean;
  isBestseller: boolean;
  
  // Min/Max order
  minOrderQty?: number;
  maxOrderQty?: number;
  
  // Rating
  rating?: number;
  reviewCount?: number;
  soldCount?: number;
  viewCount?: number;
  
  // Medicine info
  isMedicine?: boolean;
  drugType?: 'general' | 'dangerous' | 'special';
  dosage?: string;
  sideEffects?: string;
  warnings?: string;
  
  // Promotion
  promotionLabel?: string;
  promotionEndDate?: string;
  
  // SEO
  metaTitle?: string;
  metaDescription?: string;
  slug?: string;
  
  // Odoo
  odooProductId?: number;
  lastSyncAt?: string;
  
  // Related products
  relatedProducts?: Product[];
  
  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductCategory {
  id: number;
  name: string;
  nameEn?: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  icon?: string;
  parentId?: number;
  children?: ProductCategory[];
  subcategories?: ProductCategory[];
  sortOrder?: number;
  displayOrder?: number;
  isActive?: boolean;
  showInMenu?: boolean;
  productCount?: number;
  products?: Product[];
}

export interface CartItem {
  cartId?: number;
  productId: number;
  sku: string;
  name: string;
  imageUrl: string;
  price?: number;
  retailPrice?: number;
  unitPrice?: number;
  originalPrice?: number;
  quantity: number;
  maxQty?: number;
  stockQty?: number;
  stockStatus?: string;
  subtotal: number;
  notes?: string;
  isMedicine?: boolean;
  shortDescription?: string;
}

export interface Cart {
  items: CartItem[];
  totalItems: number;
  totalQuantity?: number;
  totalAmount: number;
  totalOriginalAmount?: number;
  discountAmount?: number;
}

export interface ProductFilter {
  category?: string | number;
  categoryId?: number;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'popular' | 'price_asc' | 'price_desc' | 'name_asc' | 'name_desc' | 'new';
  sortBy?: 'popular' | 'price_asc' | 'price_desc' | 'newest' | 'rating';
  filter?: 'promotion' | 'new' | 'bestseller' | 'in_stock';
  inStock?: boolean;
  page: number;
  limit: number;
}

export interface ProductListResponse {
  products: Product[];
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

export interface ProductDetailResponse {
  product: Product;
}
