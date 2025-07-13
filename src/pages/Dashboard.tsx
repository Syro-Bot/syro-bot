/**
 * @fileoverview Dashboard Page
 *
 * Página principal del dashboard de Syro. Muestra la bienvenida, gráfico de joins y logs en tiempo real.
 * Incluye animaciones y layout responsivo optimizado para móvil.
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
import AnnouncementWarning from '../components/dashboard/AnnouncementWarning';

interface Guild {
  id: string;
  name: string;
  icon?: string;
  permissions: string;
}

/**
 * Componente Dashboard
 * Muestra la bienvenida, gráfico de joins y panel de logs en tiempo real.
 *
 * @component
 * @param {object} user - Usuario autenticado
 * @param {string} guildId - ID del servidor seleccionado
 * @param {Array} availableGuilds - Lista de servidores disponibles
 * @param {function} onGuildChange - Callback para cambiar el servidor
 */
const Dashboard: React.FC<{ 
  user: any; 
  guildId?: string;
  availableGuilds?: Guild[];
  onGuildChange?: (guildId: string) => void;
}> = ({ user, guildId, availableGuilds = [], onGuildChange }) => {
  const { isDarkMode } = useTheme();
  const { dashboardAnimationComplete, markDashboardAnimationComplete } = useAnimation();
  const textRef = useRef<HTMLDivElement>(null);
  const [showChart, setShowChart] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detectar si es móvil
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    document.title = "Syro - Dashboard";
    
    if (textRef.current) {
      if (!dashboardAnimationComplete) {
        if (isMobile) {
          // Animación móvil: fade in desde arriba
          gsap.set(textRef.current, { 
            opacity: 0, 
            y: -50,
            position: 'relative',
            left: 'auto',
            top: 'auto',
            scale: 1
          });
          gsap.to(textRef.current, { 
            opacity: 1, 
            y: 0, 
            duration: 0.6, 
            ease: "power2.out",
            onComplete: () => {
              markDashboardAnimationComplete();
            }
          });
        } else {
          // Animación desktop: mantener la original
          gsap.set(textRef.current, { 
            opacity: 0, 
            scale: 0.8, 
            xPercent: -50, 
            yPercent: -50, 
            left: '55%', 
            top: '50%', 
            position: 'fixed' 
          });
          gsap.to(textRef.current, { 
            opacity: 1, 
            scale: 1, 
            duration: 0.5, 
            ease: "power2.out" 
          });
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
        }
      } else {
        // Si la animación ya se completó
        if (isMobile) {
          gsap.set(textRef.current, { 
            opacity: 1, 
            y: 0,
            position: 'relative',
            left: 'auto',
            top: 'auto',
            scale: 1
          });
        } else {
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
    }
  }, [user, dashboardAnimationComplete, markDashboardAnimationComplete, isMobile]);

  // Mostrar gráfico después de la animación
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowChart(true);
    }, dashboardAnimationComplete ? 100 : (isMobile ? 800 : 2000));

    return () => clearTimeout(timer);
  }, [dashboardAnimationComplete, isMobile]);

  return (
    <div className="relative min-h-screen w-full">
      {/* Título de bienvenida */}
      <div ref={textRef} className="">
        <h1 className={`font-extrabold bg-gradient-to-r from-blue-400 via-blue-600 to-blue-900 bg-clip-text text-transparent uppercase leading-none text-center ${
          isMobile ? 'text-4xl md:text-5xl' : 'text-7xl'
        }`}>
          Welcome {user?.username?.toUpperCase()}
        </h1>
      </div>
      
      {/* Contenido principal */}
      {showChart && (
        <div className={`${
          isMobile 
            ? 'mt-8 space-y-6 px-4' 
            : 'absolute top-16 left-6 z-0'
        }`}>
          {/* Gráfico de estadísticas */}
          <div className={`${
            isMobile 
              ? 'w-full' 
              : 'w-[48rem]'
          }`}>
            <JoinsChart guildId={guildId} />
          </div>
        </div>
      )}

      {/* Panel de logs en tiempo real */}
      {showChart && (
        <div className={`${
          isMobile 
            ? 'mt-6 px-4' 
            : 'absolute top-16 right-6 z-0'
        }`}>
          <div className={`${
            isMobile 
              ? 'w-full' 
              : 'w-[48rem]'
          }`}>
            <LiveLogs guildId={guildId} />
          </div>
        </div>
      )}

      {/* Opciones generales */}
      {showChart && (
        <div className={`${
          isMobile 
            ? 'mt-6 px-4 mb-8' 
            : 'absolute bottom-0 left-6 z-0'
        }`}>
          <div className={`${
            isMobile 
              ? 'w-full' 
              : 'w-[48rem]'
          }`}>
            <GeneralOptions guildId={guildId} />
          </div>
        </div>
      )}

      {/* Announcement Warning */}
      <AnnouncementWarning 
        guildId={guildId} 
        user={user} 
        availableGuilds={availableGuilds}
        onGuildChange={onGuildChange}
      />
    </div>
  );
};
 
export default Dashboard; 