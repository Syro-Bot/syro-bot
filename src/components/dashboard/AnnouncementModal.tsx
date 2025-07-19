/**
 * @fileoverview Announcement Modal Component
 *
 * Modal for sending announcements with embeds to multiple channels.
 * Features embed builder with preview functionality.
 *
 * @author Syro Frontend Team
 * @version 1.0.0
 * @since 2024
 */

import React, { useState, useEffect } from "react";
import { X, Megaphone, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
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

interface Embed {
  id: string;
  title: string;
  description: string;
  color: string;
  imageUrl: string;
  author: string;
  authorUrl: string;
  authorIconUrl: string;
  isExpanded: boolean;
}

interface AnnouncementModalProps {
  guildId?: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Componente AnnouncementModal
 * Modal para enviar anuncios con embeds.
 *
 * @component
 * @param {string} guildId - ID del servidor
 * @param {boolean} isOpen - Estado del modal
 * @param {function} onClose - Función para cerrar el modal
 */
const AnnouncementModal: React.FC<AnnouncementModalProps> = ({ guildId, isOpen, onClose }) => {
  const { isDarkMode } = useTheme();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [content, setContent] = useState('📢 **ANNOUNCEMENT**\n\nThis is a default announcement message.');
  const [embeds, setEmbeds] = useState<Embed[]>([
    {
      id: '1',
      title: 'Announcement Title',
      description: 'This is the description of the announcement. You can add more details here.',
      color: '#7289da',
      imageUrl: '',
      author: 'Syro Bot',
      authorUrl: '',
      authorIconUrl: '/syro-icon.png',
      isExpanded: false
    }
  ]);

  // Load channels when modal opens
  useEffect(() => {
    if (isOpen && guildId) {
      loadChannels();
    }
  }, [isOpen, guildId]);

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

  const addEmbed = () => {
    if (embeds.length >= 3) return;
    
    const newEmbed: Embed = {
      id: Date.now().toString(),
      title: '',
      description: '',
      color: '#7289da',
      imageUrl: '',
      author: '',
      authorUrl: '',
      authorIconUrl: '',
      isExpanded: false
    };
    
    setEmbeds([...embeds, newEmbed]);
  };

  const removeEmbed = (id: string) => {
    setEmbeds(embeds.filter(embed => embed.id !== id));
  };

  const updateEmbed = (id: string, field: keyof Embed, value: string | boolean) => {
    setEmbeds(embeds.map(embed => 
      embed.id === id ? { ...embed, [field]: value } : embed
    ));
  };

  const toggleEmbedExpansion = (id: string) => {
    updateEmbed(id, 'isExpanded', !embeds.find(e => e.id === id)?.isExpanded);
  };

  const handleChannelToggle = (channelId: string) => {
    setSelectedChannels(prev => 
      prev.includes(channelId) 
        ? prev.filter(id => id !== channelId)
        : [...prev, channelId]
    );
  };

  const handleSend = async () => {
    if (selectedChannels.length === 0) {
      alert('Please select at least one channel');
      return;
    }

    setSending(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/announcement/${guildId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channels: selectedChannels,
          content,
          embeds: embeds.filter(embed => embed.title || embed.description)
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert('✅ Announcement sent successfully!');
        onClose();
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error sending announcement:', error);
      alert('❌ Error sending announcement');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`relative rounded-3xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden border-2 ${
        isDarkMode 
          ? 'bg-gradient-to-br from-[#181c24] via-[#101010] to-[#23272f] border-[#23272f]' 
          : 'bg-gradient-to-br from-white via-blue-50 to-blue-100 border-blue-100'
      }`}>
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Megaphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Send Announcement</h3>
                <p className="text-blue-100 text-sm">Create and send formatted announcements with embeds</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSend}
                disabled={selectedChannels.length === 0 || sending}
                className={`px-6 py-3 rounded-xl transition-colors flex items-center gap-2 font-semibold ${
                  selectedChannels.length === 0 || sending
                    ? 'bg-gray-500/50 text-gray-300 cursor-not-allowed'
                    : 'bg-white/20 hover:bg-white/30 text-white border border-white/30'
                }`}
              >
                {sending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Megaphone className="w-4 h-4" />
                    Send Announcement
                  </>
                )}
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex h-[calc(95vh-120px)]">
          {/* Left Panel - Form */}
          <div className="w-1/2 p-6 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
            {/* Channel Selection */}
            <div className="mb-6">
              <h3 className={`font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Select Channels</h3>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {loading ? (
                  <div className="text-center py-4 w-full">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                    <p className={`text-sm mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading channels...</p>
                  </div>
                ) : (
                  channels.map((channel) => {
                    const selected = selectedChannels.includes(channel.id);
                    return (
                      <button
                        key={channel.id}
                        type="button"
                        onClick={() => handleChannelToggle(channel.id)}
                        className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-colors border text-sm min-w-[120px] max-w-full truncate
                          ${selected
                            ? isDarkMode 
                              ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' 
                              : 'bg-blue-100 border-blue-300 text-blue-700'
                            : isDarkMode 
                              ? 'bg-gray-800/50 border-gray-600 text-gray-300 hover:bg-gray-700/50' 
                              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                      >
                        <div className={`w-2 h-2 rounded-full ${selected ? 'bg-blue-500' : 'bg-gray-400'}`}></div>
                        #{channel.name}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Message Content */}
            <div className="mb-6">
              <h3 className={`font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Message Content</h3>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter your announcement message..."
                className={`w-full h-32 p-3 rounded-xl border resize-none transition-colors ${
                  isDarkMode 
                    ? 'bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                }`}
              />
            </div>

            {/* Embeds */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Embeds</h3>
                <button
                  onClick={addEmbed}
                  disabled={embeds.length >= 3}
                  className={`px-3 py-1 rounded-lg text-sm transition-colors flex items-center gap-1 ${
                    embeds.length >= 3
                      ? 'bg-gray-500/50 text-gray-400 cursor-not-allowed'
                      : isDarkMode 
                        ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' 
                        : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                  }`}
                >
                  <Plus className="w-3 h-3" />
                  Add Embed
                </button>
              </div>
              
              <div className="space-y-4">
                {embeds.map((embed, index) => (
                  <div key={embed.id} className={`p-4 rounded-xl border ${
                    isDarkMode ? 'bg-gray-800/50 border-gray-600' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Embed {index + 1}
                      </h4>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleEmbedExpansion(embed.id)}
                          className={`p-1 rounded transition-colors ${
                            isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
                          }`}
                        >
                          {embed.isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                        {embeds.length > 1 && (
                          <button
                            onClick={() => removeEmbed(embed.id)}
                            className={`p-1 rounded transition-colors ${
                              isDarkMode ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-100 text-red-600'
                            }`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={embed.title}
                        onChange={(e) => updateEmbed(embed.id, 'title', e.target.value)}
                        placeholder="Embed title..."
                        className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500' 
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                        }`}
                      />
                      
                      <textarea
                        value={embed.description}
                        onChange={(e) => updateEmbed(embed.id, 'description', e.target.value)}
                        placeholder="Embed description..."
                        className={`w-full h-20 p-3 rounded-lg border resize-none text-sm transition-colors ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500' 
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                        }`}
                      />
                      
                      {embed.isExpanded && (
                        <div className="space-y-3 pt-3 border-t border-gray-600 dark:border-gray-500">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Color:</span>
                            <input
                              type="color"
                              value={embed.color}
                              onChange={(e) => updateEmbed(embed.id, 'color', e.target.value)}
                              className="w-8 h-8 rounded border-0 cursor-pointer"
                            />
                          </div>
                          
                          <input
                            type="text"
                            value={embed.author}
                            onChange={(e) => updateEmbed(embed.id, 'author', e.target.value)}
                            placeholder="Author name..."
                            className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors ${
                              isDarkMode 
                                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500' 
                                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                            }`}
                          />
                          
                          <input
                            type="url"
                            value={embed.imageUrl}
                            onChange={(e) => updateEmbed(embed.id, 'imageUrl', e.target.value)}
                            placeholder="Image URL..."
                            className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors ${
                              isDarkMode 
                                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500' 
                                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                            }`}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel - Preview */}
          <div className="w-1/2 p-6 overflow-y-auto">
            <h3 className={`font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Preview</h3>
            <div className={`p-4 rounded-xl border ${
              isDarkMode ? 'bg-gray-800/50 border-gray-600' : 'bg-gray-50 border-gray-200'
            }`}>
              {/* Message Preview */}
              {content && (
                <div className={`mb-4 p-3 rounded-lg ${
                  isDarkMode ? 'bg-gray-700' : 'bg-white'
                }`}>
                  <p className={`whitespace-pre-wrap ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                    {content}
                  </p>
                </div>
              )}
              
              {/* Embeds Preview */}
              {embeds.filter(embed => embed.title || embed.description).map((embed, index) => (
                <div key={embed.id} className="mb-4">
                  <div 
                    className="rounded-lg overflow-hidden border-l-4"
                    style={{ borderLeftColor: embed.color }}
                  >
                    <div className={`p-3 ${isDarkMode ? 'bg-gray-700' : 'bg-white'}`}>
                      {embed.title && (
                        <h4 className={`font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {embed.title}
                        </h4>
                      )}
                      {embed.description && (
                        <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {embed.description}
                        </p>
                      )}
                      {embed.author && (
                        <div className="flex items-center gap-2 mt-2">
                          {embed.authorIconUrl && (
                            <img 
                              src={embed.authorIconUrl} 
                              alt="Author" 
                              className="w-4 h-4 rounded"
                            />
                          )}
                          <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {embed.author}
                          </span>
                        </div>
                      )}
                    </div>
                    {embed.imageUrl && (
                      <img 
                        src={embed.imageUrl} 
                        alt="Embed" 
                        className="w-full max-h-48 object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementModal;