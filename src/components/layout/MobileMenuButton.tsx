import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface MobileMenuButtonProps {
  onClick: () => void;
  isOpen?: boolean;
}

const MobileMenuButton: React.FC<MobileMenuButtonProps> = ({ onClick, isOpen = false }) => {
  const { isDarkMode } = useTheme();

  return (
    <button
      onClick={onClick}
      className={`relative p-3 rounded-2xl transition-all duration-300 ease-out group ${
        isOpen
          ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
          : isDarkMode 
            ? 'text-gray-400 hover:text-white hover:bg-gray-800/50' 
            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
      }`}
      aria-label="Toggle mobile menu"
    >
      <div className="relative w-6 h-6 flex items-center justify-center">
        {/* Línea superior */}
        <div 
          className={`absolute w-5 h-0.5 rounded-full transition-all duration-300 ease-out ${
            isOpen 
              ? 'bg-white rotate-45 translate-y-0' 
              : 'bg-current -translate-y-1.5'
          }`}
        />
        
        {/* Línea central */}
        <div 
          className={`absolute w-5 h-0.5 rounded-full transition-all duration-300 ease-out ${
            isOpen 
              ? 'bg-white opacity-0 scale-0' 
              : 'bg-current opacity-100 scale-100'
          }`}
        />
        
        {/* Línea inferior */}
        <div 
          className={`absolute w-5 h-0.5 rounded-full transition-all duration-300 ease-out ${
            isOpen 
              ? 'bg-white -rotate-45 translate-y-0' 
              : 'bg-current translate-y-1.5'
          }`}
        />
      </div>
      
      {/* Efecto de brillo */}
      <div 
        className={`absolute inset-0 rounded-2xl transition-all duration-300 ease-out ${
          isOpen 
            ? 'bg-gradient-to-r from-blue-400 to-blue-600 opacity-20' 
            : 'bg-gradient-to-r from-gray-400 to-gray-600 opacity-0 group-hover:opacity-10'
        }`}
      />
    </button>
  );
};

export default MobileMenuButton; 