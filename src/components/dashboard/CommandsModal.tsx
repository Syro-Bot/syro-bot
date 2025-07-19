/**
 * @fileoverview Commands Modal Component
 *
 * Modal para mostrar todos los comandos disponibles del bot con explicaciones detalladas.
 * Organiza los comandos por categorías (Admin, Moderación, Utilidades, etc.)
 *
 * @author Syro Frontend Team
 * @version 1.0.0
 * @since 2024
 */

import React, { useState } from "react";
import { Command, Shield, Users, Settings, Zap, Search, Copy, CheckCircle } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface CommandInfo {
  name: string;
  description: string;
  usage: string;
  aliases?: string[];
  permissions?: string[];
  category: 'admin' | 'moderation' | 'utility' | 'info';
  cooldown?: string;
}

interface CommandsModalProps {
  guildId?: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Configuration object for all available commands
 * Centralized command information for easy maintenance
 */
const COMMANDS_CONFIG: CommandInfo[] = [
  // Admin Commands
  {
    name: 'xnuke',
    description: 'Delete and recreate a channel completely. Useful for cleaning spam or unwanted content.',
    usage: 'xnuke [channel]',
    aliases: ['nuke'],
    permissions: ['Administrator', 'Manage Channels'],
    category: 'admin',
    cooldown: '5 minutes'
  },
  {
    name: 'xpurge',
    description: 'Delete a specified number of messages from the current channel.',
    usage: 'xpurge <amount> [user]',
    aliases: ['purge', 'clear'],
    permissions: ['Manage Messages'],
    category: 'moderation',
    cooldown: '3 minutes'
  },
  {
    name: 'xban',
    description: 'Ban a user from the server with optional reason.',
    usage: 'xban <user> [reason]',
    aliases: ['ban'],
    permissions: ['Ban Members'],
    category: 'moderation',
    cooldown: '1 minute'
  },
  {
    name: 'xkick',
    description: 'Kick a user from the server with optional reason.',
    usage: 'xkick <user> [reason]',
    aliases: ['kick'],
    permissions: ['Kick Members'],
    category: 'moderation',
    cooldown: '1 minute'
  },
  {
    name: 'xmute',
    description: 'Timeout a user for a specified duration.',
    usage: 'xmute <user> <duration> [reason]',
    aliases: ['mute', 'timeout'],
    permissions: ['Moderate Members'],
    category: 'moderation',
    cooldown: '30 seconds'
  },
  {
    name: 'xunmute',
    description: 'Remove timeout from a user.',
    usage: 'xunmute <user>',
    aliases: ['unmute', 'untimeout'],
    permissions: ['Moderate Members'],
    category: 'moderation',
    cooldown: '30 seconds'
  },
  
  // Utility Commands
  {
    name: 'xavatar',
    description: 'Display a user\'s avatar in high resolution.',
    usage: 'xavatar [user]',
    aliases: ['avatar', 'av'],
    permissions: [],
    category: 'utility',
    cooldown: '10 seconds'
  },
  {
    name: 'xuserinfo',
    description: 'Display detailed information about a user.',
    usage: 'xuserinfo [user]',
    aliases: ['userinfo', 'whois', 'user'],
    permissions: [],
    category: 'utility',
    cooldown: '10 seconds'
  },
  {
    name: 'xserverinfo',
    description: 'Display detailed information about the server.',
    usage: 'xserverinfo',
    aliases: ['serverinfo', 'server'],
    permissions: [],
    category: 'utility',
    cooldown: '10 seconds'
  },
  {
    name: 'xping',
    description: 'Check the bot\'s latency and response time.',
    usage: 'xping',
    aliases: ['ping'],
    permissions: [],
    category: 'utility',
    cooldown: '5 seconds'
  },
  {
    name: 'xhelp',
    description: 'Display help information about commands.',
    usage: 'xhelp [command]',
    aliases: ['help', 'h'],
    permissions: [],
    category: 'utility',
    cooldown: '5 seconds'
  },
  
  // Info Commands
  {
    name: 'xstats',
    description: 'Display server statistics and bot information.',
    usage: 'xstats',
    aliases: ['stats', 'statistics'],
    permissions: [],
    category: 'info',
    cooldown: '30 seconds'
  },
  {
    name: 'xinvite',
    description: 'Generate an invite link for the bot.',
    usage: 'xinvite',
    aliases: ['invite'],
    permissions: [],
    category: 'info',
    cooldown: '1 minute'
  }
];

/**
 * Category configuration for better organization
 */
const CATEGORIES = {
  admin: {
    name: 'Administration',
    icon: Shield,
    color: 'red',
    description: 'High-level server management commands'
  },
  moderation: {
    name: 'Moderation',
    icon: Users,
    color: 'orange',
    description: 'User management and moderation tools'
  },
  utility: {
    name: 'Utility',
    icon: Zap,
    color: 'blue',
    description: 'General utility and information commands'
  },
  info: {
    name: 'Information',
    icon: Settings,
    color: 'green',
    description: 'Server and bot information commands'
  }
};

/**
 * Componente CommandsModal
 * Modal para mostrar todos los comandos disponibles del bot.
 *
 * @component
 * @param {string} guildId - ID del servidor
 * @param {boolean} isOpen - Estado del modal
 * @param {function} onClose - Función para cerrar el modal
 */
const CommandsModal: React.FC<CommandsModalProps> = ({ guildId, isOpen, onClose }) => {
  const { isDarkMode } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedCommand, setCopiedCommand] = useState<string>('');

