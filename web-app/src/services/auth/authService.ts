import { apiClient } from '../api/client';
import { AUTH_ENDPOINTS } from '../api/config';
import { tokenService } from './tokenService';
import type { TokenResponse, UserProfile, MessageResponse } from './types';

export const authService = {
  async signup(fullName: string, email: string, password: string): Promise<TokenResponse> {
    const response = await apiClient.post<TokenResponse>(AUTH_ENDPOINTS.SIGNUP, {
      full_name: fullName,
      email,
      password,
    });
    const data = response.data;
    tokenService.setTokens(data.access_token, data.refresh_token);
    return data;
  },

  async login(email: string, password: string): Promise<TokenResponse> {
    const response = await apiClient.post<TokenResponse>(AUTH_ENDPOINTS.LOGIN, {
      email,
      password,
    });
    const data = response.data;
    tokenService.setTokens(data.access_token, data.refresh_token);
    return data;
  },

  async googleLogin(idToken: string): Promise<TokenResponse> {
    const response = await apiClient.post<TokenResponse>(AUTH_ENDPOINTS.GOOGLE, {
      id_token: idToken,
    });
    const data = response.data;
    tokenService.setTokens(data.access_token, data.refresh_token);
    return data;
  },

  async refresh(): Promise<TokenResponse> {
    const refreshToken = tokenService.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    const response = await apiClient.post<TokenResponse>(AUTH_ENDPOINTS.REFRESH, {
      refresh_token: refreshToken,
    });
    const data = response.data;
    tokenService.setTokens(data.access_token, data.refresh_token);
    return data;
  },

  async logout(): Promise<void> {
    const refreshToken = tokenService.getRefreshToken();
    if (refreshToken) {
      try {
        await apiClient.post<MessageResponse>(AUTH_ENDPOINTS.LOGOUT, {
          refresh_token: refreshToken,
        });
      } catch (err) {
        console.warn('Logout endpoint call failed, clearing tokens locally.', err);
      }
    }
    tokenService.clearTokens();
  },

  async getCurrentUser(): Promise<UserProfile> {
    const response = await apiClient.get<UserProfile>(AUTH_ENDPOINTS.ME);
    return response.data;
  },
};
