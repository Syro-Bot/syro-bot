/**
 * @fileoverview Reaction Roles Page
 *
 * Main page for managing reaction role messages in Discord servers.
 * Features creation, editing, deletion, and management of reaction role configurations.
 * Optimized for performance and user experience in enterprise Discord servers.
 *
 * @author Syro Frontend Team
 * @version 1.0.0
 * @since 2024
 */

import React, { useState, useEffect, useCallback } from "react";
import { Plus, Edit, Trash2, Copy, Send, Eye, EyeOff, Settings, BarChart3 } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAnimation } from '../contexts/AnimationContext';
import ReactionRoleModal from '../components/dashboard/ReactionRoleModal';
import { API_CONFIG } from '../config/apiConfig';

// Types
interface ReactionRole {
  _id: string;
  title: string;
  channelId: string;
  content?: string;
  embed?: any;
  emojiRoles: Array<{
    emoji: string;
    role: {
      id: string;
      name: string;
      color: string;
    };
    description?: string;
  }>;
  isActive: boolean;
  allowMultipleRoles: boolean;
  maxRolesPerUser: number;
  cooldownSeconds: number;
  messageId?: string;
  createdAt: string;
  updatedAt: string;
}

interface Channel {
  id: string;
  name: string;
}

interface ReactionRolesStats {
  totalReactionRoles: number;
  activeReactionRoles: number;
  totalEmojiRoles: number;
  averageEmojiRolesPerMessage: number;
  messagesWithEmbeds: number;
  multipleRolesEnabled: number;
}

interface ReactionRolesProps {
  guildId: string;
}

/**
 * Reaction Role Card Component
 * Displays individual reaction role configuration with actions
 */