  // Filter commands based on search and category
  const filteredCommands = COMMANDS_CONFIG.filter(command => {
    const matchesSearch = command.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         command.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         command.aliases?.some(alias => alias.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || command.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Copy command to clipboard
  const copyCommand = async (commandName: string) => {
    try {
      await navigator.clipboard.writeText(commandName);
      setCopiedCommand(commandName);
      setTimeout(() => setCopiedCommand(''), 2000);
    } catch (error) {
      console.error('Failed to copy command:', error);
    }
  };

  // Get category color classes
  const getCategoryColor = (category: string) => {
    const colors = {
      admin: isDarkMode ? 'text-red-400' : 'text-red-600',
      moderation: isDarkMode ? 'text-orange-400' : 'text-orange-600',
      utility: isDarkMode ? 'text-blue-400' : 'text-blue-600',
      info: isDarkMode ? 'text-green-400' : 'text-green-600'
    };
    return colors[category as keyof typeof colors] || colors.utility;
  };

  // Get category background color classes
  const getCategoryBgColor = (category: string) => {
    const colors = {
      admin: isDarkMode ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200',
      moderation: isDarkMode ? 'bg-orange-500/10 border-orange-500/20' : 'bg-orange-50 border-orange-200',
      utility: isDarkMode ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200',
      info: isDarkMode ? 'bg-green-500/10 border-green-500/20' : 'bg-green-50 border-green-200'
    };
    return colors[category as keyof typeof colors] || colors.utility;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`relative rounded-3xl shadow-2xl w-full max-w-6xl h-[90vh] overflow-hidden border-2 ${
        isDarkMode 
          ? 'bg-gradient-to-br from-[#181c24] via-[#101010] to-[#23272f] border-[#23272f]' 
          : 'bg-gradient-to-br from-white via-yellow-50 to-yellow-100 border-yellow-100'
      }`}>
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Command className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Bot Commands</h3>
                <p className="text-yellow-100 text-sm">All available commands and their usage</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
              title="Close modal"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto h-[calc(90vh-200px)]">
          {/* Search and Filters */}
          <div className="mb-6">
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`} />
                  <input
                    type="text"
                    placeholder="Search commands..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 rounded-xl border transition-colors ${
                      isDarkMode 
                        ? 'bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-yellow-500' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-yellow-500'
                    }`}
                  />
                </div>
              </div>
              
              {/* Category Filter */}
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    selectedCategory === 'all'
                      ? 'bg-yellow-500 text-white'
                      : isDarkMode 
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  All
                </button>
                {Object.entries(CATEGORIES).map(([key, category]) => {
                  const IconComponent = category.icon;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedCategory(key)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 ${
                        selectedCategory === key
                          ? `bg-${category.color}-500 text-white`
                          : isDarkMode 
                            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                      {category.name}
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* Results count */}
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Showing {filteredCommands.length} of {COMMANDS_CONFIG.length} commands
            </p>
          </div>

          {/* Commands List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 min-h-[300px]">
            {filteredCommands.length === 0 ? (
              <div className={`col-span-full text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <Command className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No commands found</p>
                <p className="text-sm">Try adjusting your search or category filter</p>
              </div>
            ) : (
              filteredCommands.map((command) => {
                const category = CATEGORIES[command.category];
                const IconComponent = category.icon;
                
                return (
                  <div
                    key={command.name}
                    className={`p-4 rounded-xl border transition-colors h-fit ${
                      isDarkMode ? 'bg-gray-800/50 border-gray-600' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${getCategoryBgColor(command.category)}`}>
                          <IconComponent className={`w-5 h-5 ${getCategoryColor(command.category)}`} />
                        </div>
                        <div>
                          <h4 className={`font-semibold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {command.name}
                          </h4>
                          <p className={`text-sm ${getCategoryColor(command.category)}`}>
                            {category.name}
                          </p>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => copyCommand(command.name)}
                        className={`p-2 rounded-lg transition-colors ${
                          copiedCommand === command.name
                            ? 'bg-green-500/20 text-green-400'
                            : isDarkMode 
                              ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-300' 
                              : 'hover:bg-gray-200 text-gray-600 hover:text-gray-800'
                        }`}
                        title="Copy command"
                      >
                        {copiedCommand === command.name ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    
                    <p className={`text-sm mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {command.description}
                    </p>
                    
                    <div className="space-y-2">
                      {/* Usage */}
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Usage:
                        </span>
                        <code className={`px-2 py-1 rounded text-xs font-mono ${
                          isDarkMode ? 'bg-gray-700 text-yellow-400' : 'bg-gray-200 text-gray-800'
                        }`}>
                          {command.usage}
                        </code>
                      </div>
                      
                      {/* Aliases */}
                      {command.aliases && command.aliases.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Aliases:
                          </span>
                          <div className="flex gap-1">
                            {command.aliases.map((alias) => (
                              <span
                                key={alias}
                                className={`px-2 py-1 rounded text-xs ${
                                  isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                                }`}
                              >
                                {alias}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Permissions */}
                      {command.permissions && command.permissions.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Permissions:
                          </span>
                          <div className="flex gap-1">
                            {command.permissions.map((permission) => (
                              <span
                                key={permission}
                                className={`px-2 py-1 rounded text-xs ${
                                  isDarkMode ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700'
                                }`}
                              >
                                {permission}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Cooldown */}
                      {command.cooldown && (
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Cooldown:
                          </span>
                          <span className={`px-2 py-1 rounded text-xs ${
                            isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {command.cooldown}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
        
        {/* Prefix in bottom left */}
        <div className="absolute bottom-4 left-4">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Prefix
            </span>
            <div className="w-6 h-6 rounded bg-yellow-500 flex items-center justify-center">
              <span className="text-white text-sm font-mono font-bold">x</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandsModal; 