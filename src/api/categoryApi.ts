/**
 * Category API
 * API สำหรับจัดการหมวดหมู่สินค้า - เชื่อมต่อกับ Backend PHP จริง
 */

import { apiClient } from './client';
import type { Category } from '@/types/category';

interface CategoriesResponse {
  categories: Category[];
  flat: Category[];
}

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '');

const mapCategory = (category: Category): Category => {
  const subcategories = (category.subcategories || category.children || []).map(mapCategory);
  return {
    ...category,
    slug: category.slug || slugify(category.name),
    children: subcategories,
    subcategories,
  };
};

/**
 * Get all categories
 * GET /api/categories
 */
export const getCategories = async (options: { 
  withProducts?: boolean; 
  limit?: number;
  parentId?: number | null;
} = {}): Promise<Category[]> => {
  const params: Record<string, string | number | boolean | undefined> = {};
  
  if (options.withProducts) {
    params.with_products = true;
    params.limit = options.limit || 4;
  }
  
  if (options.parentId !== undefined && options.parentId !== null) {
    params.parent_id = options.parentId;
  }

  const response = await apiClient.get<CategoriesResponse>('/categories', params);

  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to fetch categories');
  }

  return (response.data.categories || []).map(mapCategory);
};

/**
 * Get category by ID
 * Note: The PHP API doesn't have a direct endpoint for this, 
 * so we fetch all and filter
 */
export const getCategoryById = async (id: number): Promise<Category | null> => {
  const categories = await getCategories();
  return categories.find(c => c.id === id) || null;
};

/**
 * Get category by slug
 */
export const getCategoryBySlug = async (slug: string): Promise<Category | null> => {
  const categories = await getCategories();
  return categories.find(c => c.slug === slug) || null;
};

/**
 * Get main categories (top-level)
 * GET /api/categories?parent_id=null
 */
export const getMainCategories = async (): Promise<Category[]> => {
  return getCategories();
};

/**
 * Get subcategories by parent ID
 * GET /api/categories?parent_id={parentId}
 */
export const getSubcategories = async (parentId: number): Promise<Category[]> => {
  const categories = await getCategories();
  const parent = categories.find(category => category.id === parentId);
  return parent?.subcategories || [];
};

/**
 * Get categories with products for home page
 */
export const getCategoriesWithProducts = async (productLimit: number = 4): Promise<Category[]> => {
  return getCategories({ withProducts: true, limit: productLimit });
};

// Export all functions
export const categoryApi = {
  getCategories,
  getCategoryById,
  getCategoryBySlug,
  getMainCategories,
  getSubcategories,
  getCategoriesWithProducts,
};

export default categoryApi;
