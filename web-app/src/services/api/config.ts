import { env } from '@/config/env';

const rawApiUrl = env.apiUrl;
// Strip trailing /api/v1 or trailing slash to normalize
export const API_BASE_URL = rawApiUrl.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');

export const API_PREFIX = '/api/v1';
export const AUTH_PREFIX = `${API_PREFIX}/auth`;

export const AUTH_ENDPOINTS = {
  SIGNUP: `${AUTH_PREFIX}/signup`,
  LOGIN: `${AUTH_PREFIX}/login`,
  GOOGLE: `${AUTH_PREFIX}/google`,
  REFRESH: `${AUTH_PREFIX}/refresh`,
  LOGOUT: `${AUTH_PREFIX}/logout`,
  ME: `${AUTH_PREFIX}/me`,
} as const;
