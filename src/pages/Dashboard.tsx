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
import { useLocation } from 'react-router-dom';

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
  const [showChart, setShowChart] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const location = useLocation();
  const [showBotMissingModal, setShowBotMissingModal] = useState(false);
  const [selectedGuildWithoutBot, setSelectedGuildWithoutBot] = useState<Guild | null>(null);

  // Handler para cambio de guild con verificación de bot
  const handleGuildChange = async (newGuildId: string) => {
    // Verificar si el bot está en el servidor seleccionado
    try {
      const response = await fetch(`/api/guilds`);
      if (response.ok) {
        const data = await response.json();
        const botGuilds = data.guilds || [];
        const botIsInGuild = botGuilds.some((guild: any) => guild.id === newGuildId);
        if (!botIsInGuild) {
          // Bot no está en este servidor
          const selectedGuild = availableGuilds.find(guild => guild.id === newGuildId) || null;
          setSelectedGuildWithoutBot(selectedGuild);
          setShowBotMissingModal(true);
          return; // No cambiar el guildId
        }
      }
    } catch (error) {
      console.error('Error verificando si el bot está en el servidor:', error);
    }
    // Si el bot está presente, cambiar normalmente
    if (onGuildChange) onGuildChange(newGuildId);
  };

  // Leer error de la URL
  const params = new URLSearchParams(location.search);
  const error = params.get('error');

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

  // Eliminado el delay de showChart

  return (
    <div className="relative min-h-screen w-full">
      {/* Mensaje de error de login/OAuth2 */}
      {error && (
        <div className="rounded-lg bg-red-100 border border-red-400 text-red-700 text-center">
          {error === 'oauth_rate_limit' && 'Discord está limitando los inicios de sesión. Espera unos minutos e inténtalo de nuevo.'}
          {error === 'oauth_failed' && 'Hubo un problema con el login de Discord. Intenta de nuevo.'}
          {error === 'session_save' && 'Error guardando la sesión. Intenta de nuevo.'}
          {error === 'no_code' && 'No se recibió el código de Discord. Intenta de nuevo.'}
          {!['oauth_rate_limit','oauth_failed','session_save','no_code'].includes(error) && 'Error desconocido: ' + error}
        </div>
      )}
      {/* Contenido principal */}
      {showChart && (
        <div className={`${
          isMobile 
            ? '' 
            : ' '
        }`}>
          {/* Grid de 2 columnas en desktop, 1 en móvil */}
          <div className={`${
            isMobile 
              ? 'space-y-6' 
              : 'grid grid-cols-2 gap-6'
          }`}>
            {/* Gráfico de estadísticas */}
            <div className="w-full h-[23rem]">
              <JoinsChart guildId={guildId} />
            </div>
            
            {/* Panel de logs en tiempo real */}
            <div className="w-full h-[23rem]">
              <LiveLogs guildId={guildId} />
            </div>
          </div>
          
          {/* Segunda fila - Opciones generales y cuadrado vacío */}
          <div className={`${
            isMobile 
              ? 'mt-6 space-y-6' 
              : 'mt-6 grid grid-cols-2 gap-6'
          }`}>
            {/* Opciones generales */}
            <div className="w-full h-[23rem]">
              <GeneralOptions guildId={guildId} />
            </div>
            
            {/* Cuadrado vacío - para futuras funcionalidades */}
            <div className={`w-full h-[23rem] rounded-2xl border-2 border-dashed transition-colors ${
              isDarkMode 
                ? 'border-gray-700' 
                : 'border-gray-300'
            }`}>
              <div className="flex items-center justify-center h-full">
                <div className={`text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}> 
                  <div className="text-4xl mb-2">📦</div>
                  <p className="text-sm font-medium">Nueva funcionalidad</p>
                  <p className="text-xs mt-1">Próximamente</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Announcement Warning */}
      <AnnouncementWarning 
        guildId={guildId} 
        user={user} 
        availableGuilds={availableGuilds}
        onGuildChange={handleGuildChange}
      />
      {/* Modal de bot faltante */}
      {showBotMissingModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`relative rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border-2 ${
            isDarkMode 
              ? 'bg-gradient-to-br from-[#181c24] via-[#101010] to-[#23272f] border-[#23272f]' 
              : 'bg-gradient-to-br from-white via-orange-50 to-orange-100 border-orange-100'
          }`}>
            {/* Header con gradiente */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold">Bot no encontrado</h3>
                  <p className="text-blue-100 text-sm">Servidor: {selectedGuildWithoutBot?.name || 'Servidor desconocido'}</p>
                </div>
              </div>
            </div>
            {/* Contenido */}
            <div className="p-6">
              <p className={`text-sm leading-relaxed mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                El bot de Syro no está presente en este servidor. Para configurar el canal de anuncios, necesitas invitar el bot primero.
              </p>
              {/* Botones */}
              <div className="space-y-3">
                <button
                  onClick={() => {
                    if (selectedGuildWithoutBot) {
                      const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${process.env.REACT_APP_BOT_CLIENT_ID || ''}&permissions=8&scope=bot%20applications.commands&guild_id=${selectedGuildWithoutBot.id}`;
                      window.open(inviteUrl, '_blank');
                    }
                    setShowBotMissingModal(false);
                  }}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 px-4 rounded-xl font-semibold"
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Invitar Bot al Servidor
                  </div>
                </button>
                <button
                  onClick={() => {
                    setShowBotMissingModal(false);
                    // Buscar un servidor donde sí esté el bot
                    fetch('/api/guilds')
                      .then(res => res.json())
                      .then(data => {
                        const botGuilds = data.guilds || [];
                        const guildWithBot = availableGuilds.find(guild =>
                          botGuilds.some((botGuild: any) => botGuild.id === guild.id)
                        );
                        if (guildWithBot && onGuildChange) {
                          onGuildChange(guildWithBot.id);
                        }
                      });
                  }}
                  className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-200 border-2 ${isDarkMode
                    ? 'border-gray-600 text-gray-300 hover:border-blue-500 hover:text-blue-400'
                    : 'border-gray-300 text-gray-600 hover:border-blue-500 hover:text-blue-600'
                    }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    Cambiar a otro Servidor
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
 
export default Dashboard; 