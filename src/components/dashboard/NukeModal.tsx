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
import { X, Bomb, AlertTriangle, CheckCircle, Loader } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

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
      const response = await fetch(`http://localhost:3001/api/channels/${guildId}`);
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
      const response = await fetch(`http://localhost:3001/api/nuke/${guildId}`, {
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className={`w-[40rem] max-h-[80vh] rounded-2xl p-6 transition-colors duration-300 ${
        isDarkMode ? 'bg-[#181c24] border border-gray-700' : 'bg-white border border-gray-200'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              isDarkMode ? 'bg-red-500/20' : 'bg-red-100'
            }`}>
              <Bomb className={`w-5 h-5 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`} />
            </div>
            <div>
              <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Nuke Channel
              </h2>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Delete and recreate a channel completely
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            }`}
          >
            <X className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
          </button>
        </div>

        {/* Warning */}
        <div className={`flex items-center gap-3 p-4 rounded-lg mb-6 ${
          isDarkMode ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'
        }`}>
          <AlertTriangle className={`w-5 h-5 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`} />
          <div>
            <p className={`font-semibold ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
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
            className={`w-full px-4 py-2 rounded-lg border transition-colors ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-red-500' 
                : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500 focus:border-red-500'
            }`}
          />
        </div>

        {/* Channel List */}
        <div className="max-h-64 overflow-y-auto mb-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="w-6 h-6 animate-spin text-gray-400" />
              <span className={`ml-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Loading channels...
              </span>
            </div>
          ) : filteredChannels.length === 0 ? (
            <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {searchTerm ? 'No channels found' : 'No channels available'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredChannels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => setSelectedChannel(channel.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    selectedChannel === channel.id
                      ? isDarkMode 
                        ? 'bg-red-500/20 border border-red-500/30' 
                        : 'bg-red-100 border border-red-300'
                      : isDarkMode 
                        ? 'hover:bg-gray-700 border border-gray-600' 
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
                  <div className="flex-1">
                    <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
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

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
              isDarkMode 
                ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleNuke}
            disabled={!selectedChannel || nuking}
            className={`flex-1 px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
              !selectedChannel || nuking
                ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
          >
            {nuking ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Nuking...
              </>
            ) : (
              <>
                <Bomb className="w-4 h-4" />
                Nuke Channel
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NukeModal; 