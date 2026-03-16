/**
 * Banner API
 * API สำหรับดึงข้อมูลแบนเนอร์ - เชื่อมต่อกับ Backend PHP จริง
 */

import { apiClient } from './client';

export interface Banner {
  id: number;
  title: string | null;
  subtitle: string | null;
  imageUrl: string;
  imageMobileUrl: string | null;
  linkUrl: string | null;
  linkType: 'product' | 'category' | 'page' | 'external';
  linkTarget: string | null;
  position: string;
  displayOrder: number;
}

export type BannerPosition = 'home_top' | 'home_middle' | 'home_bottom' | 'category_page' | 'product_page';

/**
 * Get banners by position
 * GET /api/banners?position={position}
 */
export const getBanners = async (position?: BannerPosition): Promise<Banner[]> => {
  const params: Record<string, string> = {};
  
  if (position) {
    params.position = position;
  }

  const response = await apiClient.get<Banner[]>('/banners/index.php', params);

  if (!response.success || !response.data) {
    // Return empty array if error
    return [];
  }

  return response.data;
};

/**
 * Get home page banners (top section)
 */
export const getHomeTopBanners = async (): Promise<Banner[]> => {
  return getBanners('home_top');
};

/**
 * Get home page middle banners
 */
export const getHomeMiddleBanners = async (): Promise<Banner[]> => {
  return getBanners('home_middle');
};

/**
 * Get home page bottom banners
 */
export const getHomeBottomBanners = async (): Promise<Banner[]> => {
  return getBanners('home_bottom');
};

/**
 * Get all home banners grouped by position
 */
export const getAllHomeBanners = async (): Promise<{
  top: Banner[];
  middle: Banner[];
  bottom: Banner[];
}> => {
  const allBanners = await getBanners();
  
  return {
    top: allBanners.filter(b => b.position === 'home_top'),
    middle: allBanners.filter(b => b.position === 'home_middle'),
    bottom: allBanners.filter(b => b.position === 'home_bottom'),
  };
};

// Export all functions
export const bannerApi = {
  getBanners,
  getHomeTopBanners,
  getHomeMiddleBanners,
  getHomeBottomBanners,
  getAllHomeBanners,
};

export default bannerApi;
