import React from "react";
import { Users, Hash, Shield } from "lucide-react";

interface RaidTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectType: (type: 'join' | 'channel' | 'role') => void;
  isDarkMode: boolean;
}

const RaidTypeModal: React.FC<RaidTypeModalProps> = ({ isOpen, onClose, onSelectType, isDarkMode }) => {
  if (!isOpen) return null;

  const raidTypes = [
    {
      type: 'join' as const,
      title: 'Join Raid',
      description: 'Detecta cuando muchos usuarios se unen rápidamente',
      icon: Users,
      gradient: 'from-green-500 to-blue-500'
    },
    {
      type: 'channel' as const,
      title: 'Channel Raid',
      description: 'Detecta cuando se crean muchos canales rápidamente',
      icon: Hash,
      gradient: 'from-purple-500 to-pink-500'
    },
    {
      type: 'role' as const,
      title: 'Role Raid',
      description: 'Detecta cuando se crean muchos roles rápidamente',
      icon: Shield,
      gradient: 'from-orange-500 to-red-500'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className={`rounded-2xl p-6 max-w-md w-full mx-4 shadow-lg ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        <h3 className={`text-xl font-bold mb-4 ${
          isDarkMode ? 'text-white' : 'text-gray-900'
        }`}>
          Seleccionar tipo de protección anti-raid
        </h3>
        
        <div className="space-y-3">
          {raidTypes.map((raidType) => (
            <button
              key={raidType.type}
              onClick={() => onSelectType(raidType.type)}
              className={`w-full p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                isDarkMode 
                  ? 'border-gray-600 hover:border-gray-400 bg-gray-700' 
                  : 'border-gray-200 hover:border-gray-300 bg-gray-50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${raidType.gradient} flex items-center justify-center`}>
                  <raidType.icon className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <h4 className={`font-semibold ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {raidType.title}
                  </h4>
                  <p className={`text-sm ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    {raidType.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
        
        <button
          onClick={onClose}
          className={`w-full mt-4 py-2 px-4 rounded-lg font-semibold transition-colors ${
            isDarkMode 
              ? 'bg-gray-600 hover:bg-gray-500 text-white' 
              : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
          }`}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};

export default RaidTypeModal; 