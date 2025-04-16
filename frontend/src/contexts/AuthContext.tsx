import React, { createContext, useState, useEffect, useContext } from 'react';
import { authAPI } from '../lib/api';
import { useRouter } from 'next/router';
import { jwtDecode } from 'jwt-decode';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  company_id: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  validateEmail: (email: string) => Promise<any>;
  register: (userData: any) => Promise<void>;
  isAuthenticated: boolean;
  isSuperadmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false,
  error: null,
  login: async () => {},
  logout: () => {},
  validateEmail: async () => ({}),
  register: async () => {},
  isAuthenticated: false,
  isSuperadmin: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Check for saved auth state on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Try to get token from localStorage first
        let token = localStorage.getItem('accessToken');
        let userStr = localStorage.getItem('user');
        
        // If not found in localStorage, try cookies
        if (!token || !userStr) {
          const cookies = document.cookie.split(';');
          const tokenCookie = cookies.find(cookie => cookie.trim().startsWith('accessToken='));
          const userCookie = cookies.find(cookie => cookie.trim().startsWith('user='));
          
          if (tokenCookie) {
            token = tokenCookie.split('=')[1];
          }
          
          if (userCookie) {
            userStr = decodeURIComponent(userCookie.split('=')[1]);
          }
        }

        if (!token || !userStr) {
          setLoading(false);
          return;
        }

        // Check if token is expired
        try {
          const decoded: any = jwtDecode(token);
          const currentTime = Date.now() / 1000;
          
          if (decoded.exp < currentTime) {
            // Token expired, try to refresh
            let refreshToken = localStorage.getItem('refreshToken');
            
            // If not in localStorage, try cookies
            if (!refreshToken) {
              const cookies = document.cookie.split(';');
              const refreshCookie = cookies.find(cookie => cookie.trim().startsWith('refreshToken='));
              
              if (refreshCookie) {
                refreshToken = refreshCookie.split('=')[1];
              }
            }
            
            if (!refreshToken) {
              throw new Error('No refresh token available');
            }
            
            const response = await authAPI.refreshToken(refreshToken);
            localStorage.setItem('accessToken', response.data.accessToken);
            document.cookie = `accessToken=${response.data.accessToken}; path=/; max-age=86400; SameSite=Lax`;
          }
          
          // Set user from localStorage
          setUser(JSON.parse(userStr));
        } catch (err) {
          // Token is invalid or refresh failed
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          document.cookie = 'accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          document.cookie = 'user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        }
      } catch (err) {
        console.error('Auth check error:', err);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Login function
  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authAPI.login({ email, password });
      const { accessToken, refreshToken, user } = response.data;
      
      // Save tokens and user data
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Also save as cookies for SSR support
      document.cookie = `accessToken=${accessToken}; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `refreshToken=${refreshToken}; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `user=${encodeURIComponent(JSON.stringify(user))}; path=/; max-age=86400; SameSite=Lax`;
      
      setUser(user);
      
      // Redirect based on role
      if (user.role === 'superadmin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      const message = err.response?.data?.message || 'Login failed. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    // Clear localStorage
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    
    // Clear cookies
    document.cookie = 'accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    
    setUser(null);
    router.push('/auth/login');
  };

  // Email validation for registration
  const validateEmail = async (email: string) => {
    try {
      const response = await authAPI.validateEmail(email);
      return response.data;
    } catch (err: any) {
      const message = err.response?.data?.message || 'Email validation failed';
      setError(message);
      throw err;
    }
  };

  // Registration function
  const register = async (userData: any) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authAPI.register(userData);
      const { accessToken, refreshToken } = response.data;
      
      // Get user data
      const userResponse = await authAPI.login({
        email: userData.email,
        password: userData.password
      });
      
      // Save tokens and user data
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(userResponse.data.user));
      
      setUser(userResponse.data.user);
      
      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err: any) {
      const message = err.response?.data?.message || 'Registration failed. Please try again.';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        loading, 
        error,
        login,
        logout,
        validateEmail,
        register,
        isAuthenticated: !!user,
        isSuperadmin: user?.role === 'superadmin'
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
