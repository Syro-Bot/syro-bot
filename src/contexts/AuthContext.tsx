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
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Cargar token desde localStorage al inicializar
  useEffect(() => {
    const savedToken = localStorage.getItem('syro-jwt-token');
    if (savedToken) {
      setToken(savedToken);
      // Validar token y obtener datos del usuario
      validateToken(savedToken);
    } else {
      setLoading(false);
    }
  }, []);

  // Verificar si hay token en la URL (después del login)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    
    if (tokenFromUrl) {
      console.log('[AUTH] Token found in URL, saving to localStorage');
      localStorage.setItem('syro-jwt-token', tokenFromUrl);
      setToken(tokenFromUrl);
      
      // Limpiar la URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      
      // Validar token y obtener datos del usuario
      validateToken(tokenFromUrl);
    }
  }, []);

  const validateToken = async (tokenToValidate: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenToValidate}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        console.log('[AUTH] Token validated, user:', data.user.username);
      } else {
        console.log('[AUTH] Token validation failed, clearing token');
        localStorage.removeItem('syro-jwt-token');
        setToken(null);
        setUser(null);
      }
    } catch (error) {
      console.error('[AUTH] Error validating token:', error);
      localStorage.removeItem('syro-jwt-token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = () => {
    console.log('[AUTH] Redirecting to Discord login');
    window.location.href = `${API_CONFIG.BASE_URL}/api/login`;
  };

  const logout = async () => {
    try {
      // Llamar al endpoint de logout (opcional, ya que JWT es stateless)
      if (token) {
        await fetch(`${API_CONFIG.BASE_URL}/api/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
      }
    } catch (error) {
      console.error('[AUTH] Error during logout:', error);
    } finally {
      // Limpiar datos locales
      localStorage.removeItem('syro-jwt-token');
      setToken(null);
      setUser(null);
      console.log('[AUTH] Logged out successfully');
    }
  };

  const isAuthenticated = !!user && !!token;

  const value: AuthContextType = {
    user,
    token,
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