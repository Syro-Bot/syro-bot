/**
 * @fileoverview Member Count Modal Component
 *
 * Modal para crear canales de voz que muestran el conteo de miembros en tiempo real.
 * Permite seleccionar categoría y personalizar el nombre de visualización.
 *
 * @author Syro Frontend Team
 * @version 1.0.0
 * @since 2024
 */

import React, { useState, useEffect } from "react";
import { X, Users, FolderOpen, Settings, AlertCircle } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { API_BASE_URL } from '../../config/constants';

interface Category {
  id: string;
  name: string;
  type: number;
  position: number;
}

interface GuildInfo {
  id: string;
  name: string;
  memberCount: number;
  memberCountChannels: number;
}

interface MemberCountModalProps {
  guildId?: string;
  isOpen: boolean;
  onClose: () => void;
  user?: any;
}

/**
 * Componente MemberCountModal
 * Modal para crear canales de conteo de miembros.
 *
 * @component
 * @param {string} guildId - ID del servidor
 * @param {boolean} isOpen - Estado del modal
 * @param {function} onClose - Función para cerrar el modal
 * @param {object} user - Usuario autenticado
 */
const MemberCountModal: React.FC<MemberCountModalProps> = ({ guildId, isOpen, onClose, user }) => {
  const { isDarkMode } = useTheme();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [displayName, setDisplayName] = useState('ᴀʟʟ ᴍᴇᴍʙᴇʀs');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [guildInfo, setGuildInfo] = useState<GuildInfo | null>(null);
  const [guildInfoLoading, setGuildInfoLoading] = useState(false);

  // Load categories and guild info when modal opens
  useEffect(() => {
    if (isOpen && guildId) {
      loadCategories();
      loadGuildInfo();
    }
  }, [isOpen, guildId]);

  const loadGuildInfo = async () => {
    if (!guildId) return;
    
    setGuildInfoLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/member-count/${guildId}/info`);
      const data = await response.json();
      
      if (data.success) {
        setGuildInfo(data.guild);
      }
    } catch (error) {
      console.error('Error loading guild info:', error);
    } finally {
      setGuildInfoLoading(false);
    }
  };

  const loadCategories = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/channels/${guildId}`);
      const data = await response.json();
      
      if (data.success) {
        const categoryChannels = data.channels.filter((channel: Category) => channel.type === 4);
        setCategories(categoryChannels);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!displayName.trim()) {
      alert('Please enter a display name');
      return;
    }

    setCreating(true);
    try {
      const selectedCategoryData = categories.find(cat => cat.id === selectedCategory);
      
      const response = await fetch(`${API_BASE_URL}/api/member-count/${guildId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          categoryId: selectedCategory || null,
          categoryName: selectedCategoryData?.name || null,
          displayName: displayName.trim(),
          createdBy: user?.id || 'unknown'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert(`✅ Member count channel created successfully!\n\nChannel: ${data.channel.name}\nMembers: ${data.channel.memberCount}`);
        onClose();
        // Reset form
        setDisplayName('ᴀʟʟ ᴍᴇᴍʙᴇʀs');
        setSelectedCategory('');
        // Reload guild info to update member count channels count
        loadGuildInfo();
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error creating member count channel:', error);
      alert('❌ Error creating member count channel');
    } finally {
      setCreating(false);
    }
  };

  // Get member count for display
  const getMemberCount = () => {
    if (guildInfoLoading) return 'Loading...';
    if (guildInfo) return guildInfo.memberCount.toString();
    return '0';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`w-[90vw] max-w-[600px] rounded-2xl transition-colors duration-300 ${
        isDarkMode ? 'bg-[#181c24] border border-gray-700' : 'bg-white border border-gray-200'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              isDarkMode ? 'bg-green-500/20' : 'bg-green-100'
            }`}>
              <Users className={`w-5 h-5 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
            </div>
            <div>
              <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Create Member Count Channel
              </h2>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Create a voice channel that shows real-time member count
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

        {/* Content */}
        <div className="p-6">
          {/* Server Info */}
          {guildInfo && (
            <div className={`p-4 rounded-lg mb-6 ${
              isDarkMode ? 'bg-gray-800 border border-gray-600' : 'bg-gray-50 border border-gray-300'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {guildInfo.name}
                  </h3>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Server ID: {guildInfo.id}
                  </p>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                    {guildInfo.memberCount}
                  </div>
                  <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    members
                  </div>
                </div>
              </div>
              {guildInfo.memberCountChannels > 0 && (
                <div className={`mt-2 text-xs ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                  ⚠️ This server already has {guildInfo.memberCountChannels} member count channel{guildInfo.memberCountChannels > 1 ? 's' : ''}
                </div>
              )}
            </div>
          )}

          {/* Info Section */}
          <div className={`p-4 rounded-lg mb-6 ${
            isDarkMode ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'
          }`}>
            <div className="flex items-start gap-3">
              <AlertCircle className={`w-5 h-5 mt-0.5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
              <div>
                <h3 className={`font-semibold mb-1 ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                  How it works
                </h3>
                <p className={`text-sm ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                  This will create a voice channel that automatically updates its name to show the current member count. 
                  Users can see the channel but cannot join it. The count updates in real-time as members join or leave.
                </p>
              </div>
            </div>
          </div>

          {/* Display Name */}
          <div className="mb-6">
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
              Display Name
            </label>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="ᴀʟʟ ᴍᴇᴍʙᴇʀs"
                className={`flex-1 px-3 py-2 rounded-lg border text-sm ${
                  isDarkMode 
                    ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
              />
              <div className={`px-3 py-2 rounded-lg text-sm font-mono ${
                isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'
              }`}>
                : {getMemberCount()}
              </div>
            </div>
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              This is the text that will appear before the member count. You can use special characters like ᴀʟʟ ᴍᴇᴍʙᴇʀs.
            </p>
          </div>

          {/* Category Selection */}
          <div className="mb-6">
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
              Category (Optional)
            </label>
            <div className="flex items-center gap-3">
              <FolderOpen className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className={`flex-1 px-3 py-2 rounded-lg border text-sm ${
                  isDarkMode 
                    ? 'bg-gray-800 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="">No Category</option>
                {loading ? (
                  <option disabled>Loading categories...</option>
                ) : (
                  categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))
                )}
              </select>
            </div>
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Select a category to organize the member count channel. Leave empty to create it at the root level.
            </p>
          </div>

          {/* Preview */}
          <div className="mb-6">
            <h3 className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
              Preview
            </h3>
            <div className={`p-3 rounded-lg border ${
              isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-300'
            }`}>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  isDarkMode ? 'bg-gray-500' : 'bg-gray-400'
                }`}></div>
                <span className={`text-sm font-mono ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {displayName || 'ᴀʟʟ ᴍᴇᴍʙᴇʀs'}: {getMemberCount()}
                </span>
              </div>
              <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Voice Channel • Users can see but cannot join
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-500 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || !displayName.trim()}
              className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                creating || !displayName.trim()
                  ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {creating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Users className="w-4 h-4" />
                  Create Channel
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberCountModal; 