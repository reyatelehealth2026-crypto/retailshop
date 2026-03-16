import type { Product } from './product';

export interface Category {
  id: number;
  name: string;
  nameEn?: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  icon?: string;
  parentId?: number;
  children?: Category[];
  subcategories?: Category[];
  sortOrder?: number;
  displayOrder?: number;
  isActive?: boolean;
  showInMenu?: boolean;
  productCount?: number;
  products?: Product[];
  level?: number;
}
