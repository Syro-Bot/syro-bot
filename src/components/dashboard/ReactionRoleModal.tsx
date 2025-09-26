/**
 * @fileoverview Reaction Role Modal Component
 *
 * Modal for creating and editing reaction role messages with emoji-role pairs.
 * Features embed builder, emoji-role configuration, and preview functionality.
 * Optimized for performance and user experience in high-traffic Discord servers.
 *
 * @author Syro Frontend Team
 * @version 1.0.0
 * @since 2024
 */

import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, ChevronDown, ChevronUp, Send, Edit } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { API_CONFIG } from '../../config/apiConfig';

// Types
interface Channel {
  id: string;
  name: string;
  type: number;
  position: number;
  parent?: string;
  parentId?: string;
}

interface Role {
  id: string;
  name: string;
  color: string;
  position: number;
}

interface EmojiRole {
  id: string;
  emoji: string;
  role: Role;
  removeOnReactionRemove: boolean;
  description: string;
}

interface Embed {
  id: string;
  title: string;
  description: string;
  color: string;
  imageUrl: string;
  thumbnailUrl: string;
  author: {
    name: string;
    iconUrl: string;
  };
  footer: {
    text: string;
    iconUrl: string;
  };
  isExpanded: boolean;
}

interface ReactionRoleModalProps {
  guildId?: string;
  isOpen: boolean;
  onClose: () => void;
  editingReactionRole?: any; // For editing existing reaction roles
}

/**
 * Emoji picker component for selecting emojis
 */
