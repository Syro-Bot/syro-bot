/**
 * @fileoverview General Options Component
 *
 * Componente que muestra opciones generales del servidor como Nuke, etc.
 * Incluye diferentes herramientas administrativas con modales.
 *
 * @author Syro Frontend Team
 * @version 1.0.0
 * @since 2024
 */

import React, { useState } from "react";
import { Bomb, Settings, Megaphone, Users, Database } from 'lucide-react';
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

  return (
    <>
      <div className={`w-[48rem] h-[23rem] backdrop-blur-sm rounded-2xl p-6 transition-colors duration-300 flex flex-col ${
        isDarkMode ? 'bg-[#181c24]' : 'bg-white'
      }`}>
        <h2 className="text-md font-bold mb-4 bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent uppercase flex items-center gap-2">
          <Settings className="w-4 h-4" />
          <span className="text-left">GENERAL OPTIONS</span>
        </h2>
        
        {/* Grid de opciones */}
        <div className="grid grid-cols-1 gap-3 flex-1 overflow-y-auto pb-2">
          {/* Opción Nuke */}
          <button
            onClick={handleNukeClick}
            className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-200 ${
              isDarkMode 
                ? 'bg-gradient-to-r from-red-500/20 to-red-600/20 hover:from-red-500/30 hover:to-red-600/30 border border-red-500/30' 
                : 'bg-gradient-to-r from-red-50 to-red-100 hover:from-red-100 hover:to-red-200 border border-red-200'
            }`}
          >
            {/* Icono */}
            <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${
              isDarkMode ? 'bg-red-500/20' : 'bg-red-100'
            }`}>
              <Bomb className={`w-6 h-6 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`} />
            </div>
            
            {/* Contenido */}
            <div className="flex-1 text-left">
              <h3 className={`font-semibold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Nuke
              </h3>
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Delete and recreate a channel completely. Useful for cleaning massive content.
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
            className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-200 ${
              isDarkMode 
                ? 'bg-gradient-to-r from-blue-500/20 to-blue-600/20 hover:from-blue-500/30 hover:to-blue-600/30 border border-blue-500/30' 
                : 'bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 border border-blue-200'
            }`}
          >
            {/* Icono */}
            <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${
              isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'
            }`}>
              <Megaphone className={`w-6 h-6 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            
            {/* Contenido */}
            <div className="flex-1 text-left">
              <h3 className={`font-semibold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Send Announcement
              </h3>
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Send a formatted announcement with embeds to multiple channels.
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
            className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-200 ${
              isDarkMode 
                ? 'bg-gradient-to-r from-green-500/20 to-green-600/20 hover:from-green-500/30 hover:to-green-600/30 border border-green-500/30' 
                : 'bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 border border-green-200'
            }`}
          >
            {/* Icono */}
            <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${
              isDarkMode ? 'bg-green-500/20' : 'bg-green-100'
            }`}>
              <Users className={`w-6 h-6 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
            </div>
            
            {/* Contenido */}
            <div className="flex-1 text-left">
              <h3 className={`font-semibold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Member Count
              </h3>
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Create a voice channel that shows real-time member count. Users can see but cannot join.
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
            className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-200 ${
              isDarkMode 
                ? 'bg-gradient-to-r from-orange-500/20 to-orange-600/20 hover:from-orange-500/30 hover:to-orange-600/30 border border-orange-500/30' 
                : 'bg-gradient-to-r from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 border border-orange-200'
            }`}
          >
            {/* Icono */}
            <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${
              isDarkMode ? 'bg-orange-500/20' : 'bg-orange-100'
            }`}>
              <Database className={`w-6 h-6 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`} />
            </div>
            
            {/* Contenido */}
            <div className="flex-1 text-left">
              <h3 className={`font-semibold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Data Retention
              </h3>
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Configure data deletion policies when Syro leaves the server. Default: 3 days retention.
              </p>
            </div>
            
            {/* Indicador */}
            <div className={`flex-shrink-0 w-2 h-2 rounded-full ${
              isDarkMode ? 'bg-orange-400' : 'bg-orange-500'
            }`}></div>
          </button>
        </div>
      </div>

      {/* Modal de Nuke */}
      {isNukeModalOpen && (
        <NukeModal
          guildId={guildId}
          isOpen={isNukeModalOpen}
          onClose={() => setIsNukeModalOpen(false)}
        />
      )}

      {/* Modal de Announcement */}
      {isAnnouncementModalOpen && (
        <AnnouncementModal
          guildId={guildId}
          isOpen={isAnnouncementModalOpen}
          onClose={() => setIsAnnouncementModalOpen(false)}
        />
      )}

      {/* Modal de Member Count */}
      {isMemberCountModalOpen && (
        <MemberCountModal
          guildId={guildId}
          isOpen={isMemberCountModalOpen}
          onClose={() => setIsMemberCountModalOpen(false)}
        />
      )}

      {/* Modal de Data Retention */}
      {isDataRetentionModalOpen && (
        <DataRetentionModal
          guildId={guildId}
          isOpen={isDataRetentionModalOpen}
          onClose={() => setIsDataRetentionModalOpen(false)}
        />
      )}
    </>
  );
};

export default GeneralOptions; 