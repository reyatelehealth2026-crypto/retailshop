import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { productApi } from '@/api/productApi';
import { categoryApi } from '@/api/categoryApi';
import type { Product, ProductFilter } from '@/types/product';

const PRODUCTS_QUERY_KEY = 'products';

export const useProducts = (filter: ProductFilter) => {
  return useInfiniteQuery({
    queryKey: [PRODUCTS_QUERY_KEY, filter],
    queryFn: ({ pageParam = 1 }) =>
      productApi.getProducts({ ...filter, page: pageParam }),
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.hasMore || lastPage.pagination.hasNext) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
  });
};

export const useProduct = (sku: string) => {
  return useQuery<Product, Error>({
    queryKey: [PRODUCTS_QUERY_KEY, 'detail', sku],
    queryFn: async () => {
      const response = await productApi.getProductBySku(sku);
      return response.product;
    },
    enabled: !!sku,
  });
};

export const useFeaturedProducts = (limit: number = 10) => {
  return useQuery({
    queryKey: [PRODUCTS_QUERY_KEY, 'featured', limit],
    queryFn: () => productApi.getFeaturedProducts(limit),
  });
};

export const useNewProducts = (limit: number = 10) => {
  return useQuery({
    queryKey: [PRODUCTS_QUERY_KEY, 'new', limit],
    queryFn: () => productApi.getNewArrivals(limit),
  });
};

export const useBestsellerProducts = (limit: number = 10) => {
  return useQuery({
    queryKey: [PRODUCTS_QUERY_KEY, 'bestseller', limit],
    queryFn: () => productApi.getPromotionProducts(limit),
  });
};

export const useFlashSaleProducts = () => {
  return useQuery({
    queryKey: [PRODUCTS_QUERY_KEY, 'flash-sale'],
    queryFn: () => productApi.getPromotionProducts(8),
  });
};

export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.getCategories(),
  });
};

export const useSearchProducts = (query: string, limit: number = 20) => {
  return useQuery({
    queryKey: [PRODUCTS_QUERY_KEY, 'search', query, limit],
    queryFn: () => productApi.searchProducts(query, { limit }),
    enabled: query.length >= 2,
  });
};

export const useRelatedProducts = (sku: string, limit: number = 8) => {
  return useQuery({
    queryKey: [PRODUCTS_QUERY_KEY, 'related', sku, limit],
    queryFn: () => productApi.getProductBySku(sku).then(res => res.product.relatedProducts || []),
    enabled: !!sku,
  });
};
