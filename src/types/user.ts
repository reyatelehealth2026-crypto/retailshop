export interface User {
  id?: number;
  userId?: number;
  lineUserId: string;
  displayName?: string | null;
  pictureUrl?: string | null;
  email?: string;
  phone?: string;
  
  // Profile
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  
  // Member info
  memberCode?: string;
  memberLevel?: 'standard' | 'bronze' | 'silver' | 'gold' | 'platinum';
  memberTier?: 'standard' | 'bronze' | 'silver' | 'gold' | 'platinum' | string;
  points?: number;
  memberPoints?: number;
  memberSince?: string;
  
  // Addresses
  addresses?: ShippingAddress[];
  defaultAddressId?: number;
  
  // Status
  isNewUser?: boolean;
  cartCount?: number;
  orderCount?: number;
  totalSpent?: number;
  
  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}

export interface ShippingAddress {
  id?: number;
  name: string;
  phone: string;
  address: string;
  district?: string;
  subdistrict?: string;
  province?: string;
  postalCode?: string;
  isDefault?: boolean;
}

export interface UserProfile {
  displayName: string;
  pictureUrl?: string;
  email?: string;
  phone?: string;
}

export interface LineLoginRequest {
  lineUserId: string;
  displayName?: string;
  pictureUrl?: string;
  statusMessage?: string;
  idToken?: string;
}

export interface LineLoginResponse {
  success: boolean;
  user: User;
  token: string;
  isNewUser: boolean;
}
