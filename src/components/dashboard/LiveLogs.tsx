/**
 * @fileoverview Live Logs Component
 *
 * Componente que muestra logs en tiempo real del bot.
 * Incluye diferentes tipos de logs con íconos y colores.
 *
 * @author Syro Frontend Team
 * @version 1.0.0
 * @since 2024
 */

import React, { useRef } from "react";
import { Activity, Users, Shield, Hash, AlertTriangle, Bomb, Megaphone, RefreshCw } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useMinimalRealtimeAPI } from '../../hooks/useSmartAPI';

interface LogEntry {
  _id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  userId?: string;
  username?: string;
  userAvatar?: string;
  channelId?: string;
  channelName?: string;
  roleId?: string;
  roleName?: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  metadata?: any;
}

interface LiveLogsProps {
  guildId?: string;
}

/**
 * Componente LiveLogs
 * Muestra logs en tiempo real del bot.
 *
 * @component
 * @param {string} guildId - ID del servidor seleccionado
 */
const LiveLogs: React.FC<LiveLogsProps> = ({ guildId }) => {
  const { isDarkMode } = useTheme();
  const logsContainerRef = useRef<HTMLDivElement>(null);
  
  // Use smart API hook for real-time logs
  const { data: logsData, loading, error, refetch, lastUpdated } = useMinimalRealtimeAPI<{ success: boolean; logs: LogEntry[] }>({
    url: guildId ? `/api/logs/${guildId}?limit=30` : '',
    enabled: !!guildId,
    onError: (error: Error) => {
      console.warn('⚠️ Error fetching logs:', error.message);
    }
  });

  const logs = logsData?.logs || [];
  const getLogIcon = (type: string) => {
    switch (type) {
      case 'user_join': return <Users size={14} />;
      case 'user_leave': return <Users size={14} />;
      case 'role_assigned': return <Shield size={14} />;
      case 'role_removed': return <Shield size={14} />;
      case 'raid_detected': return <AlertTriangle size={14} />;
      case 'raid_ended': return <AlertTriangle size={14} />;
      case 'channel_created': return <Hash size={14} />;
      case 'channel_deleted': return <Hash size={14} />;
      case 'lockdown_started': return <Shield size={14} />;
      case 'lockdown_ended': return <Shield size={14} />;
      case 'spam_detected': return <AlertTriangle size={14} />;
      case 'welcome_sent': return <Users size={14} />;
      case 'boost_detected': return <Activity size={14} />;
      case 'automod_action': return <AlertTriangle size={14} />;
      case 'channel_nuke': return <Bomb size={14} />;
      case 'announcement_sent': return <Megaphone size={14} />;
      default: return <Activity size={14} />;
    }
  };

  // Función para obtener el color según el tipo de log
  const getLogColor = (type: string) => {
    switch (type) {
      case 'user_join': return 'text-green-500';
      case 'user_leave': return 'text-gray-500';
      case 'role_assigned': return 'text-blue-500';
      case 'role_removed': return 'text-gray-500';
      case 'raid_detected': return 'text-red-500';
      case 'raid_ended': return 'text-green-500';
      case 'channel_created': return 'text-purple-500';
      case 'channel_deleted': return 'text-gray-500';
      case 'lockdown_started': return 'text-orange-500';
      case 'lockdown_ended': return 'text-green-500';
      case 'spam_detected': return 'text-red-500';
      case 'welcome_sent': return 'text-blue-500';
      case 'boost_detected': return 'text-purple-500';
      case 'automod_action': return 'text-orange-500';
      case 'channel_nuke': return 'text-red-500';
      case 'announcement_sent': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  // Función para formatear la fecha
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Auto-scroll al último log when new logs arrive
  React.useEffect(() => {
    if (logsContainerRef.current && logs.length > 0) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className={`w-[48rem] h-[23rem] backdrop-blur-sm rounded-2xl p-6 transition-colors duration-300 ${
      isDarkMode ? 'bg-[#181c24]' : 'bg-white'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-md font-bold bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent uppercase flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
          <span className="text-left">LOGS EN TIEMPO REAL</span>
        </h2>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Última actualización: {lastUpdated.toLocaleTimeString('es-ES', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          )}
          <button
            onClick={() => refetch()}
            disabled={loading}
            className={`p-2 rounded-lg ${
              loading 
                ? 'opacity-50 cursor-not-allowed bg-gray-200 dark:bg-gray-700' 
                : 'bg-gradient-to-r from-green-400 to-green-600 hover:from-green-500 hover:to-green-700 shadow-md hover:shadow-lg'
            }`}
            title="Actualizar logs"
          >
            <RefreshCw 
              size={14} 
              className={`${loading ? 'animate-spin' : ''} text-white`} 
            />
          </button>
        </div>
      </div>
      
      {/* Contenedor de logs con scroll */}
      <div 
        ref={logsContainerRef}
        className="h-[calc(100%-3rem)] overflow-y-auto space-y-2 pr-2"
      >
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500 mx-auto mb-2"></div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Cargando logs...
              </p>
            </div>
          </div>
        )}
        
        {error && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <AlertTriangle className={`w-8 h-8 mx-auto mb-2 text-red-500`} />
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {error.message.includes('Rate limited') 
                  ? 'Rate limit alcanzado. Reanudando en 2 minutos...'
                  : 'Error cargando logs'
                }
              </p>
              {!error.message.includes('Rate limited') && (
                <button
                  onClick={() => {
                    refetch();
                  }}
                  className={`mt-2 px-3 py-1 text-xs rounded-md transition-colors duration-200 ${
                    isDarkMode 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  Reintentar
                </button>
              )}
            </div>
          </div>
        )}
        
        {!loading && !error && logs.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Activity className={`w-8 h-8 mx-auto mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Esperando eventos...
              </p>
            </div>
          </div>
        )}
        
        {!loading && !error && logs.length > 0 && (
          logs.map((log) => (
            <div 
              key={log._id}
              className={`flex items-start gap-3 p-3 rounded-lg transition-colors duration-200 ${
                isDarkMode ? 'bg-gray-800/50 hover:bg-gray-800' : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <div className={`flex-shrink-0 mt-0.5 ${getLogColor(log.type)}`}>
                {getLogIcon(log.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {log.title}
                </p>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {log.description}
                </p>
                {log.username && (
                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Usuario: {log.username}
                  </p>
                )}
              </div>
              <div className={`flex-shrink-0 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {formatTime(log.timestamp)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LiveLogs; 