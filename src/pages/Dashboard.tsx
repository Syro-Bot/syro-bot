/**
 * @fileoverview Dashboard Page
 *
 * Página principal del dashboard de Syro. Muestra la bienvenida, gráfico de joins y logs en tiempo real.
 * Incluye animaciones y layout responsivo.
 *
 * @author Syro Frontend Team
 * @version 1.0.0
 * @since 2024
 */

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useTheme } from '../contexts/ThemeContext';
import { useAnimation } from '../contexts/AnimationContext';
import JoinsChart from '../components/dashboard/JoinsChart';
import LiveLogs from '../components/dashboard/LiveLogs';
import GeneralOptions from '../components/dashboard/GeneralOptions';

/**
 * Componente Dashboard
 * Muestra la bienvenida, gráfico de joins y panel de logs en tiempo real.
 *
 * @component
 * @param {object} user - Usuario autenticado
 * @param {string} guildId - ID del servidor seleccionado
 */
const Dashboard: React.FC<{ user: any; guildId?: string }> = ({ user, guildId }) => {
  const { isDarkMode } = useTheme();
  const { dashboardAnimationComplete, markDashboardAnimationComplete } = useAnimation();
  const textRef = useRef<HTMLDivElement>(null);
  const [showChart, setShowChart] = useState(false);

  useEffect(() => {
    document.title = "Syro - Dashboard";
    
    if (textRef.current) {
      if (!dashboardAnimationComplete) {
        // Solo ejecutar la animación si no se ha completado antes
        // Estado inicial: perfectamente centrado en pantalla
        gsap.set(textRef.current, { opacity: 0, scale: 0.8, xPercent: -50, yPercent: -50, left: '55%', top: '50%', position: 'fixed' });
        // Fade in y scale up centrado
        gsap.to(textRef.current, { opacity: 1, scale: 1, duration: 0.5, ease: "power2.out" });
        // Luego de 0.8s, desplazar solo un poco hacia arriba y a la izquierda y achicar
        gsap.to(textRef.current, {
          delay: 0.8,
          duration: 0.7,
          left: '6rem',
          top: '6rem',
          xPercent: 0,
          yPercent: 0,
          scale: 0.4,
          ease: "power3.inOut",
          onComplete: () => {
            markDashboardAnimationComplete();
          }
        });
      } else {
        // Si la animación ya se completó, establecer directamente el estado final
        gsap.set(textRef.current, { 
          opacity: 1, 
          scale: 0.4, 
          left: '6rem', 
          top: '6rem', 
          xPercent: 0, 
          yPercent: 0, 
          position: 'fixed' 
        });
      }
    }
  }, [user, dashboardAnimationComplete, markDashboardAnimationComplete]);

  // Mostrar gráfico después de la animación
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowChart(true);
    }, dashboardAnimationComplete ? 100 : 2000); // Si ya se completó, mostrar inmediatamente

    return () => clearTimeout(timer);
  }, [dashboardAnimationComplete]);

  return (
    <div className="relative h-screen w-full">
      <div ref={textRef} className="">
        <h1 className="text-7xl font-extrabold bg-gradient-to-r from-blue-400 via-blue-600 to-blue-900 bg-clip-text text-transparent uppercase leading-none text-center">
          Welcome {user?.username?.toUpperCase()}
        </h1>
      </div>
      
      {/* Gráfico de estadísticas */}
      {showChart && (
        <div className="absolute top-16 left-6 z-0">
          <JoinsChart guildId={guildId} />
        </div>
      )}

      {/* Panel de logs en tiempo real */}
      {showChart && (
        <div className="absolute top-16 right-6 z-0">
          <LiveLogs guildId={guildId} />
        </div>
      )}

      {/* Opciones generales */}
      {showChart && (
        <div className="absolute bottom-0 left-6 z-0">
          <GeneralOptions guildId={guildId} />
        </div>
      )}
    </div>
  );
};
 
export default Dashboard; 