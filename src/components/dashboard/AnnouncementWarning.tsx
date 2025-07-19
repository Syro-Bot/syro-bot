/**
 * @fileoverview Announcement Warning Component
 *
 * Componente que muestra un warning centrado cuando el servidor no tiene configurado
 * un canal de announcement. Aparece con fondo blur y no se puede cerrar hasta configurarlo.
 * Ahora incluye selector de servidor para casos donde el bot se acaba de agregar.
 *
 * @author Syro Frontend Team
 * @version 1.0.0
 * @since 2024
 */

import React, { useState, useEffect } from "react";
import { Megaphone, Settings, X, CheckCircle, Server, ChevronDown } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { API_CONFIG } from '../../config/apiConfig';
const API_BASE_URL = API_CONFIG.BASE_URL;
import { BOT_CLIENT_ID } from '../../config/constants';

interface Channel {
  id: string;
  name: string;
  type: number;
  position: number;
  parent?: string;
  parentId?: string;
}

interface Guild {
  id: string;
  name: string;
  icon?: string;
  permissions: string;
}

interface AnnouncementWarningProps {
  guildId?: string;
  user?: any;
  availableGuilds?: Guild[];
  onGuildChange?: (guildId: string) => void;
}

/**
 * Componente AnnouncementWarning
 * Muestra un warning cuando no hay canal de announcement configurado.
 * Incluye selector de servidor para casos donde el bot se acaba de agregar.
 *
 * @component
 * @param {string} guildId - ID del servidor seleccionado
 * @param {object} user - Usuario autenticado
 * @param {Array} availableGuilds - Lista de servidores disponibles
 * @param {function} onGuildChange - Callback para cambiar el servidor
 */
