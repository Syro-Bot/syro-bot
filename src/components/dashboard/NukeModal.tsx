/**
 * @fileoverview Nuke Modal Component
 *
 * Modal para la funcionalidad de Nuke que permite eliminar y recrear canales.
 * Muestra todos los canales disponibles del servidor.
 *
 * @author Syro Frontend Team
 * @version 1.0.0
 * @since 2024
 */

import React, { useState, useEffect } from "react";
import { Bomb, AlertTriangle, CheckCircle, Loader } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { API_CONFIG } from '../../config/apiConfig';
const API_BASE_URL = API_CONFIG.BASE_URL;

interface Channel {
  id: string;
  name: string;
  type: number;
  position: number;
  parent?: string;
  parentId?: string;
}

interface NukeModalProps {
  guildId?: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Componente NukeModal
 * Modal para la funcionalidad de Nuke.
 *
 * @component
 * @param {string} guildId - ID del servidor
 * @param {boolean} isOpen - Estado del modal
 * @param {function} onClose - Función para cerrar el modal
 */
const NukeModal: React.FC<NukeModalProps> = ({ guildId, isOpen, onClose }) => {
  const { isDarkMode } = useTheme();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [nuking, setNuking] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Cargar canales del servidor
  useEffect(() => {
    if (isOpen && guildId) {
      loadChannels();
    }
  }, [isOpen, guildId]);

  const loadChannels = async () => {
    setLoading(true);
    try {
      console.log('🔍 Cargando canales para guild:', guildId);
      const response = await fetch(`${API_BASE_URL}/api/channels/${guildId}`);
      const data = await response.json();
      
      console.log('📡 Respuesta del servidor:', data);
      
      if (data.success) {
        // Filtrar solo canales de texto
        const textChannels = data.channels.filter((channel: Channel) => channel.type === 0);
        console.log('📝 Canales de texto encontrados:', textChannels);
        setChannels(textChannels);
      } else {
        console.error('❌ Error en la respuesta:', data.error);
      }
    } catch (error) {
      console.error('❌ Error loading channels:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNuke = async () => {
          if (!selectedChannel) {
        alert('Please select a channel');
        return;
      }

    setNuking(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/nuke/${guildId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channelId: selectedChannel
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert('✅ Channel nuked successfully');
        onClose();
        // Recargar canales
        loadChannels();
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error nuking channel:', error);
              alert('❌ Error nuking the channel');
    } finally {
      setNuking(false);
    }
  };

  const filteredChannels = channels.filter(channel =>
    channel.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`relative rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border-2 ${
        isDarkMode 
          ? 'bg-gradient-to-br from-[#181c24] via-[#101010] to-[#23272f] border-[#23272f]' 
          : 'bg-gradient-to-br from-white via-red-50 to-red-100 border-red-100'
      }`}>
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Bomb className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Nuke Channel</h3>
              <p className="text-red-100 text-sm">Delete and recreate a channel completely</p>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6">
          {/* Warning */}
          <div className={`flex items-start gap-3 p-4 rounded-xl mb-6 ${
            isDarkMode ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'
          }`}>
            <AlertTriangle className={`w-5 h-5 mt-0.5 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`} />
            <div>
              <p className={`font-semibold mb-1 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                ⚠️ Destructive Action
              </p>
              <p className={`text-sm ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>
                This action will completely delete the selected channel and create a new one with the same name.
                All messages will be permanently lost.
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search channels..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full px-4 py-2 rounded-xl border transition-colors ${
                isDarkMode 
                  ? 'bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-red-500' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-red-500'
              }`}
            />
          </div>

          {/* Channel List */}
          <div className="max-h-48 overflow-y-auto mb-6">
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader className="w-5 h-5 animate-spin text-gray-400" />
                <span className={`ml-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Loading channels...
                </span>
              </div>
            ) : filteredChannels.length === 0 ? (
              <div className={`text-center py-6 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {searchTerm ? 'No channels found' : 'No channels available'}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredChannels.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => setSelectedChannel(channel.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                      selectedChannel === channel.id
                        ? isDarkMode 
                          ? 'bg-red-500/20 border border-red-500/30' 
                          : 'bg-red-100 border border-red-300'
                        : isDarkMode 
                          ? 'hover:bg-gray-700/50 border border-gray-600' 
                          : 'hover:bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      selectedChannel === channel.id
                        ? 'border-red-500 bg-red-500'
                        : isDarkMode 
                          ? 'border-gray-500' 
                          : 'border-gray-400'
                    }`}>
                      {selectedChannel === channel.id && (
                        <CheckCircle className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <span className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        #{channel.name}
                      </span>
                      {channel.parent && (
                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Category: {channel.parent}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Action buttons */}
          <div className="space-y-3">
            <button
              onClick={handleNuke}
              disabled={nuking || !selectedChannel}
              className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-3 px-4 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center justify-center gap-2">
                {nuking ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Nuking...
                  </>
                ) : (
                  <>
                    <Bomb className="w-5 h-5" />
                    Nuke Channel
                  </>
                )}
              </div>
            </button>
            <button
              onClick={onClose}
              className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-200 border-2 ${
                isDarkMode
                  ? 'border-gray-600 text-gray-300 hover:border-red-500 hover:text-red-400'
                  : 'border-gray-300 text-gray-600 hover:border-red-500 hover:text-red-600'
              }`}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NukeModal; 