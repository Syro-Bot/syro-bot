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
import { Users, FolderOpen } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { API_CONFIG } from '../../config/apiConfig';
const API_BASE_URL = API_CONFIG.BASE_URL;

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

  // Load categories and guild info when modal opens
  useEffect(() => {
    if (isOpen && guildId) {
      loadCategories();
      loadGuildInfo();
    }
  }, [isOpen, guildId]);

  const loadGuildInfo = async () => {
    if (!guildId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/member-count/${guildId}/info`);
      const data = await response.json();
      
      if (data.success) {
        setGuildInfo(data.guild);
      }
    } catch (error) {
      console.error('Error loading guild info:', error);
    } finally {
      setLoading(false);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`relative rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border-2 ${
        isDarkMode 
          ? 'bg-gradient-to-br from-[#181c24] via-[#101010] to-[#23272f] border-[#23272f]' 
          : 'bg-gradient-to-br from-white via-green-50 to-green-100 border-green-100'
      }`}>
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Member Count</h3>
              <p className="text-green-100 text-sm">Create real-time member count channel</p>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6">
          <p className={`text-sm leading-relaxed mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Create a voice channel that automatically updates its name to show the current member count. 
            Users can see the channel but cannot join it. The count updates in real-time as members join or leave.
          </p>
          
          {/* Server Info */}
          {guildInfo && (
            <div className={`p-4 rounded-xl mb-6 ${
              isDarkMode ? 'bg-gray-800/50 border border-gray-600' : 'bg-gray-50 border border-gray-200'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {guildInfo.name}
                  </h4>
                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {guildInfo.memberCount} members
                  </p>
                </div>
                <div className={`text-2xl font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                  {guildInfo.memberCount}
                </div>
              </div>
            </div>
          )}

          {/* Category Selection */}
          <div className="mb-6">
            <label className={`block text-sm font-medium mb-3 ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
              Category (Optional)
            </label>
            <div className="flex items-center gap-3">
              <FolderOpen className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className={`flex-1 px-3 py-2 rounded-xl border text-sm transition-colors ${
                  isDarkMode 
                    ? 'bg-gray-800/50 border-gray-600 text-white hover:border-green-500' 
                    : 'bg-white border-gray-300 text-gray-900 hover:border-green-500'
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
            <p className={`text-xs mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Select a category to organize the member count channel. Leave empty to create it at the root level.
            </p>
          </div>
          
          {/* Action buttons */}
          <div className="space-y-3">
            <button
              onClick={handleCreate}
              disabled={creating}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 px-4 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center justify-center gap-2">
                {creating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Users className="w-5 h-5" />
                    Create Member Count Channel
                  </>
                )}
              </div>
            </button>
            <button
              onClick={onClose}
              className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-200 border-2 ${
                isDarkMode
                  ? 'border-gray-600 text-gray-300 hover:border-green-500 hover:text-green-400'
                  : 'border-gray-300 text-gray-600 hover:border-green-500 hover:text-green-600'
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

export default MemberCountModal; 