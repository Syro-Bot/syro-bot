/**
 * @fileoverview Sidebar Navigation Component
 * 
 * This component provides the main navigation sidebar for the application.
 * It displays navigation items with icons, handles active state management,
 * and supports theme switching between dark and light modes.
 * 
 * @author System Development Team
 * @version 1.0.0
 * @since 2024
 */

import React from 'react';
import {  LayoutDashboard,  ChartSpline,  UsersRound,  Shield, Bell, Search, PlusSquare } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface SidebarProps {
  onNavigate: (component: string) => void;
  activeComponent: string;
}

interface MenuItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ size?: number; strokeWidth?: number }>;
}

const Sidebar: React.FC<SidebarProps> = ({ onNavigate, activeComponent }) => {
  const { isDarkMode } = useTheme();
  
  // Debug: verificar si el tema está cambiando
  console.log('🎨 Sidebar - isDarkMode:', isDarkMode);

  const menuItems: MenuItem[] = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'autoModeration', icon: Shield, label: 'Auto Moderation' },
    { id: 'joinRoles', icon: UsersRound, label: 'Join Roles' },
    { id: 'reactionRoles', icon: Bell, label: 'Reaction Roles' },
    { id: 'templates', icon: PlusSquare, label: 'Templates' }, // Nuevo item arriba
    { id: 'createChannel', icon: PlusSquare, label: 'Create Channel' }, // Mover abajo y traducir
    { id: 'welcomeMessages', icon: ChartSpline, label: 'Welcome Messages' },
    { id: 'socialNotifications', icon: Search, label: 'Social Notifications' },
  ];

  return (
    <div className={`w-64 h-screen flex flex-col items-start justify-start space-y-3 px-[1rem] pt-[1.5rem]`}>
      <div className="w-full mb-[0.5rem] flex items-center gap-3">
        <img
          src={isDarkMode ? "/syro-icon.png" : "/syro-icon.png"}
          alt="Syro Bot Logo"
          className="h-10 w-auto select-none"
          draggable={false}
        />
        <h1 className={`text-2xl font-bold uppercase ${isDarkMode ? 'text-white' : 'text-gray-800'}` }>
          Syro Bot
        </h1>
      </div>
      {/* Primer bloque: hasta 'Templates' */}
      {menuItems.slice(0, 5).map((item) => {
        if (item.icon) {
          const IconComponent = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`relative w-full h-12 rounded-xl flex items-center gap-2 px-[1rem] cursor-pointer transition-colors duration-200 ${
                activeComponent === item.id
                  ? 'bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 text-white'
                  : isDarkMode 
                    ? 'text-gray-400 hover:text-white'
                    : 'text-gray-600 hover:text-gray-800'
              } bg-transparent shadow-none`}
              title={item.label}
            >
              <IconComponent size={20} strokeWidth={2.75} />
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          );
        }
        return null;
      })}
      <div className={`w-full h-px my-[1rem] ${
        isDarkMode ? 'bg-gray-700' : 'bg-gray-300'
      }`}></div>
      {/* Segundo bloque: desde 'Create Channel' en adelante */}
      {menuItems.slice(5).map((item) => {
        if (item.icon) {
          const IconComponent = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`relative w-full h-12 rounded-xl flex items-center gap-4 px-[1rem] cursor-pointer transition-colors duration-200  ${
                activeComponent === item.id
                  ? 'bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 text-white'
                  : isDarkMode 
                    ? 'text-gray-400 hover:text-white'
                    : 'text-gray-600 hover:text-gray-800'
              } bg-transparent shadow-none`}
              title={item.label}
            >
              <IconComponent size={20} strokeWidth={2.75} />
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          );
        }
        return null;
      })}
    </div>
  );
};

export default Sidebar; 