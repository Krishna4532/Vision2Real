import type { Role } from '@/types/roles';

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  auth_provider: string;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  last_login_at?: string | null;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: UserProfile;
}

export interface MessageResponse {
  message: string;
}
