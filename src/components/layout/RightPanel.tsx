import React from 'react';
import { Globe, Sun, Moon, LogOut } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { AUTH_BASE_URL } from '../../config/constants';

interface RightPanelProps {
  user: any;
  availableGuilds: any[];
  guildId?: string;
  onGuildChange?: (guildId: string) => void;
}

const RightPanel: React.FC<RightPanelProps> = ({ user, availableGuilds, guildId, onGuildChange }) => {
  const { isDarkMode, toggleTheme } = useTheme();

  // --- Bloque 1: Perfil ---
  const ProfileBlock = () => (
    <div className={`${isDarkMode ? 'bg-black' : 'bg-white'} rounded-2xl shadow-md p-6 flex flex-col items-center justify-center flex-1`}>
      <img
        src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`}
        alt={user.username}
        className="w-28 h-28 rounded-full object-cover border-4 border-blue-400 mb-4 mx-auto"
      />
      <div className={`text-lg font-bold mt-2 text-center ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{user.username}</div>
      <div className={`text-xs text-gray-400 text-center ${isDarkMode ? '' : 'text-gray-600'}`}>ID: {user.id}</div>
    </div>
  );

  // --- Bloque 2: Selector de servidores ---
  const GuildsBlock = () => (
    <div className={`${isDarkMode ? 'bg-black' : 'bg-white'} rounded-2xl shadow-md p-6 flex flex-col items-center flex-1`}>
      <div className={`font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Your Servers</div>
      <div className="w-full flex flex-col gap-2">
        {availableGuilds && availableGuilds.length > 0 ? (
          availableGuilds.map((guild: any) => {
            const selected = guildId === guild.id;
            return (
              <button
                key={guild.id}
                onClick={() => onGuildChange && onGuildChange(guild.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors text-sm font-medium
                  ${selected
                    ? isDarkMode
                      ? 'bg-gradient-to-r from-blue-500/20 to-blue-600/20 border-2 border-blue-500/30 text-blue-200'
                      : 'bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200 text-blue-700'
                    : isDarkMode
                      ? 'hover:bg-gray-800/50 text-gray-300'
                      : 'hover:bg-blue-50 text-gray-700'}
                `}
                style={{ outline: selected ? '2px solid #3b82f6' : 'none' }}
              >
                <span className="truncate text-left">{guild.name}</span>
                <span className="ml-2">{guild.botPresent ? '✅' : '➕'}</span>
              </button>
            );
          })
        ) : (
          <div className="text-gray-400 text-sm text-center py-2">No servers</div>
        )}
      </div>
    </div>
  );

  // --- Bloque 3: Acciones ---
  const ActionsBlock = () => (
    <div className={`${isDarkMode ? 'bg-black' : 'bg-white'} rounded-2xl shadow-md p-6 flex flex-col items-center flex-1 gap-3`}>
      {/* Idioma */}
      <button
        onClick={() => {/* lógica de cambio de idioma aquí */}}
        className={`w-full flex items-center gap-3 text-left px-4 py-3 text-sm rounded-xl transition-colors border-2
          ${isDarkMode
            ? 'bg-gradient-to-r from-blue-500/20 to-blue-600/20 border-blue-500/30 hover:border-blue-400/50 text-blue-200'
            : 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 hover:border-blue-300 text-blue-700'}
        `}
      >
        <Globe size={20} className={isDarkMode ? 'text-blue-300' : 'text-blue-600'} />
        <span className="font-semibold">Change language</span>
      </button>
      {/* Tema */}
      <button
        onClick={toggleTheme}
        className={`w-full flex items-center gap-3 text-left px-4 py-3 text-sm rounded-xl transition-colors border-2
          ${isDarkMode
            ? 'bg-gradient-to-r from-yellow-400/20 to-yellow-500/20 border-yellow-400/30 hover:border-yellow-300/50 text-yellow-200'
            : 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200 hover:border-yellow-300 text-yellow-700'}
        `}
      >
        {isDarkMode
          ? <Sun size={20} className="text-yellow-300" />
          : <Moon size={20} className="text-yellow-500" />}
        <span className="font-semibold">{isDarkMode ? 'Light mode' : 'Dark mode'}</span>
      </button>
      {/* Logout */}
      <button
        onClick={async () => {
          await fetch(`${AUTH_BASE_URL}/logout`, { method: 'POST', credentials: 'include' });
          window.location.reload();
        }}
        className={`w-full flex items-center gap-3 text-left px-4 py-3 text-sm rounded-xl transition-colors border-2
          ${isDarkMode
            ? 'bg-gradient-to-r from-red-500/20 to-red-600/20 border-red-500/30 hover:border-red-400/50 text-red-200'
            : 'bg-gradient-to-r from-red-50 to-red-100 border-red-200 hover:border-red-300 text-red-700'}
        `}
      >
        <LogOut size={20} className={isDarkMode ? 'text-red-300' : 'text-red-600'} />
        <span className="font-semibold">Log out</span>
      </button>
    </div>
  );

  return (
    <div className="flex flex-col h-full gap-4 bg-transparent shadow-none">
      <ProfileBlock />
      <GuildsBlock />
      <ActionsBlock />
    </div>
  );
};

export default RightPanel; 