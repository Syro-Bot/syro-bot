/**
 * @fileoverview Global Announcement Modal Component
 *
 * Modal for sending announcements to all servers (owner only).
 * Features embed builder with preview functionality.
 *
 * @author Syro Frontend Team
 * @version 1.0.0
 * @since 2024
 */

import React, { useState, useEffect } from "react";
import { X, Megaphone, Plus, Trash2, ChevronDown, ChevronUp, Globe } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { API_BASE_URL, AUTH_BASE_URL } from '../../config/constants';

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

interface GlobalAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Componente GlobalAnnouncementModal
 * Modal para enviar anuncios globales a todos los servidores (solo owner).
 *
 * @component
 * @param {boolean} isOpen - Estado del modal
 * @param {function} onClose - Función para cerrar el modal
 */
const GlobalAnnouncementModal: React.FC<GlobalAnnouncementModalProps> = ({ isOpen, onClose }) => {
  const { isDarkMode } = useTheme();
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [content, setContent] = useState('📢 **GLOBAL ANNOUNCEMENT**\n\nThis is a global announcement from Syro Bot.');
  const [embeds, setEmbeds] = useState<Embed[]>([
    {
      id: '1',
      title: 'Global Announcement',
      description: 'This is a global announcement sent to all servers where Syro Bot is present.',
      color: '#7289da',
      imageUrl: '',
      author: 'Syro Bot',
      authorUrl: '',
      authorIconUrl: '/syro-icon.png',
      isExpanded: false
    }
  ]);

  // Load servers when modal opens
  useEffect(() => {
    if (isOpen) {
      // No need to load servers anymore since we send to all configured servers
    }
  }, [isOpen]);

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

  const handleSend = async () => {
    if (!content && (!embeds || embeds.length === 0)) {
      alert('Please add content or embeds to your announcement');
      return;
    }

    const confirmed = window.confirm(
      'Are you sure you want to send this global announcement?\n\nThis will be sent to all servers that have configured their announcement channel.\n\nThis action cannot be undone.'
    );

    if (!confirmed) return;

    setSending(true);
    try {
      // Get user ID from localStorage or session
      const userResponse = await fetch(`${AUTH_BASE_URL}/me`, { 
        credentials: 'include',
        cache: 'no-cache'
      });
      const userData = await userResponse.json();
      const userId = userData?.user?.id;

      const response = await fetch(`${API_BASE_URL}/api/global-announcement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': userId || 'unknown'
        },
        body: JSON.stringify({
          content,
          embeds: embeds.filter(embed => embed.title || embed.description)
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert(`✅ Global announcement sent successfully to ${data.successCount}/${data.totalCount} configured servers!`);
        onClose();
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error sending global announcement:', error);
      alert('❌ Error sending global announcement');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`w-[90vw] max-w-[1400px] h-[90vh] rounded-2xl transition-colors duration-300 ${
        isDarkMode ? 'bg-[#181c24] border border-gray-700' : 'bg-white border border-gray-200'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'
            }`}>
              <Globe className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <div>
              <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Global Announcement</h2>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Send announcement to all selected servers</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSend}
              disabled={sending}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                sending
                  ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {sending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Megaphone className="w-4 h-4" />
                  Send Global Announcement
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
            >
              <X className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex h-[calc(90vh-120px)]">
          {/* Left Panel - Form */}
          <div className="w-1/2 p-6 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
            {/* Info Section */}
            <div className="mb-6">
              <div className={`p-4 rounded-lg ${
                isDarkMode ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'
              }`}>
                <h3 className={`font-semibold mb-2 flex items-center gap-2 ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                  <Globe className="w-5 h-5" />
                  Global Announcement
                </h3>
                <p className={`text-sm ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                  This announcement will be sent to all servers that have configured their announcement channel.
                  Only servers with proper configuration will receive this message.
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="mb-6">
              <h3 className={`font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Message Content
              </h3>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter your global announcement message..."
                className={`w-full h-24 p-3 rounded-lg border resize-none ${
                  isDarkMode 
                    ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
              />
            </div>

            {/* Embeds */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Embeds ({embeds.length}/3)
                </h3>
                {embeds.length < 3 && (
                  <button
                    onClick={addEmbed}
                    className={`px-3 py-1 rounded-lg text-sm flex items-center gap-1 ${
                      isDarkMode 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    Add Embed
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {embeds.map((embed, index) => (
                  <div key={embed.id} className={`border rounded-lg p-4 ${
                    isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-gray-50'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Embed {index + 1}
                      </h4>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleEmbedExpansion(embed.id)}
                          className={`p-1 rounded ${
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
                            className={`p-1 rounded text-red-500 hover:bg-red-500/10`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {embed.isExpanded && (
                      <div className="space-y-3">
                        {/* Author Section */}
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            placeholder="Author name"
                            value={embed.author}
                            onChange={(e) => updateEmbed(embed.id, 'author', e.target.value)}
                            className={`px-3 py-2 rounded border text-sm ${
                              isDarkMode 
                                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                            }`}
                          />
                          <input
                            type="text"
                            placeholder="Author URL"
                            value={embed.authorUrl}
                            onChange={(e) => updateEmbed(embed.id, 'authorUrl', e.target.value)}
                            className={`px-3 py-2 rounded border text-sm ${
                              isDarkMode 
                                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                            }`}
                          />
                        </div>
                        <input
                          type="text"
                          placeholder="Author Icon URL"
                          value={embed.authorIconUrl}
                          onChange={(e) => updateEmbed(embed.id, 'authorIconUrl', e.target.value)}
                          className={`w-full px-3 py-2 rounded border text-sm ${
                            isDarkMode 
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                          }`}
                        />

                        {/* Body Section */}
                        <div className="border-t pt-3">
                          <h5 className={`font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            Body
                          </h5>
                          <input
                            type="text"
                            placeholder="Title"
                            value={embed.title}
                            onChange={(e) => updateEmbed(embed.id, 'title', e.target.value)}
                            className={`w-full px-3 py-2 rounded border text-sm mb-3 ${
                              isDarkMode 
                                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                            }`}
                          />
                          <textarea
                            placeholder="Description"
                            value={embed.description}
                            onChange={(e) => updateEmbed(embed.id, 'description', e.target.value)}
                            className={`w-full h-20 px-3 py-2 rounded border text-sm resize-none ${
                              isDarkMode 
                                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                            }`}
                          />
                        </div>

                        {/* Image and Color */}
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            placeholder="Image URL"
                            value={embed.imageUrl}
                            onChange={(e) => updateEmbed(embed.id, 'imageUrl', e.target.value)}
                            className={`px-3 py-2 rounded border text-sm ${
                              isDarkMode 
                                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                            }`}
                          />
                          <input
                            type="color"
                            value={embed.color}
                            onChange={(e) => updateEmbed(embed.id, 'color', e.target.value)}
                            className="w-full h-10 rounded border cursor-pointer"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel - Preview */}
          <div className="w-1/2 p-6 overflow-y-auto">
            <h3 className={`font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Preview
            </h3>
            
            <div className={`rounded-lg p-4 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
              {/* Bot Info */}
              <div className="flex items-center gap-3 mb-4">
                <img 
                  src="/syro-icon.png" 
                  alt="Syro Bot" 
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Syro Bot
                  </p>
                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Now
                  </p>
                </div>
              </div>

              {/* Content */}
              {content && (
                <div className={`mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {content.split('\n').map((line, index) => (
                    <p key={index} className="mb-1">
                      {line}
                    </p>
                  ))}
                </div>
              )}

              {/* Embeds */}
              {embeds.filter(embed => embed.title || embed.description).map((embed, index) => (
                <div key={embed.id} className="mb-4">
                  <div 
                    className="rounded-lg p-4 border-l-4"
                    style={{ borderLeftColor: embed.color }}
                  >
                    {/* Author */}
                    {embed.author && (
                      <div className="flex items-center gap-2 mb-2">
                        {embed.authorIconUrl && (
                          <img 
                            src={embed.authorIconUrl} 
                            alt="Author" 
                            className="w-5 h-5 rounded-full"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                        <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {embed.author}
                        </span>
                      </div>
                    )}

                    {/* Title */}
                    {embed.title && (
                      <h4 className={`font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {embed.title}
                      </h4>
                    )}

                    {/* Description */}
                    {embed.description && (
                      <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {embed.description}
                      </p>
                    )}

                    {/* Image */}
                    {embed.imageUrl && (
                      <img 
                        src={embed.imageUrl} 
                        alt="Embed" 
                        className="w-full rounded mt-3 max-h-48 object-cover"
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

export default GlobalAnnouncementModal; 