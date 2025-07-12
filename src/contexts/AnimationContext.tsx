/**
 * @fileoverview Animation Context
 *
 * Contexto simple para manejar la animación de bienvenida del dashboard.
 * Permite que la animación se ejecute solo una vez por sesión.
 *
 * @author Syro Frontend Team
 * @version 1.0.0
 * @since 2024
 */

import React, { createContext, useContext, useState, useEffect } from 'react';

interface AnimationContextType {
  dashboardAnimationComplete: boolean;
  markDashboardAnimationComplete: () => void;
}

const AnimationContext = createContext<AnimationContextType | undefined>(undefined);

/**
 * Hook personalizado para usar el contexto de animaciones
 */
export const useAnimation = () => {
  const context = useContext(AnimationContext);
  if (context === undefined) {
    throw new Error('useAnimation must be used within an AnimationProvider');
  }
  return context;
};

/**
 * Proveedor del contexto de animaciones
 */
export const AnimationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dashboardAnimationComplete, setDashboardAnimationComplete] = useState(false);

  // Cargar estado guardado en sessionStorage al inicializar
  useEffect(() => {
    const saved = sessionStorage.getItem('syro-dashboard-animation');
    if (saved === 'true') {
      setDashboardAnimationComplete(true);
    }
  }, []);

  /**
   * Marca la animación del dashboard como completada
   */
  const markDashboardAnimationComplete = () => {
    setDashboardAnimationComplete(true);
    sessionStorage.setItem('syro-dashboard-animation', 'true');
  };

  const value: AnimationContextType = {
    dashboardAnimationComplete,
    markDashboardAnimationComplete,
  };

  return (
    <AnimationContext.Provider value={value}>
      {children}
    </AnimationContext.Provider>
  );
};

export default AnimationContext; 