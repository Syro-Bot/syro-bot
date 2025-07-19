/**
 * @fileoverview General Options Component
 *
 * Componente que muestra opciones generales del servidor como Nuke, etc.
 * Incluye diferentes herramientas administrativas con modales.
 * Completamente responsive para móvil y desktop.
 *
 * @author Syro Frontend Team
 * @version 1.0.0
 * @since 2024
 */

import React, { useState } from "react";
import { Bomb, Settings, Megaphone, Users, Database, FileText, Command } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import NukeModal from './NukeModal';
import AnnouncementModal from './AnnouncementModal';
import MemberCountModal from './MemberCountModal';
import DataRetentionModal from './DataRetentionModal';

interface GeneralOptionsProps {
  guildId?: string;
}

/**
 * Componente GeneralOptions
 * Muestra opciones generales del servidor.
 *
 * @component
 * @param {string} guildId - ID del servidor seleccionado
 */
const GeneralOptions: React.FC<GeneralOptionsProps> = ({ guildId }) => {
  const { isDarkMode } = useTheme();
  const [isNukeModalOpen, setIsNukeModalOpen] = useState(false);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [isMemberCountModalOpen, setIsMemberCountModalOpen] = useState(false);
  const [isDataRetentionModalOpen, setIsDataRetentionModalOpen] = useState(false);
  const [isChannelLogsModalOpen, setIsChannelLogsModalOpen] = useState(false);
  const [isCommandsModalOpen, setIsCommandsModalOpen] = useState(false);

  const handleNukeClick = () => {
    if (!guildId) {
      alert('Please select a server first');
      return;
    }
    setIsNukeModalOpen(true);
  };

  const handleAnnouncementClick = () => {
    if (!guildId) {
      alert('Please select a server first');
      return;
    }
    setIsAnnouncementModalOpen(true);
  };

  const handleMemberCountClick = () => {
    if (!guildId) {
      alert('Please select a server first');
      return;
    }
    setIsMemberCountModalOpen(true);
  };

  const handleDataRetentionClick = () => {
    if (!guildId) {
      alert('Please select a server first');
      return;
    }
    setIsDataRetentionModalOpen(true);
  };

  const handleChannelLogsClick = () => {
    if (!guildId) {
      alert('Please select a server first');
      return;
    }
    setIsChannelLogsModalOpen(true);
  };

  const handleCommandsClick = () => {
    if (!guildId) {
      alert('Please select a server first');
      return;
    }
    setIsCommandsModalOpen(true);
  };

  return (
    <>
      <div className={`w-full h-full backdrop-blur-sm rounded-2xl p-3 md:p-4 transition-all duration-300 border-2 shadow-md ${
        isDarkMode 
          ? 'bg-gradient-to-br from-[#181c24] via-[#101010] to-[#23272f] border-[#23272f]' 
          : 'bg-gradient-to-br from-white via-blue-50 to-blue-100 border-blue-100'
      }`}>
        <h2 className="text-xs md:text-sm font-bold mb-3 bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent uppercase flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-purple-500"></span>
          <span className="text-left">GENERAL OPTIONS</span>
          <Settings className="w-4 h-4" />
        </h2>
        
        {/* Grid de opciones con scroll */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto max-h-[calc(100vh-200px)] pb-2 pr-1">
          {/* Opción Nuke */}
          <button
            onClick={handleNukeClick}
            className={`flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg h-20 ${
              isDarkMode 
                ? 'bg-gradient-to-r from-red-500/20 to-red-600/20 hover:from-red-500/30 hover:to-red-600/30 border-2 border-red-500/30 hover:border-red-400/50' 
                : 'bg-gradient-to-r from-red-50 to-red-100 hover:from-red-100 hover:to-red-200 border-2 border-red-200 hover:border-red-300'
            }`}
          >
            {/* Icono */}
            <div className={`flex-shrink-0 w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center ${
              isDarkMode ? 'bg-red-500/20' : 'bg-red-100'
            }`}>
              <Bomb className={`w-4 h-4 md:w-5 md:h-5 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`} />
            </div>
            
            {/* Contenido */}
            <div className="flex-1 text-left min-w-0">
              <h3 className={`font-semibold text-sm md:text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Nuke
              </h3>
              <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} truncate`}>
                Delete and recreate a channel completely. Useful for cleaning.
              </p>
            </div>
            
            {/* Indicador */}
            <div className={`flex-shrink-0 w-2 h-2 rounded-full ${
              isDarkMode ? 'bg-red-400' : 'bg-red-500'
            }`}></div>
          </button>

          {/* Opción Send Announcement */}
          <button
            onClick={handleAnnouncementClick}
            className={`flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg h-20 ${
              isDarkMode 
                ? 'bg-gradient-to-r from-blue-500/20 to-blue-600/20 hover:from-blue-500/30 hover:to-blue-600/30 border-2 border-blue-500/30 hover:border-blue-400/50' 
                : 'bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 border-2 border-blue-200 hover:border-blue-300'
            }`}
          >
            {/* Icono */}
            <div className={`flex-shrink-0 w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center ${
              isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'
            }`}>
              <Megaphone className={`w-4 h-4 md:w-5 md:h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            
            {/* Contenido */}
            <div className="flex-1 text-left min-w-0">
              <h3 className={`font-semibold text-sm md:text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Send Announcement
              </h3>
              <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} truncate`}>
                Send formatted announcements with embeds to channels.
              </p>
            </div>
            
            {/* Indicador */}
            <div className={`flex-shrink-0 w-2 h-2 rounded-full ${
              isDarkMode ? 'bg-blue-400' : 'bg-blue-500'
            }`}></div>
          </button>

          {/* Opción Member Count */}
          <button
            onClick={handleMemberCountClick}
            className={`flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg h-20 ${
              isDarkMode 
                ? 'bg-gradient-to-r from-green-500/20 to-green-600/20 hover:from-green-500/30 hover:to-green-600/30 border-2 border-green-500/30 hover:border-green-400/50' 
                : 'bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 border-2 border-green-200 hover:border-green-300'
            }`}
          >
            {/* Icono */}
            <div className={`flex-shrink-0 w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center ${
              isDarkMode ? 'bg-green-500/20' : 'bg-green-100'
            }`}>
              <Users className={`w-4 h-4 md:w-5 md:h-5 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
            </div>
            
            {/* Contenido */}
            <div className="flex-1 text-left min-w-0">
              <h3 className={`font-semibold text-sm md:text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Member Count
              </h3>
              <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} truncate`}>
                Create voice channel that shows real-time member count.
              </p>
            </div>
            
            {/* Indicador */}
            <div className={`flex-shrink-0 w-2 h-2 rounded-full ${
              isDarkMode ? 'bg-green-400' : 'bg-green-500'
            }`}></div>
          </button>

          {/* Opción Data Retention */}
          <button
            onClick={handleDataRetentionClick}
            className={`flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg h-20 ${
              isDarkMode 
                ? 'bg-gradient-to-r from-orange-500/20 to-orange-600/20 hover:from-orange-500/30 hover:to-orange-600/30 border-2 border-orange-500/30 hover:border-orange-400/50' 
                : 'bg-gradient-to-r from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 border-2 border-orange-200 hover:border-orange-300'
            }`}
          >
            {/* Icono */}
            <div className={`flex-shrink-0 w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center ${
              isDarkMode ? 'bg-orange-500/20' : 'bg-orange-100'
            }`}>
              <Database className={`w-4 h-4 md:w-5 md:h-5 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`} />
            </div>
            
            {/* Contenido */}
            <div className="flex-1 text-left min-w-0">
              <h3 className={`font-semibold text-sm md:text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Data Retention
              </h3>
              <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} truncate`}>
                Configure data deletion policies when bot leaves server.
              </p>
            </div>
            
            {/* Indicador */}
            <div className={`flex-shrink-0 w-2 h-2 rounded-full ${
              isDarkMode ? 'bg-orange-400' : 'bg-orange-500'
            }`}></div>
          </button>

          {/* Opción Channel Logs */}
          <button
            onClick={handleChannelLogsClick}
            className={`flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg h-20 ${
              isDarkMode 
                ? 'bg-gradient-to-r from-purple-500/20 to-purple-600/20 hover:from-purple-500/30 hover:to-purple-600/30 border-2 border-purple-500/30 hover:border-purple-400/50' 
                : 'bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 border-2 border-purple-200 hover:border-purple-300'
            }`}
          >
            {/* Icono */}
            <div className={`flex-shrink-0 w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center ${
              isDarkMode ? 'bg-purple-500/20' : 'bg-purple-100'
            }`}>
              <FileText className={`w-4 h-4 md:w-5 md:h-5 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} />
            </div>
            
            {/* Contenido */}
            <div className="flex-1 text-left min-w-0">
              <h3 className={`font-semibold text-sm md:text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Channel Logs
              </h3>
              <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} truncate`}>
                Configure logging for member joins, leaves, and events.
              </p>
            </div>
            
            {/* Indicador */}
            <div className={`flex-shrink-0 w-2 h-2 rounded-full ${
              isDarkMode ? 'bg-purple-400' : 'bg-purple-500'
            }`}></div>
          </button>

          {/* Opción Commands */}
          <button
            onClick={handleCommandsClick}
            className={`flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg h-20 ${
              isDarkMode 
                ? 'bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 hover:from-yellow-500/30 hover:to-yellow-600/30 border-2 border-yellow-500/30 hover:border-yellow-400/50' 
                : 'bg-gradient-to-r from-yellow-50 to-yellow-100 hover:from-yellow-100 hover:to-yellow-200 border-2 border-yellow-200 hover:border-yellow-300'
            }`}
          >
            {/* Icono */}
            <div className={`flex-shrink-0 w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center ${
              isDarkMode ? 'bg-yellow-500/20' : 'bg-yellow-100'
            }`}>
              <Command className={`w-4 h-4 md:w-5 md:h-5 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
            </div>
            
            {/* Contenido */}
            <div className="flex-1 text-left min-w-0">
              <h3 className={`font-semibold text-sm md:text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Commands
              </h3>
              <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} truncate`}>
                Configure bot commands, prefix, and permissions.
              </p>
            </div>
            
            {/* Indicador */}
            <div className={`flex-shrink-0 w-2 h-2 rounded-full ${
              isDarkMode ? 'bg-yellow-400' : 'bg-yellow-500'
            }`}></div>
          </button>
        </div>
      </div>

      {/* Modales */}
      <NukeModal
        isOpen={isNukeModalOpen}
        onClose={() => setIsNukeModalOpen(false)}
        guildId={guildId}
      />

      <AnnouncementModal
        isOpen={isAnnouncementModalOpen}
        onClose={() => setIsAnnouncementModalOpen(false)}
        guildId={guildId}
      />

      <MemberCountModal
        isOpen={isMemberCountModalOpen}
        onClose={() => setIsMemberCountModalOpen(false)}
        guildId={guildId}
      />

      <DataRetentionModal
        isOpen={isDataRetentionModalOpen}
        onClose={() => setIsDataRetentionModalOpen(false)}
        guildId={guildId}
      />

      {/* Channel Logs Modal - Placeholder for now */}
      {isChannelLogsModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`relative rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border-2 ${
            isDarkMode 
              ? 'bg-gradient-to-br from-[#181c24] via-[#101010] to-[#23272f] border-[#23272f]' 
              : 'bg-gradient-to-br from-white via-purple-50 to-purple-100 border-purple-100'
          }`}>
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 text-white">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Channel Logs</h3>
                  <p className="text-purple-100 text-sm">Configure logging channels</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <p className={`text-sm leading-relaxed mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Configure which channel will receive logs for member joins, leaves, channel changes, and other server events.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => setIsChannelLogsModalOpen(false)}
                  className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white py-3 px-4 rounded-xl font-semibold"
                >
                  Coming Soon
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Commands Modal - Placeholder for now */}
      {isCommandsModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`relative rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border-2 ${
            isDarkMode 
              ? 'bg-gradient-to-br from-[#181c24] via-[#101010] to-[#23272f] border-[#23272f]' 
              : 'bg-gradient-to-br from-white via-yellow-50 to-yellow-100 border-yellow-100'
          }`}>
            <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 p-6 text-white">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <Command className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Commands</h3>
                  <p className="text-yellow-100 text-sm">Manage bot commands</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <p className={`text-sm leading-relaxed mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Configure bot commands, change prefix, and manage command permissions. Available commands: xnuke, xpurge, xavatar, and more.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => setIsCommandsModalOpen(false)}
                  className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white py-3 px-4 rounded-xl font-semibold"
                >
                  Coming Soon
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GeneralOptions; 