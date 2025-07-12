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
import { Bomb, Settings } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import NukeModal from './NukeModal';

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

  const handleNukeClick = () => {
    if (!guildId) {
      alert('Please select a server first');
      return;
    }
    setIsNukeModalOpen(true);
  };

  return (
    <>
      <div className={`w-[48rem] h-[23rem] backdrop-blur-sm rounded-2xl p-6 transition-colors duration-300 ${
        isDarkMode ? 'bg-[#181c24]' : 'bg-white'
      }`}>
        <h2 className="text-md font-bold mb-4 bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent uppercase flex items-center gap-2">
          <Settings className="w-4 h-4" />
          <span className="text-left">GENERAL OPTIONS</span>
        </h2>
        
        {/* Grid de opciones */}
        <div className="grid grid-cols-1 gap-4 h-[calc(100%-3rem)]">
          {/* Opción Nuke */}
          <button
            onClick={handleNukeClick}
            className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-200 hover:scale-[1.02] ${
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

          {/* Espacio para futuras opciones */}
          <div className={`flex items-center justify-center h-32 rounded-xl border-2 border-dashed ${
            isDarkMode ? 'border-gray-600 text-gray-400' : 'border-gray-300 text-gray-500'
          }`}>
            <div className="text-center">
              <Settings className={`w-8 h-8 mx-auto mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
              <p className="text-sm">More options coming soon...</p>
            </div>
          </div>
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
    </>
  );
};

export default GeneralOptions; 