const ReactionRoleCard: React.FC<{
  reactionRole: ReactionRole;
  channelName: string;
  onEdit: (reactionRole: ReactionRole) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onSendToDiscord: (id: string) => void;
  isDarkMode: boolean;
}> = ({ reactionRole, channelName, onEdit, onDelete, onDuplicate, onSendToDiscord, isDarkMode }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete "${reactionRole.title}"?`)) {
      setIsDeleting(true);
      await onDelete(reactionRole._id);
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`p-6 rounded-xl border-2 transition-all duration-300 hover:shadow-lg ${
      isDarkMode 
        ? 'bg-gradient-to-br from-[#2a2d31] to-[#1e2124] border-[#40444b] hover:border-[#5865f2]' 
        : 'bg-gradient-to-br from-white to-gray-50 border-gray-200 hover:border-purple-300'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className={`text-xl font-bold mb-2 ${
            isDarkMode ? 'text-white' : 'text-gray-800'
          }`}>
            {reactionRole.title}
          </h3>
          <p className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Channel: #{channelName} • {reactionRole.emojiRoles.length} emoji-role pairs
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {reactionRole.messageId && (
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full dark:bg-green-900/20 dark:text-green-400">
              Active
            </span>
          )}
          <span className={`px-2 py-1 text-xs rounded-full ${
            reactionRole.isActive 
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
              : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
          }`}>
            {reactionRole.isActive ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      </div>

      {/* Content Preview */}
      {reactionRole.content && (
        <div className={`mb-4 p-3 rounded-lg ${
          isDarkMode ? 'bg-[#40444b]' : 'bg-gray-100'
        }`}>
          <p className={`text-sm ${
            isDarkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            {reactionRole.content.length > 100 
              ? `${reactionRole.content.substring(0, 100)}...` 
              : reactionRole.content
            }
          </p>
        </div>
      )}

      {/* Emoji-Role Pairs Preview */}
      <div className="mb-4">
        <h4 className={`text-sm font-medium mb-2 ${
          isDarkMode ? 'text-gray-300' : 'text-gray-600'
        }`}>
          Emoji-Role Pairs:
        </h4>
        <div className="flex flex-wrap gap-2">
          {reactionRole.emojiRoles.slice(0, 6).map((emojiRole, index) => (
            <div
              key={index}
              className={`flex items-center gap-2 px-3 py-1 rounded-lg border ${
                isDarkMode ? 'bg-[#40444b] border-[#5865f2]' : 'bg-white border-purple-200'
              }`}
            >
              <span className="text-lg">{emojiRole.emoji}</span>
              <span className={`text-sm font-medium ${
                isDarkMode ? 'text-white' : 'text-gray-800'
              }`}>
                {emojiRole.role.name}
              </span>
            </div>
          ))}
          {reactionRole.emojiRoles.length > 6 && (
            <span className={`px-3 py-1 text-sm ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              +{reactionRole.emojiRoles.length - 6} more
            </span>
          )}
        </div>
      </div>

      {/* Configuration Details */}
      <div className={`grid grid-cols-2 gap-4 mb-4 text-xs ${
        isDarkMode ? 'text-gray-400' : 'text-gray-600'
      }`}>
        <div>
          <span className="font-medium">Multiple Roles:</span>
          <span className="ml-2">
            {reactionRole.allowMultipleRoles ? 'Yes' : 'No'}
          </span>
        </div>
        <div>
          <span className="font-medium">Cooldown:</span>
          <span className="ml-2">{reactionRole.cooldownSeconds}s</span>
        </div>
        {reactionRole.allowMultipleRoles && (
          <div>
            <span className="font-medium">Max per User:</span>
            <span className="ml-2">{reactionRole.maxRolesPerUser}</span>
          </div>
        )}
        <div>
          <span className="font-medium">Created:</span>
          <span className="ml-2">{formatDate(reactionRole.createdAt)}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-[#40444b]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(reactionRole)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Edit className="w-4 h-4" />
            Edit
          </button>
          
          <button
            onClick={() => onDuplicate(reactionRole._id)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Copy className="w-4 h-4" />
            Duplicate
          </button>
        </div>

        <div className="flex items-center gap-2">
          {!reactionRole.messageId && (
            <button
              onClick={() => onSendToDiscord(reactionRole._id)}
              className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
            >
              <Send className="w-4 h-4" />
              Send to Discord
            </button>
          )}
          
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Statistics Card Component
 * Displays overview statistics for reaction roles
 */
const StatsCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  isDarkMode: boolean;
}> = ({ title, value, icon, color, isDarkMode }) => (
  <div className={`p-6 rounded-xl border-2 ${
    isDarkMode 
      ? 'bg-gradient-to-br from-[#2a2d31] to-[#1e2124] border-[#40444b]' 
      : 'bg-gradient-to-br from-white to-gray-50 border-gray-200'
  }`}>
    <div className="flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        {icon}
      </div>
      <div>
        <p className={`text-2xl font-bold ${
          isDarkMode ? 'text-white' : 'text-gray-800'
        }`}>
          {value}
        </p>
        <p className={`text-sm ${
          isDarkMode ? 'text-gray-400' : 'text-gray-600'
        }`}>
          {title}
        </p>
      </div>
    </div>
  </div>
);

/**
 * Main ReactionRoles Page Component
 */
const ReactionRoles: React.FC<ReactionRolesProps> = ({ guildId }) => {
  const { isDarkMode } = useTheme();
  const { triggerAnimation } = useAnimation();
  
  // State management
  const [reactionRoles, setReactionRoles] = useState<ReactionRole[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [stats, setStats] = useState<ReactionRolesStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReactionRole, setEditingReactionRole] = useState<ReactionRole | null>(null);

  // Load data on component mount
  useEffect(() => {
    if (guildId) {
      loadData();
    }
  }, [guildId]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Load reaction roles and channels in parallel
      const [reactionRolesRes, channelsRes, statsRes] = await Promise.all([
        fetch(`${API_CONFIG.BASE_URL}/api/reaction-roles/${guildId}`),
        fetch(`${API_CONFIG.BASE_URL}/api/channels/${guildId}`),
        fetch(`${API_CONFIG.BASE_URL}/api/reaction-roles/${guildId}/stats/overview`)
      ]);

      if (reactionRolesRes.ok) {
        const reactionRolesData = await reactionRolesRes.json();
        setReactionRoles(reactionRolesData.data.reactionRoles || []);
      }

      if (channelsRes.ok) {
        const channelsData = await channelsRes.json();
        setChannels(channelsData.channels || []);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.data.stats);
      }
    } catch (err) {
      console.error('Error loading reaction roles data:', err);
      setError('Failed to load reaction roles data');
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  const handleCreateNew = () => {
    setEditingReactionRole(null);
    setIsModalOpen(true);
  };

  const handleEdit = (reactionRole: ReactionRole) => {
    setEditingReactionRole(reactionRole);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/api/reaction-roles/${guildId}/${id}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        setReactionRoles(prev => prev.filter(rr => rr._id !== id));
        triggerAnimation('success');
        // Reload stats
        const statsRes = await fetch(`${API_CONFIG.BASE_URL}/api/reaction-roles/${guildId}/stats/overview`);
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData.data.stats);
        }
      } else {
        const errorData = await response.json();
        alert(`Error deleting reaction role: ${errorData.error}`);
      }
    } catch (err) {
      console.error('Error deleting reaction role:', err);
      alert('Failed to delete reaction role');
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/api/reaction-roles/${guildId}/${id}/duplicate`,
        { method: 'POST' }
      );

      if (response.ok) {
        const data = await response.json();
        setReactionRoles(prev => [data.data.reactionRole, ...prev]);
        triggerAnimation('success');
        alert('Reaction role duplicated successfully!');
      } else {
        const errorData = await response.json();
        alert(`Error duplicating reaction role: ${errorData.error}`);
      }
    } catch (err) {
      console.error('Error duplicating reaction role:', err);
      alert('Failed to duplicate reaction role');
    }
  };

  const handleSendToDiscord = async (id: string) => {
    try {
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/api/reaction-roles/${guildId}/${id}/send`,
        { method: 'POST' }
      );

      if (response.ok) {
        triggerAnimation('success');
        alert('Reaction role message sent to Discord successfully!');
        // Reload data to get updated messageId
        loadData();
      } else {
        const errorData = await response.json();
        alert(`Error sending to Discord: ${errorData.error}`);
      }
    } catch (err) {
      console.error('Error sending to Discord:', err);
      alert('Failed to send to Discord');
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingReactionRole(null);
    // Reload data to get any changes
    loadData();
  };

  const getChannelName = (channelId: string) => {
    const channel = channels.find(c => c.id === channelId);
    return channel ? channel.name : 'Unknown Channel';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className={`text-lg ${
            isDarkMode ? 'text-gray-300' : 'text-gray-600'
          }`}>
            Loading reaction roles...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 text-lg mb-4">{error}</div>
        <button
          onClick={loadData}
          className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className={`text-4xl font-bold mb-4 ${
          isDarkMode ? 'text-white' : 'text-gray-800'
        }`}>
          Reaction Roles
        </h1>
        <p className={`text-lg ${
          isDarkMode ? 'text-gray-300' : 'text-gray-600'
        }`}>
          Manage automatic role assignment through emoji reactions
        </p>
      </div>

      {/* Statistics Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatsCard
            title="Total Reaction Roles"
            value={stats.totalReactionRoles}
            icon={<BarChart3 className="w-6 h-6 text-white" />}
            color="bg-blue-500"
            isDarkMode={isDarkMode}
          />
          <StatsCard
            title="Active Messages"
            value={stats.activeReactionRoles}
            icon={<Eye className="w-6 h-6 text-white" />}
            color="bg-green-500"
            isDarkMode={isDarkMode}
          />
          <StatsCard
            title="Total Emoji-Role Pairs"
            value={stats.totalEmojiRoles}
            icon={<Settings className="w-6 h-6 text-white" />}
            color="bg-purple-500"
            isDarkMode={isDarkMode}
          />
        </div>
      )}

      {/* Create New Button */}
      <div className="text-center">
        <button
          onClick={handleCreateNew}
          className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white text-lg font-semibold rounded-xl hover:from-purple-700 hover:to-purple-800 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          <Plus className="w-6 h-6" />
          Create New Reaction Role
        </button>
      </div>

      {/* Reaction Roles List */}
      <div>
        <h2 className={`text-2xl font-bold mb-6 ${
          isDarkMode ? 'text-white' : 'text-gray-800'
        }`}>
          Your Reaction Roles ({reactionRoles.length})
        </h2>

        {reactionRoles.length === 0 ? (
          <div className={`text-center py-16 border-2 border-dashed rounded-xl ${
            isDarkMode ? 'border-[#40444b] text-gray-400' : 'border-gray-300 text-gray-500'
          }`}>
            <div className="text-6xl mb-4">🎭</div>
            <h3 className="text-xl font-semibold mb-2">No Reaction Roles Yet</h3>
            <p className="mb-6">Create your first reaction role to get started!</p>
            <button
              onClick={handleCreateNew}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Create Your First Reaction Role
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {reactionRoles.map((reactionRole) => (
              <ReactionRoleCard
                key={reactionRole._id}
                reactionRole={reactionRole}
                channelName={getChannelName(reactionRole.channelId)}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                onSendToDiscord={handleSendToDiscord}
                isDarkMode={isDarkMode}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <ReactionRoleModal
        guildId={guildId}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        editingReactionRole={editingReactionRole}
      />
    </div>
  );
};
 
export default ReactionRoles; 