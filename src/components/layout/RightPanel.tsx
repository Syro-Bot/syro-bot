import React from 'react';
import { Globe, Sun, Moon, LogOut, CheckCircle2, PlusCircle } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { AUTH_BASE_URL } from '../../config/constants';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Type definition for a Discord user (minimal for profile context)
 */
interface User {
  id: string;
  username: string;
  avatar?: string;
}

/**
 * Type definition for a Discord guild/server (with bot presence)
 */
interface Guild {
  id: string;
  name: string;
  icon?: string;
  botPresent: boolean;
}

interface RightPanelProps {
  user: User;
  availableGuilds: Guild[];
  guildId?: string;
  onGuildChange?: (guildId: string) => void;
}

/**
 * RightPanel component for the Syro dashboard.
 * Shows user profile, server selector, and quick actions (theme, language, logout).
 */
const RightPanel: React.FC<RightPanelProps> = ({ user, availableGuilds, guildId, onGuildChange }) => {
  const { isDarkMode, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const [logoutLoading, setLogoutLoading] = React.useState(false);

  /**
   * Profile block: shows user avatar and info
   */
  const ProfileBlock = () => (
    <div className={`${isDarkMode ? 'bg-black' : 'bg-white'} rounded-2xl shadow-md p-6 flex flex-col items-center justify-center flex-1`}>
      <img
        src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`}
        alt={`Avatar of ${user.username}`}
        className="w-28 h-28 rounded-full object-cover border-4 border-blue-400 mb-4 mx-auto"
        aria-label="User avatar"
      />
      <div className={`text-lg font-bold mt-2 text-center ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{user.username}</div>
      <div className={`text-xs text-gray-400 text-center ${isDarkMode ? '' : 'text-gray-600'}`}>ID: {user.id}</div>
    </div>
  );

  /**
   * Guilds block: shows list of available servers, sorted by bot presence
   */
  const GuildsBlock = () => (
    <div className={`${isDarkMode ? 'bg-black' : 'bg-white'} rounded-2xl shadow-md p-6 flex flex-col items-center flex-1`}>
      <div className={`font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Your Servers</div>
      <div className="w-full flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
        {availableGuilds && availableGuilds.length > 0 ? (
          // Sort: bot-present first
          [...availableGuilds].sort((a, b) => {
            if (a.botPresent === b.botPresent) return 0;
            return a.botPresent ? -1 : 1;
          }).map((guild) => {
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
                style={selected ? undefined : { outline: 'none' }}
                aria-label={`Select server ${guild.name}`}
              >
                <span className="truncate text-left">{guild.name}</span>
                <span className="ml-2">
                  {guild.botPresent ? (
                    <div className={`flex-shrink-0 w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center shadow-md
                      ${isDarkMode ? 'bg-gradient-to-r from-green-500/20 to-green-600/20' : 'bg-gradient-to-r from-green-50 to-green-100'}`}
                      aria-label="Bot present"
                    >
                      <CheckCircle2 className={`w-5 h-5 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
                    </div>
                  ) : (
                    <div className={`flex-shrink-0 w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center shadow-md
                      ${isDarkMode ? 'bg-gradient-to-r from-orange-500/20 to-orange-600/20' : 'bg-gradient-to-r from-orange-50 to-orange-100'}`}
                      aria-label="Bot not present"
                    >
                      <PlusCircle className={`w-5 h-5 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`} />
                    </div>
                  )}
                </span>
              </button>
            );
          })
        ) : (
          <div className="text-gray-400 text-sm text-center py-2">No servers</div>
        )}
      </div>
    </div>
  );

  /**
   * Actions block: theme, language, logout
   */
  const ActionsBlock = () => (
    <div className={`${isDarkMode ? 'bg-black' : 'bg-white'} rounded-2xl shadow-md p-6 flex flex-col items-center flex-1 gap-3`}>
      {/* Language (placeholder) */}
      <button
        onClick={() => {/* TODO: implement language change */}}
        className={`w-full flex items-center gap-3 text-left px-4 py-3 text-sm rounded-xl transition-colors border-2
          ${isDarkMode
            ? 'bg-gradient-to-r from-blue-500/20 to-blue-600/20 border-blue-500/30 hover:border-blue-400/50 text-blue-200'
            : 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 hover:border-blue-300 text-blue-700'}
        `}
        aria-label="Change language"
      >
        <Globe size={20} className={isDarkMode ? 'text-blue-300' : 'text-blue-600'} />
        <span className="font-semibold">Change language</span>
      </button>
      {/* Theme */}
      <button
        onClick={toggleTheme}
        className={`w-full flex items-center gap-3 text-left px-4 py-3 text-sm rounded-xl transition-colors border-2
          ${isDarkMode
            ? 'bg-gradient-to-r from-yellow-400/20 to-yellow-500/20 border-yellow-400/30 hover:border-yellow-300/50 text-yellow-200'
            : 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200 hover:border-yellow-300 text-yellow-700'}
        `}
        aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDarkMode
          ? <Sun size={20} className="text-yellow-300" />
          : <Moon size={20} className="text-yellow-500" />}
        <span className="font-semibold">{isDarkMode ? 'Light mode' : 'Dark mode'}</span>
      </button>
      {/* Logout */}
      <button
        onClick={async () => {
          setLogoutLoading(true);
          await fetch(`${AUTH_BASE_URL}/logout`, { method: 'POST', credentials: 'include' });
          await logout();
          setLogoutLoading(false);
        }}
        className={`w-full flex items-center gap-3 text-left px-4 py-3 text-sm rounded-xl transition-colors border-2
          ${isDarkMode
            ? 'bg-gradient-to-r from-red-500/20 to-red-600/20 border-red-500/30 hover:border-red-400/50 text-red-200'
            : 'bg-gradient-to-r from-red-50 to-red-100 border-red-200 hover:border-red-300 text-red-700'}
        `}
        aria-label="Log out"
        disabled={logoutLoading}
      >
        <LogOut size={20} className={isDarkMode ? 'text-red-300' : 'text-red-600'} />
        <span className="font-semibold">{logoutLoading ? 'Logging out...' : 'Log out'}</span>
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