import React, { useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  ChartSpline, 
  UsersRound, 
  Shield, 
  Bell, 
  Search, 
  PlusSquare,
  X
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (component: string) => void;
  activeComponent: string;
}

interface MenuItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  description?: string;
}

const MobileMenu: React.FC<MobileMenuProps> = ({ 
  isOpen, 
  onClose, 
  onNavigate, 
  activeComponent 
}) => {
  const { isDarkMode } = useTheme();
  const menuRef = useRef<HTMLDivElement>(null);

  const menuItems: MenuItem[] = [
    { 
      id: 'dashboard', 
      icon: LayoutDashboard, 
      label: 'Dashboard',
      description: 'Overview and statistics'
    },
    { 
      id: 'autoModeration', 
      icon: Shield, 
      label: 'Auto Moderation',
      description: 'Spam and raid protection'
    },
    { 
      id: 'joinRoles', 
      icon: UsersRound, 
      label: 'Join Roles',
      description: 'Automatic role assignment'
    },
    { 
      id: 'reactionRoles', 
      icon: Bell, 
      label: 'Reaction Roles',
      description: 'Role selection with reactions'
    },
    { 
      id: 'templates', 
      icon: PlusSquare, 
      label: 'Templates',
      description: 'Server setup templates'
    },
    { 
      id: 'createChannel', 
      icon: PlusSquare, 
      label: 'Create Channel',
      description: 'Quick channel creation'
    },
    { 
      id: 'welcomeMessages', 
      icon: ChartSpline, 
      label: 'Welcome Messages',
      description: 'Custom welcome system'
    },
    { 
      id: 'socialNotifications', 
      icon: Search, 
      label: 'Social Notifications',
      description: 'Social media integration'
    },
  ];

  // Cerrar menú con Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Cerrar al hacer click fuera del menú
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleNavigate = (componentId: string) => {
    onNavigate(componentId);
    onClose();
  };

  return (
    <>
      {/* Overlay de fondo */}
      <div 
        className={`fixed inset-0 z-50 transition-all duration-500 ease-out ${
          isOpen 
            ? 'bg-black/60 backdrop-blur-sm' 
            : 'bg-transparent pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Menú principal */}
      <div 
        ref={menuRef}
        className={`fixed top-0 left-0 w-full h-full z-50 transform transition-all duration-500 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header del menú */}
        <div className={`relative h-full flex flex-col ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
          {/* Header con logo y botón cerrar */}
          <div className={`flex items-center justify-between p-6 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
            <div className="flex items-center gap-3">
              <img
                src="/syro-icon.png"
                alt="Syro Bot Logo"
                className="h-8 w-auto select-none"
                draggable={false}
              />
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent uppercase">
                Syro Bot
              </h1>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-all duration-200 ${
                isDarkMode 
                  ? 'text-gray-400 hover:text-white hover:bg-gray-800' 
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              <X size={24} />
            </button>
          </div>

          {/* Contenido del menú */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-2">
                          {menuItems.map((item, index) => {
              const IconComponent = item.icon;
              const isActive = activeComponent === item.id;
              
              return (
                <div
                  key={item.id}
                  className={`transform transition-all duration-300 ease-out ${
                    isOpen ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
                  }`}
                  style={{ transitionDelay: `${index * 50}ms` }}
                >
                  <button
                    onClick={() => handleNavigate(item.id)}
                    className={`w-full p-4 rounded-2xl transition-all duration-200 group ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25'
                        : isDarkMode 
                          ? 'text-gray-300 hover:text-white hover:bg-gray-800/50'
                          : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl transition-all duration-200 ${
                        isActive
                          ? 'bg-white/20'
                          : isDarkMode 
                            ? 'bg-gray-800/50 group-hover:bg-gray-700/50'
                            : 'bg-gray-100 group-hover:bg-gray-200'
                      }`}>
                        {IconComponent && (
                          <IconComponent 
                            size={20} 
                            strokeWidth={isActive ? 2.5 : 2} 
                          />
                        )}
                      </div>
                        <div className="flex-1 text-left">
                          <div className="font-semibold text-base">{item.label}</div>
                          {item.description && (
                            <div className={`text-sm mt-1 ${
                              isActive 
                                ? 'text-blue-100' 
                                : isDarkMode 
                                  ? 'text-gray-400' 
                                  : 'text-gray-500'
                            }`}>
                              {item.description}
                            </div>
                          )}
                        </div>
                        {isActive && (
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        )}
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer del menú */}
          <div className={`p-6 border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
            <div className={`text-center text-sm ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              <p>Syro Bot Dashboard</p>
              <p className="mt-1">v1.0.0</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MobileMenu; 