import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { API_CONFIG } from '../config/apiConfig';

interface User {
  id: string;
  username: string;
  avatar: string;
  discriminator: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: () => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, check authentication status via /api/me and cookie
  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/me`, {
          method: 'GET',
          credentials: 'include', // Use cookie-based JWT
        });
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          console.log('[AUTH] Authenticated as:', data.user.username);
        } else {
          setUser(null);
        }
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = () => {
    console.log('[AUTH] Redirecting to Discord login');
    window.location.href = `${API_CONFIG.BASE_URL}/api/login`;
  };

  const logout = async () => {
    try {
      await fetch(`${API_CONFIG.BASE_URL}/api/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('[AUTH] Error during logout:', error);
    } finally {
      setUser(null);
      console.log('[AUTH] Logged out successfully');
    }
  };

  const isAuthenticated = !!user;

  const value: AuthContextType = {
    user,
    token: null, // No longer used
    loading,
    login,
    logout,
    isAuthenticated
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 