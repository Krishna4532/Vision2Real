import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { Roles } from '@/types/roles';
import { authService } from '@/services/auth/authService';
import { tokenService } from '@/services/auth/tokenService';
import type { UserProfile } from '@/services/auth/types';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<UserProfile>;
  signup: (fullName: string, email: string, password: string) => Promise<UserProfile>;
  googleLogin: (idToken: string) => Promise<UserProfile>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const restoreSession = useCallback(async () => {
    setIsLoading(true);
    const accessToken = tokenService.getAccessToken();
    const refreshToken = tokenService.getRefreshToken();

    if (!accessToken && !refreshToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      // Try to fetch current user profile
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch {
      // Access token might be expired, attempt refresh
      if (refreshToken) {
        try {
          await authService.refresh();
          const refreshedUser = await authService.getCurrentUser();
          setUser(refreshedUser);
        } catch {
          // Token refresh failed, reset session
          tokenService.clearTokens();
          setUser(null);
        }
      } else {
        tokenService.clearTokens();
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const login = async (email: string, password: string): Promise<UserProfile> => {
    const res = await authService.login(email, password);
    setUser(res.user);
    return res.user;
  };

  const signup = async (fullName: string, email: string, password: string): Promise<UserProfile> => {
    const res = await authService.signup(fullName, email, password);
    setUser(res.user);
    return res.user;
  };

  const googleLogin = async (idToken: string): Promise<UserProfile> => {
    const res = await authService.googleLogin(idToken);
    setUser(res.user);
    return res.user;
  };

  const logout = async (): Promise<void> => {
    await authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isAdmin: user?.role === Roles.SUPER_ADMIN,
        isLoading,
        login,
        signup,
        googleLogin,
        logout,
        restoreSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
