/**
 * @fileoverview Announcement Warning Component
 *
 * Componente que muestra un warning centrado cuando el servidor no tiene configurado
 * un canal de announcement. Aparece con fondo blur y no se puede cerrar hasta configurarlo.
 *
 * @author Syro Frontend Team
 * @version 1.0.0
 * @since 2024
 */

import React, { useState, useEffect } from "react";
import { Megaphone, Settings, X, CheckCircle } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { API_BASE_URL } from '../../config/constants';

interface Channel {
  id: string;
  name: string;
  type: number;
  position: number;
  parent?: string;
  parentId?: string;
}

interface AnnouncementWarningProps {
  guildId?: string;
  user?: any;
}

/**
 * Componente AnnouncementWarning
 * Muestra un warning cuando no hay canal de announcement configurado.
 *
 * @component
 * @param {string} guildId - ID del servidor seleccionado
 * @param {object} user - Usuario autenticado
 */
const AnnouncementWarning: React.FC<AnnouncementWarningProps> = ({ guildId, user }) => {
  const { isDarkMode } = useTheme();
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [configuring, setConfiguring] = useState(false);

  // Check if announcement channel is configured
  useEffect(() => {
    if (guildId) {
      checkConfiguration();
    }
  }, [guildId]);

  const checkConfiguration = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/announcement-config/${guildId}`);
      const data = await response.json();
      
      if (data.success) {
        setIsConfigured(data.configured);
      } else {
        setIsConfigured(false);
      }
    } catch (error) {
      console.error('Error checking announcement configuration:', error);
      setIsConfigured(false);
    }
  };

  const loadChannels = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/channels/${guildId}`);
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
    loadChannels();
    setShowConfigModal(true);
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
      const response = await fetch(`${API_BASE_URL}/api/announcement-config/${guildId}`, {
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

  return (
    <>
      {/* Warning Overlay */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-40">
        <div className={`w-[90vw] max-w-[600px] rounded-2xl transition-colors duration-300 ${
          isDarkMode ? 'bg-[#181c24] border border-gray-700' : 'bg-white border border-gray-200'
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

      {/* Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className={`w-[90vw] max-w-[500px] rounded-2xl transition-colors duration-300 ${
            isDarkMode ? 'bg-[#181c24] border border-gray-700' : 'bg-white border border-gray-200'
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

            {/* Content */}
            <div className="p-6">
              <div className="mb-4">
                <h3 className={`font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Available Channels
                </h3>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {loading ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                      <p className={`text-sm mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Loading channels...
                      </p>
                    </div>
                  ) : (
                    channels.map((channel) => (
                      <button
                        key={channel.id}
                        type="button"
                        onClick={() => setSelectedChannel(channel.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors border text-left
                          ${selectedChannel === channel.id
                            ? isDarkMode
                              ? 'bg-blue-600 text-white border-blue-500'
                              : 'bg-blue-100 text-blue-900 border-blue-400'
                            : isDarkMode
                              ? 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}
                        `}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                        }`}>
                          <Megaphone className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">#{channel.name}</p>
                          <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Text Channel
                          </p>
                        </div>
                        {selectedChannel === channel.id && (
                          <CheckCircle className={`w-5 h-5 ${
                            isDarkMode ? 'text-blue-400' : 'text-blue-500'
                          }`} />
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="flex-1 bg-gray-500 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveConfiguration}
                  disabled={!selectedChannel || configuring}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
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
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Save Configuration
                    </>
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