const EmojiPicker: React.FC<{
  value: string;
  onChange: (emoji: string) => void;
  isDarkMode: boolean;
}> = ({ value, onChange, isDarkMode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Common emojis for quick selection
  const commonEmojis = [
    '👍', '👎', '❤️', '🔥', '😄', '😢', '😡', '🎉', '🎊', '🎯',
    '⚡', '💎', '🌟', '💫', '✨', '🎨', '🎭', '🎪', '🎟️', '🎫'
  ];

  // Custom emoji input for Discord custom emojis
  const handleCustomEmoji = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    if (input.startsWith('<:') && input.endsWith('>')) {
      onChange(input);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-colors ${
          isDarkMode 
            ? 'bg-[#2a2d31] border-[#40444b] hover:border-[#5865f2] text-white' 
            : 'bg-gray-50 border-gray-300 hover:border-[#5865f2] text-gray-700'
        }`}
      >
        <span className="text-lg">{value || '😀'}</span>
        <ChevronDown className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className={`absolute top-full left-0 mt-2 p-4 rounded-lg border-2 shadow-lg z-10 w-80 ${
          isDarkMode 
            ? 'bg-[#2a2d31] border-[#40444b]' 
            : 'bg-white border-gray-200'
        }`}>
          {/* Search */}
          <input
            type="text"
            placeholder="Search emojis..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full px-3 py-2 rounded-lg border-2 mb-3 ${
              isDarkMode 
                ? 'bg-[#40444b] border-[#5865f2] text-white placeholder-gray-400' 
                : 'bg-gray-50 border-gray-300 text-gray-700 placeholder-gray-500'
            }`}
          />

          {/* Common emojis */}
          <div className="grid grid-cols-10 gap-2 mb-4">
            {commonEmojis
              .filter(emoji => emoji.includes(searchTerm))
              .map((emoji, index) => (
                <button
                  key={index}
                  onClick={() => {
                    onChange(emoji);
                    setIsOpen(false);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-[#40444b] rounded transition-colors text-lg"
                >
                  {emoji}
                </button>
              ))}
          </div>

          {/* Custom emoji input */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Custom Discord Emoji
            </label>
            <input
              type="text"
              placeholder="<:name:id>"
              onChange={handleCustomEmoji}
              className={`w-full px-3 py-2 rounded-lg border-2 ${
                isDarkMode 
                  ? 'bg-[#40444b] border-[#5865f2] text-white placeholder-gray-400' 
                  : 'bg-gray-50 border-gray-300 text-gray-700 placeholder-gray-500'
              }`}
            />
            <p className={`text-xs mt-1 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              Format: &lt;:emoji_name:emoji_id&gt;
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Emoji-role pair component
 */
const EmojiRolePair: React.FC<{
  emojiRole: EmojiRole;
  onUpdate: (updated: EmojiRole) => void;
  onDelete: () => void;
  availableRoles: Role[];
  isDarkMode: boolean;
}> = ({ emojiRole, onUpdate, onDelete, availableRoles, isDarkMode }) => {
  return (
    <div className={`p-4 rounded-lg border-2 ${
      isDarkMode 
        ? 'bg-[#2a2d31] border-[#40444b]' 
        : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-center gap-4">
        {/* Emoji */}
        <div className="flex-shrink-0">
          <EmojiPicker
            value={emojiRole.emoji}
            onChange={(emoji) => onUpdate({ ...emojiRole, emoji })}
            isDarkMode={isDarkMode}
          />
        </div>

        {/* Role Selection */}
        <div className="flex-1">
          <select
            value={emojiRole.role.id}
            onChange={(e) => {
              const role = availableRoles.find(r => r.id === e.target.value);
              if (role) {
                onUpdate({ ...emojiRole, role });
              }
            }}
            className={`w-full px-3 py-2 rounded-lg border-2 ${
              isDarkMode 
                ? 'bg-[#40444b] border-[#5865f2] text-white' 
                : 'bg-gray-50 border-gray-300 text-gray-700'
            }`}
          >
            <option value="">Select a role</option>
            {availableRoles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div className="flex-1">
          <input
            type="text"
            placeholder="Role description (optional)"
            value={emojiRole.description}
            onChange={(e) => onUpdate({ ...emojiRole, description: e.target.value })}
            className={`w-full px-3 py-2 rounded-lg border-2 ${
              isDarkMode 
                ? 'bg-[#40444b] border-[#5865f2] text-white placeholder-gray-400' 
                : 'bg-gray-50 border-gray-300 text-gray-700 placeholder-gray-500'
            }`}
          />
        </div>

        {/* Remove on reaction remove */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id={`remove_${emojiRole.id}`}
            checked={emojiRole.removeOnReactionRemove}
            onChange={(e) => onUpdate({ ...emojiRole, removeOnReactionRemove: e.target.checked })}
            className="w-4 h-4 text-[#5865f2]"
          />
          <label htmlFor={`remove_${emojiRole.id}`} className={`text-sm ${
            isDarkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            Remove on unreact
          </label>
        </div>

        {/* Delete button */}
        <button
          type="button"
          onClick={onDelete}
          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

/**
 * Main ReactionRoleModal component
 */
const ReactionRoleModal: React.FC<ReactionRoleModalProps> = ({
  guildId,
  isOpen,
  onClose,
  editingReactionRole
}) => {
  const { isDarkMode } = useTheme();
  
  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('🎭 **REACTION ROLES**\n\nReact to get your roles!');
  const [selectedChannel, setSelectedChannel] = useState('');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [emojiRoles, setEmojiRoles] = useState<EmojiRole[]>([]);
  const [embeds, setEmbeds] = useState<Embed[]>([
    {
      id: '1',
      title: 'Choose Your Roles',
      description: 'React to the emojis below to get your roles!',
      color: '#5865f2',
      imageUrl: '',
      thumbnailUrl: '',
      author: { name: 'Syro Bot', iconUrl: '/syro-icon.png' },
      footer: { text: 'Reaction Roles', iconUrl: '' },
      isExpanded: false
    }
  ]);

  // Options state
  const [showOptions, setShowOptions] = useState(false);
  const [allowMultipleRoles, setAllowMultipleRoles] = useState(false);
  const [maxRolesPerUser, setMaxRolesPerUser] = useState(1);
  const [cooldownSeconds, setCooldownSeconds] = useState(5);
  const [showRoleDescriptions, setShowRoleDescriptions] = useState(true);
  const [enableLogging, setEnableLogging] = useState(true);

  // UI state
  const [sending, setSending] = useState(false);

  // Load data when modal opens
  useEffect(() => {
    if (isOpen && guildId) {
      loadChannels();
      loadRoles();
      
      // Initialize with editing data if provided
      if (editingReactionRole) {
        setTitle(editingReactionRole.title);
        setContent(editingReactionRole.content || '');
        setSelectedChannel(editingReactionRole.channelId);
        setEmojiRoles(editingReactionRole.emojiRoles || []);
        setEmbeds(editingReactionRole.embed ? [editingReactionRole.embed] : []);
        setAllowMultipleRoles(editingReactionRole.allowMultipleRoles || false);
        setMaxRolesPerUser(editingReactionRole.maxRolesPerUser || 1);
        setCooldownSeconds(editingReactionRole.cooldownSeconds || 5);
        setShowRoleDescriptions(editingReactionRole.showRoleDescriptions !== false);
        setEnableLogging(editingReactionRole.enableLogging !== false);
      } else {
        // Reset to defaults
        resetForm();
      }
    }
  }, [isOpen, guildId, editingReactionRole]);

  const resetForm = () => {
    setTitle('');
    setContent('🎭 **REACTION ROLES**\n\nReact to get your roles!');
    setSelectedChannel('');
    setEmojiRoles([]);
    setEmbeds([{
      id: '1',
      title: 'Choose Your Roles',
      description: 'React to the emojis below to get your roles!',
      color: '#5865f2',
      imageUrl: '',
      thumbnailUrl: '',
      author: { name: 'Syro Bot', iconUrl: '/syro-icon.png' },
      footer: { text: 'Reaction Roles', iconUrl: '' },
      isExpanded: false
    }]);
    setAllowMultipleRoles(false);
    setMaxRolesPerUser(1);
    setCooldownSeconds(5);
    setShowRoleDescriptions(true);
    setEnableLogging(true);
  };

  const loadChannels = async () => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/channels/${guildId}`);
      const data = await response.json();
      
      if (data.success) {
        const textChannels = data.channels.filter((channel: Channel) => channel.type === 0);
        setChannels(textChannels);
      }
    } catch (error) {
      console.error('Error loading channels:', error);
    }
  };

  const loadRoles = async () => {
    try {
      console.log('🔄 Loading roles for guild:', guildId);
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/guilds/${guildId}/roles`);
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        console.error('❌ Response not ok:', response.status, response.statusText);
        return;
      }
      
      const data = await response.json();
      console.log('📊 Roles data:', data);
      
      if (data.success && data.roles) {
        // Filter out roles the bot can't manage (higher position)
        const manageableRoles = data.roles.filter((role: Role) => role.position < 1000);
        console.log('✅ Manageable roles loaded:', manageableRoles.length);
        setRoles(manageableRoles);
      } else {
        console.error('❌ No roles data or success false:', data);
      }
    } catch (error) {
      console.error('❌ Error loading roles:', error);
    }
  };

  const addEmojiRole = () => {
    if (emojiRoles.length >= 20) return;
    
    const newEmojiRole: EmojiRole = {
      id: `er_${Date.now()}`,
      emoji: '👍',
      role: { id: '', name: '', color: '#000000', position: 0 },
      removeOnReactionRemove: true,
      description: ''
    };
    
    setEmojiRoles([...emojiRoles, newEmojiRole]);
  };

  const updateEmojiRole = (id: string, updates: Partial<EmojiRole>) => {
    setEmojiRoles(emojiRoles.map(er => 
      er.id === id ? { ...er, ...updates } : er
    ));
  };

  const removeEmojiRole = (id: string) => {
    setEmojiRoles(emojiRoles.filter(er => er.id !== id));
  };

  const addEmbed = () => {
    if (embeds.length >= 3) return;
    
    const newEmbed: Embed = {
      id: `embed_${Date.now()}`,
      title: '',
      description: '',
      color: '#5865f2',
      imageUrl: '',
      thumbnailUrl: '',
      author: { name: '', iconUrl: '' },
      footer: { text: '', iconUrl: '' },
      isExpanded: false
    };
    
    setEmbeds([...embeds, newEmbed]);
  };

  const updateEmbed = (id: string, updates: Partial<Embed>) => {
    setEmbeds(embeds.map(embed => 
      embed.id === id ? { ...embed, ...updates } : embed
    ));
  };

  const removeEmbed = (id: string) => {
    setEmbeds(embeds.filter(embed => embed.id !== id));
  };

  const toggleEmbedExpansion = (id: string) => {
    setEmbeds(embeds.map(embed => 
      embed.id === id ? { ...embed, isExpanded: !embed.isExpanded } : embed
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !selectedChannel || emojiRoles.length === 0) {
      alert('Please fill in all required fields and add at least one emoji-role pair.');
      return;
    }

    setSending(true);
    
    try {
      const reactionRoleData = {
        title: title.trim(),
        channelId: selectedChannel,
        content: content.trim() || undefined,
        embed: embeds[0] || undefined,
        emojiRoles: emojiRoles.map(er => ({
          emoji: er.emoji,
          role: er.role,
          removeOnReactionRemove: er.removeOnReactionRemove,
          description: er.description.trim() || undefined
        })),
        options: {
          allowMultipleRoles,
          maxRolesPerUser,
          cooldownSeconds,
          enableLogging,
          showRoleDescriptions
        }
      };

      let response;
      if (editingReactionRole) {
        // Update existing
        response = await fetch(
          `${API_CONFIG.BASE_URL}/api/reaction-roles/${guildId}/${editingReactionRole._id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reactionRoleData)
          }
        );
      } else {
        // Create new
        response = await fetch(
          `${API_CONFIG.BASE_URL}/api/reaction-roles/${guildId}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reactionRoleData)
          }
        );
      }

      const data = await response.json();
      
      if (data.success) {
        alert(editingReactionRole ? 'Reaction role updated successfully!' : 'Reaction role created successfully!');
        onClose();
        resetForm();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error saving reaction role:', error);
      alert('An error occurred while saving the reaction role.');
    } finally {
      setSending(false);
    }
  };

  const handleSendToDiscord = async () => {
    if (!editingReactionRole?._id) {
      alert('Please save the reaction role first before sending to Discord.');
      return;
    }

    setSending(true);
    
    try {
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/api/reaction-roles/${guildId}/${editingReactionRole._id}/send`,
        { method: 'POST' }
      );

      const data = await response.json();
      
      if (data.success) {
        alert('Reaction role message sent to Discord successfully!');
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error sending to Discord:', error);
      alert('An error occurred while sending to Discord.');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`relative rounded-3xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden border-2 ${
        isDarkMode 
          ? 'bg-gradient-to-br from-[#181c24] via-[#101010] to-[#23272f] border-[#23272f]' 
          : 'bg-gradient-to-br from-white via-orange-50 to-orange-100 border-orange-100'
      }`}>
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#5865f2] to-[#4752c4] p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <span className="text-2xl">🎭</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold">
                  {editingReactionRole ? 'Edit Reaction Role' : 'Create Reaction Role'}
                </h2>
                <p className="text-blue-100">
                  Configure emoji-role pairs for automatic role assignment
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Left Column - Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Basic Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Reaction Role Title"
                    className={`w-full px-4 py-3 rounded-lg border-2 ${
                      isDarkMode 
                        ? 'bg-[#2a2d31] border-[#40444b] text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-700 placeholder-gray-500'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Channel *
                  </label>
                  <select
                    value={selectedChannel}
                    onChange={(e) => setSelectedChannel(e.target.value)}
                    className={`w-full px-4 py-3 rounded-lg border-2 ${
                      isDarkMode 
                        ? 'bg-[#2a2d31] border-[#40444b] text-white' 
                        : 'bg-white border-gray-300 text-gray-700'
                    }`}
                    required
                  >
                    <option value="">Select a channel</option>
                    {channels.map((channel) => (
                      <option key={channel.id} value={channel.id}>
                        #{channel.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Message Content */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Message Content
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter your message content here..."
                  rows={3}
                  className={`w-full px-4 py-3 rounded-lg border-2 ${
                    isDarkMode 
                      ? 'bg-[#2a2d31] border-[#40444b] text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-700 placeholder-gray-500'
                  }`}
                />
              </div>

              {/* Emoji-Role Pairs */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-lg font-semibold ${
                    isDarkMode ? 'text-white' : 'text-gray-800'
                  }`}>
                    Emoji-Role Pairs ({emojiRoles.length}/20)
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={loadRoles}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                    >
                      🔄 Reload Roles
                    </button>
                    <button
                      type="button"
                      onClick={addEmojiRole}
                      disabled={emojiRoles.length >= 20}
                      className="flex items-center gap-2 px-4 py-2 bg-[#5865f2] text-white rounded-lg hover:bg-[#4752c4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Pair
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {emojiRoles.map((emojiRole) => (
                    <EmojiRolePair
                      key={emojiRole.id}
                      emojiRole={emojiRole}
                      onUpdate={(updated) => updateEmojiRole(emojiRole.id, updated)}
                      onDelete={() => removeEmojiRole(emojiRole.id)}
                      availableRoles={roles}
                      isDarkMode={isDarkMode}
                    />
                  ))}
                </div>

                              {emojiRoles.length === 0 && (
                <div className={`text-center py-8 border-2 border-dashed rounded-lg ${
                  isDarkMode ? 'border-[#40444b] text-gray-400' : 'border-gray-300 text-gray-500'
                }`}>
                  <p>No emoji-role pairs configured</p>
                  <p className="text-sm mt-1">Click "Add Pair" to get started</p>
                </div>
              )}

              {/* Debug info for roles */}
              {roles.length === 0 && (
                <div className={`text-center py-4 border-2 border-dashed rounded-lg ${
                  isDarkMode ? 'border-red-500/50 text-red-400' : 'border-red-300 text-red-600'
                }`}>
                  <p className="font-medium">⚠️ No roles available</p>
                  <p className="text-sm mt-1">The bot may not have permission to manage roles in this server</p>
                  <p className="text-xs mt-1">Check console for debugging information</p>
                </div>
              )}
              </div>

              {/* Embed Configuration */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-lg font-semibold ${
                    isDarkMode ? 'text-white' : 'text-gray-800'
                  }`}>
                    Embed Configuration
                  </h3>
                  <button
                    type="button"
                    onClick={addEmbed}
                    disabled={embeds.length >= 3}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Embed
                  </button>
                </div>

                <div className="space-y-4">
                  {embeds.map((embed) => (
                    <div key={embed.id} className={`p-4 rounded-lg border-2 ${
                      isDarkMode 
                        ? 'bg-[#2a2d31] border-[#40444b]' 
                        : 'bg-white border-gray-200'
                    }`}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className={`font-medium ${
                          isDarkMode ? 'text-white' : 'text-gray-800'
                        }`}>
                          Embed {embed.id}
                        </h4>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleEmbedExpansion(embed.id)}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-[#40444b] rounded transition-colors"
                          >
                            {embed.isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          {embeds.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeEmbed(embed.id)}
                              className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {embed.isExpanded && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <input
                            type="text"
                            placeholder="Embed title"
                            value={embed.title}
                            onChange={(e) => updateEmbed(embed.id, { title: e.target.value })}
                            className={`px-3 py-2 rounded-lg border-2 ${
                              isDarkMode 
                                ? 'bg-[#40444b] border-[#5865f2] text-white placeholder-gray-400' 
                                : 'bg-gray-50 border-gray-300 text-gray-700 placeholder-gray-500'
                            }`}
                          />
                          
                          <input
                            type="color"
                            value={embed.color}
                            onChange={(e) => updateEmbed(embed.id, { color: e.target.value })}
                            className="w-full h-10 rounded-lg border-2 border-gray-300 cursor-pointer"
                          />

                          <textarea
                            placeholder="Embed description"
                            value={embed.description}
                            onChange={(e) => updateEmbed(embed.id, { description: e.target.value })}
                            rows={3}
                            className={`md:col-span-2 px-3 py-2 rounded-lg border-2 ${
                              isDarkMode 
                                ? 'bg-[#40444b] border-[#5865f2] text-white placeholder-gray-400' 
                                : 'bg-gray-50 border-gray-300 text-gray-700 placeholder-gray-500'
                            }`}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Advanced Options */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowOptions(!showOptions)}
                  className={`flex items-center gap-2 text-sm font-medium ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}
                >
                  {showOptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  Advanced Options
                </button>

                {showOptions && (
                  <div className="mt-4 p-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-[#40444b]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="allowMultipleRoles"
                          checked={allowMultipleRoles}
                          onChange={(e) => setAllowMultipleRoles(e.target.checked)}
                          className="w-4 h-4 text-[#5865f2]"
                        />
                        <label htmlFor="allowMultipleRoles" className={`text-sm ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          Allow users to have multiple roles
                        </label>
                      </div>

                      {allowMultipleRoles && (
                        <div>
                          <label className={`block text-sm font-medium mb-1 ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>
                            Max roles per user
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="20"
                            value={maxRolesPerUser}
                            onChange={(e) => setMaxRolesPerUser(parseInt(e.target.value))}
                            className={`w-full px-3 py-2 rounded-lg border-2 ${
                              isDarkMode 
                                ? 'bg-[#40444b] border-[#5865f2] text-white' 
                                : 'bg-gray-50 border-gray-300 text-gray-700'
                            }`}
                          />
                        </div>
                      )}

                      <div>
                        <label className={`block text-sm font-medium mb-1 ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          Cooldown (seconds)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="3600"
                          value={cooldownSeconds}
                          onChange={(e) => setCooldownSeconds(parseInt(e.target.value))}
                          className={`w-full px-3 py-2 rounded-lg border-2 ${
                            isDarkMode 
                              ? 'bg-[#40444b] border-[#5865f2] text-white' 
                              : 'bg-gray-50 border-gray-300 text-gray-700'
                          }`}
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="showRoleDescriptions"
                          checked={showRoleDescriptions}
                          onChange={(e) => setShowRoleDescriptions(e.target.checked)}
                          className="w-4 h-4 text-[#5865f2]"
                        />
                        <label htmlFor="showRoleDescriptions" className={`text-sm ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          Show role descriptions in embed
                        </label>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="enableLogging"
                          checked={enableLogging}
                          onChange={(e) => setEnableLogging(e.target.checked)}
                          className="w-4 h-4 text-[#5865f2]"
                        />
                        <label htmlFor="enableLogging" className={`text-sm ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          Enable role change logging
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-6 border-t-2 border-gray-200 dark:border-[#40444b]">
                <div className="flex items-center gap-3">
                  {editingReactionRole && (
                    <button
                      type="button"
                      onClick={handleSendToDiscord}
                      disabled={sending}
                      className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send className="w-4 h-4" />
                      {sending ? 'Sending...' : 'Send to Discord'}
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  
                  <button
                    type="submit"
                    disabled={sending || !title.trim() || !selectedChannel || emojiRoles.length === 0}
                    className="flex items-center gap-2 px-6 py-3 bg-[#5865f2] text-white rounded-lg hover:bg-[#4752c4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {sending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        {editingReactionRole ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        {editingReactionRole ? 'Update' : 'Create'} Reaction Role
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>

            {/* Right Column - Preview */}
            <div className="space-y-6">
              <div className="xl:sticky xl:top-0">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className={`text-lg font-semibold ${
                    isDarkMode ? 'text-white' : 'text-gray-800'
                  }`}>
                    📱 Discord Preview
                  </h3>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className={`text-xs ${
                      isDarkMode ? 'text-green-400' : 'text-green-600'
                    }`}>
                      Live
                    </span>
                  </div>
                </div>
                
                {/* Preview Container */}
                <div className={`rounded-lg border-2 p-4 ${
                  isDarkMode 
                    ? 'bg-[#36393f] border-[#40444b]' 
                    : 'bg-white border-gray-200'
                }`}>
                  {/* Message Content Preview */}
                  {content && (
                    <div className={`mb-4 p-3 rounded-lg ${
                      isDarkMode ? 'bg-[#2f3136] text-white' : 'bg-gray-50 text-gray-800'
                    }`}>
                      <p className="whitespace-pre-wrap text-sm">{content}</p>
                    </div>
                  )}

                  {/* Embed Preview */}
                  {embeds.map((embed) => (
                    <div key={embed.id} className="mb-4">
                      <div 
                        className="rounded-lg border-l-4 p-3"
                        style={{ borderLeftColor: embed.color }}
                      >
                        {embed.title && (
                          <h4 className={`font-semibold mb-2 ${
                            isDarkMode ? 'text-white' : 'text-gray-800'
                          }`}>
                            {embed.title}
                          </h4>
                        )}
                        
                        {embed.description && (
                          <p className={`text-sm mb-3 ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-600'
                          }`}>
                            {embed.description}
                          </p>
                        )}

                        {/* Role Descriptions Preview */}
                        {showRoleDescriptions && emojiRoles.length > 0 && (
                          <div className="space-y-2">
                            <p className={`text-xs font-medium uppercase tracking-wide ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                              Available Roles
                            </p>
                            <div className="space-y-1">
                              {emojiRoles.map((emojiRole) => (
                                <div key={emojiRole.id} className="flex items-center gap-2 text-sm">
                                  <span className="text-lg">{emojiRole.emoji}</span>
                                  <span className={`font-medium ${
                                    isDarkMode ? 'text-white' : 'text-gray-800'
                                  }`}>
                                    {emojiRole.role.name}
                                  </span>
                                  {emojiRole.description && (
                                    <span className={`text-xs ${
                                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                    }`}>
                                      - {emojiRole.description}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Footer */}
                        {embeds[0]?.footer?.text && (
                          <div className={`mt-3 pt-2 border-t ${
                            isDarkMode ? 'border-[#40444b]' : 'border-gray-200'
                          }`}>
                            <p className={`text-xs ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                              {embeds[0].footer.text}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Emoji Reactions Preview */}
                  {emojiRoles.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-200 dark:border-[#40444b]">
                      <p className={`text-xs font-medium uppercase tracking-wide mb-2 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        Reactions
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {emojiRoles.map((emojiRole) => (
                          <div 
                            key={emojiRole.id}
                            className={`p-2 rounded-lg border-2 ${
                              isDarkMode 
                                ? 'bg-[#2f3136] border-[#40444b]' 
                                : 'bg-gray-50 border-gray-200'
                            }`}
                          >
                            <span className="text-lg">{emojiRole.emoji}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No Content Message */}
                  {!content && embeds.length === 0 && (
                    <div className={`text-center py-8 text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      <p>No content configured</p>
                      <p className="mt-1">Add message content or embeds to see preview</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReactionRoleModal; 