const AnnouncementWarning: React.FC<AnnouncementWarningProps> = ({ 
  guildId, 
  user, 
  availableGuilds = [],
  onGuildChange 
}) => {
  const { isDarkMode } = useTheme();
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [selectedGuildId, setSelectedGuildId] = useState<string>(guildId || '');
  const [loading, setLoading] = useState(false);
  const [configuring, setConfiguring] = useState(false);
  const [showGuildSelector, setShowGuildSelector] = useState(false);
  const [showBotMissingModal, setShowBotMissingModal] = useState(false);
  const [selectedGuildWithoutBot, setSelectedGuildWithoutBot] = useState<Guild | null>(null);

  // Update selected guild when guildId prop changes
  useEffect(() => {
    if (guildId && guildId !== selectedGuildId) {
      setSelectedGuildId(guildId);
    }
  }, [guildId]);

  // Check if announcement channel is configured
  useEffect(() => {
    if (selectedGuildId) {
      checkBotPresence(selectedGuildId).then((botIsPresent) => {
        if (!botIsPresent) {
          // Si el bot no está, no mostrar el warning de announcement
          setIsConfigured(null);
          const selectedGuild = availableGuilds.find(guild => guild.id === selectedGuildId);
          setSelectedGuildWithoutBot(selectedGuild || null);
          setShowBotMissingModal(true);
        } else {
          checkConfiguration();
        }
      });
    }
  }, [selectedGuildId]);

  const checkConfiguration = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/announcement-config/${selectedGuildId}`);
      if (!response.ok) {
        if (response.status === 429) {
          setIsConfigured(false);
          alert('Estás haciendo demasiadas peticiones. Espera un momento e intenta de nuevo.');
          return;
        }
        setIsConfigured(false);
        return;
      }
      // Verifica que la respuesta sea JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        setIsConfigured(false);
        console.error('Respuesta no es JSON');
        return;
      }
      const data = await response.json();
      setIsConfigured(data.success ? data.configured : false);
    } catch (error) {
      console.error('Error checking announcement configuration:', error);
      setIsConfigured(false);
    }
  };

  const checkBotPresence = async (guildId: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/guilds`);
      if (response.ok) {
        const data = await response.json();
        const botGuilds = data.guilds || [];
        return botGuilds.some((guild: any) => guild.id === guildId);
      }
      return false;
    } catch (error) {
      console.error('Error checking bot presence:', error);
      return false;
    }
  };

  const loadChannels = async () => {
    if (!selectedGuildId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/channels/${selectedGuildId}`);
      const data = await response.json();
      
      if (data.success) {
        const textChannels = data.channels.filter((channel: Channel) => channel.type === 0);
        setChannels(textChannels);
      }
    } catch (error) {
      console.error('Error loading channels:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigure = () => {
    if (availableGuilds.length > 1) {
      setShowGuildSelector(true);
    } else {
      loadChannels();
      setShowConfigModal(true);
    }
  };

  const handleGuildSelect = async (guildId: string) => {
    setSelectedGuildId(guildId);
    if (onGuildChange) {
      onGuildChange(guildId);
    }
    setShowGuildSelector(false);
    
    // Check if bot is present in the selected guild
    const botIsPresent = await checkBotPresence(guildId);
    
    if (!botIsPresent) {
      // Bot is not present, show bot missing modal
      const selectedGuild = availableGuilds.find(guild => guild.id === guildId);
      setSelectedGuildWithoutBot(selectedGuild || null);
      setShowBotMissingModal(true);
    } else {
      // Bot is present, proceed with channel loading
      loadChannels();
      setShowConfigModal(true);
    }
  };

  const handleInviteBot = () => {
    if (selectedGuildWithoutBot) {
      // Generate Discord OAuth2 URL to invite the bot
      const guildId = selectedGuildWithoutBot.id;
      const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${BOT_CLIENT_ID}&permissions=8&scope=bot%20applications.commands&guild_id=${guildId}`;
      window.open(inviteUrl, '_blank');
    }
    setShowBotMissingModal(false);
  };

  const handleSwitchToGuildWithBot = () => {
    setShowBotMissingModal(false);
    // Return to server selection modal instead of auto-selecting
    setShowGuildSelector(true);
  };

  const handleSaveConfiguration = async () => {
    if (!selectedChannel) {
      alert('Please select a channel');
      return;
    }

    const channel = channels.find(c => c.id === selectedChannel);
    if (!channel) {
      alert('Selected channel not found');
      return;
    }

    setConfiguring(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/announcement-config/${selectedGuildId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channelId: selectedChannel,
          channelName: channel.name,
          configuredBy: user?.id || 'unknown'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setIsConfigured(true);
        setShowConfigModal(false);
        alert('✅ Announcement channel configured successfully!');
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error configuring announcement channel:', error);
      alert('❌ Error configuring announcement channel');
    } finally {
      setConfiguring(false);
    }
  };

  // Don't show anything if already configured or still loading
  if (isConfigured === null || isConfigured === true) {
    return null;
  }

  if (showBotMissingModal) {
    return (
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
          <p className={`text-sm leading-relaxed mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            El bot de Syro no está presente en este servidor. Para configurar el canal de anuncios, necesitas invitar el bot primero.
          </p>
          {/* Botones */}
          <div className="space-y-3">
            <button
              onClick={handleInviteBot}
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
              onClick={handleSwitchToGuildWithBot}
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
    );
  }

  return (
    <>
      {/* Warning Overlay */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-40">
        <div className={`w-[90vw] max-w-[600px] rounded-2xl transition-colors duration-300 border-2 ${
          isDarkMode 
            ? 'bg-gradient-to-br from-[#181c24] via-[#101010] to-[#23272f] border-[#23272f]' 
            : 'bg-gradient-to-br from-white via-orange-50 to-orange-100 border-orange-100'
        }`}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                isDarkMode ? 'bg-yellow-500/20' : 'bg-yellow-100'
              }`}>
                <Megaphone className={`w-6 h-6 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
              </div>
              <div>
                <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Announcement Channel Required
                </h2>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Configure a channel to receive important updates and announcements
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="text-center mb-6">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                isDarkMode ? 'bg-yellow-500/20' : 'bg-yellow-100'
              }`}>
                <Megaphone className={`w-8 h-8 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
              </div>
              <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Important Updates Awaiting
              </h3>
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Your server needs to configure an announcement channel to receive important updates, 
                new features, and announcements from the Syro Bot team.
              </p>
            </div>

            {/* Server Selection Info */}
            {availableGuilds.length > 1 && (
              <div className={`p-4 rounded-lg mb-6 ${
                isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-blue-50 border border-blue-200'
              }`}>
                <h4 className={`font-semibold mb-2 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-blue-900'}`}>
                  <Server className="w-4 h-4" />
                  Multiple Servers Available
                </h4>
                <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-blue-700'}`}>
                  You have access to multiple servers. You can select which server to configure 
                  the announcement channel for.
                </p>
              </div>
            )}

            <div className={`p-4 rounded-lg mb-6 ${
              isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50 border border-gray-200'
            }`}>
              <h4 className={`font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                What you'll receive:
              </h4>
              <ul className={`text-sm space-y-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Important bot updates and new features
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Security announcements and maintenance notices
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Tips and best practices for using Syro Bot
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Community updates and announcements
                </li>
              </ul>
            </div>

            {/* Action Button */}
            <div className="text-center">
              <button
                onClick={handleConfigure}
                className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white px-8 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 mx-auto"
              >
                <Settings className="w-5 h-5" />
                Configure Announcement Channel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Server Selection Modal */}
      {showGuildSelector && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className={`w-[90vw] max-w-[500px] rounded-2xl transition-colors duration-300 border-2 ${
            isDarkMode 
              ? 'bg-gradient-to-br from-[#181c24] via-[#101010] to-[#23272f] border-[#23272f]' 
              : 'bg-gradient-to-br from-white via-orange-50 to-orange-100 border-orange-100'
          }`}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'
                }`}>
                  <Server className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                </div>
                <div>
                  <h2 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Select Server
                  </h2>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Choose which server to configure the announcement channel for
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowGuildSelector(false)}
                className={`p-2 rounded-lg transition-colors ${
                  isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
              >
                <X className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
              </button>
            </div>

            {/* Server List */}
            <div className="p-6">
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {availableGuilds.map((guild) => (
                  <button
                    key={guild.id}
                    onClick={() => handleGuildSelect(guild.id)}
                    className={`w-full p-4 rounded-lg border transition-colors text-left flex items-center gap-3 ${
                      isDarkMode 
                        ? 'border-gray-700 hover:border-gray-600 hover:bg-gray-800' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      {guild.icon ? (
                        <img 
                          src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`} 
                          alt={guild.name}
                          className="w-10 h-10 rounded-lg"
                        />
                      ) : (
                        <Server className="w-5 h-5 text-gray-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {guild.name}
                      </h3>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Server ID: {guild.id}
                      </p>
                    </div>
                    <ChevronDown className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bot Missing Modal */}
      {showBotMissingModal && selectedGuildWithoutBot && (
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
                  <p className="text-blue-100 text-sm">Servidor: {selectedGuildWithoutBot.name}</p>
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
                  onClick={handleInviteBot}
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
                  onClick={handleSwitchToGuildWithBot}
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

      {/* Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className={`w-[90vw] max-w-[500px] rounded-2xl transition-colors duration-300 border-2 ${
            isDarkMode 
              ? 'bg-gradient-to-br from-[#181c24] via-[#101010] to-[#23272f] border-[#23272f]' 
              : 'bg-gradient-to-br from-white via-orange-50 to-orange-100 border-orange-100'
          }`}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'
                }`}>
                  <Settings className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                </div>
                <div>
                  <h2 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Select Announcement Channel
                  </h2>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Choose a channel where announcements will be sent
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className={`p-2 rounded-lg transition-colors ${
                  isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
              >
                <X className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
              </button>
            </div>

            {/* Channel Selection */}
            <div className="p-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Loading channels...
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Select a channel:
                  </label>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {channels.map((channel) => (
                      <label
                        key={channel.id}
                        className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedChannel === channel.id
                            ? isDarkMode
                              ? 'border-blue-500 bg-blue-500/20'
                              : 'border-blue-500 bg-blue-50'
                            : isDarkMode
                              ? 'border-gray-700 hover:border-gray-600 hover:bg-gray-800'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="channel"
                          value={channel.id}
                          checked={selectedChannel === channel.id}
                          onChange={(e) => setSelectedChannel(e.target.value)}
                          className="sr-only"
                        />
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          selectedChannel === channel.id
                            ? 'border-blue-500 bg-blue-500'
                            : isDarkMode
                              ? 'border-gray-600'
                              : 'border-gray-400'
                        }`}>
                          {selectedChannel === channel.id && (
                            <div className="w-2 h-2 rounded-full bg-white"></div>
                          )}
                        </div>
                        <span className={`ml-3 font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          #{channel.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowConfigModal(false)}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                    isDarkMode
                      ? 'bg-gray-700 hover:bg-gray-600 text-white'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveConfiguration}
                  disabled={!selectedChannel || configuring}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                    !selectedChannel || configuring
                      ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {configuring ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Configuring...
                    </>
                  ) : (
                    'Configure Channel'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AnnouncementWarning; 