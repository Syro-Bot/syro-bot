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

  // Check for token in URL on mount (for OAuth callback)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
      // Store token in localStorage
      localStorage.setItem('syro-jwt-token', token);
      // Remove token from URL
      window.history.replaceState({}, document.title, window.location.pathname);
      console.log('[AUTH] Token stored from URL');
    }
  }, []);

  // On mount, check authentication status via /api/me
  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true);
      try {
        // Try to get token from localStorage first
        const token = localStorage.getItem('syro-jwt-token');
        
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/me`, {
          method: 'GET',
          credentials: 'include', // Still try cookies as fallback
          headers,
        });
        
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          console.log('[AUTH] Authenticated as:', data.user.username);
        } else {
          // If token is invalid, remove it
          localStorage.removeItem('syro-jwt-token');
          setUser(null);
        }
      } catch (error) {
        localStorage.removeItem('syro-jwt-token');
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
      // Clear token from localStorage
      localStorage.removeItem('syro-jwt-token');
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