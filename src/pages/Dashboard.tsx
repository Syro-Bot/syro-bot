/**
 * @fileoverview Dashboard Page
 *
 * Main dashboard page for Syro. Displays welcome, join stats chart, and real-time logs.
 * Includes responsive layout and animation. Improved for maintainability and best practices.
 *
 * @author Syro Frontend Team
 * @version 1.1.0
 * @since 2024
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import gsap from "gsap";
import { useTheme } from '../contexts/ThemeContext';
import { useAnimation } from '../contexts/AnimationContext';
import JoinsChart from '../components/dashboard/JoinsChart';
import LiveLogs from '../components/dashboard/LiveLogs';
import GeneralOptions from '../components/dashboard/GeneralOptions';
import AnnouncementWarning from '../components/dashboard/AnnouncementWarning';
import { useLocation } from 'react-router-dom';

/**
 * Type definition for a Discord guild/server.
 */
export interface Guild {
  id: string;
  name: string;
  icon?: string;
  permissions: string;
}

/**
 * Type definition for a Discord user.
 */
export interface User {
  id: string;
  username: string;
  avatar?: string;
  // Add more fields as needed
}

/**
 * ErrorAlert component for displaying error messages in a consistent style.
 */
const ErrorAlert: React.FC<{ message: string }> = React.memo(({ message }) => (
  <div className="rounded-lg bg-red-100 border border-red-400 text-red-700 text-center p-2 mb-4">
    {message}
  </div>
));

/**
 * Modal component for when the bot is missing from a selected guild.
 * Handles inviting the bot or switching to another guild.
 */
const BotMissingModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  selectedGuild?: Guild | null;
  availableGuilds: Guild[];
  onSwitchGuild: (guildId: string) => void;
}> = React.memo(({ isOpen, onClose, selectedGuild, availableGuilds, onSwitchGuild }) => {
  const { isDarkMode } = useTheme();
  if (!isOpen) return null;

  // Handler for inviting the bot to the selected guild
  const handleInviteBot = useCallback(() => {
    if (selectedGuild) {
      const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${process.env.REACT_APP_BOT_CLIENT_ID || ''}&permissions=8&scope=bot%20applications.commands&guild_id=${selectedGuild.id}`;
      window.open(inviteUrl, '_blank');
    }
    onClose();
  }, [selectedGuild, onClose]);

  // Handler for switching to a guild where the bot is present
  const handleSwitchGuild = useCallback(() => {
    onClose();
    fetch('/api/guilds')
      .then(res => res.json())
      .then(data => {
        const botGuilds = data.guilds || [];
        const guildWithBot = availableGuilds.find(guild =>
          botGuilds.some((botGuild: any) => botGuild.id === guild.id)
        );
        if (guildWithBot) {
          onSwitchGuild(guildWithBot.id);
        }
      });
  }, [availableGuilds, onClose, onSwitchGuild]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-label="Bot missing modal">
      <div className={`relative rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border-2 ${
        isDarkMode 
          ? 'bg-gradient-to-br from-[#181c24] via-[#101010] to-[#23272f] border-[#23272f]' 
          : 'bg-gradient-to-br from-white via-orange-50 to-orange-100 border-orange-100'
      }`}>
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold">Bot not found</h3>
              <p className="text-blue-100 text-sm">Server: {selectedGuild?.name || 'Unknown server'}</p>
            </div>
          </div>
        </div>
        {/* Content */}
        <div className="p-6">
          <p className={`text-sm leading-relaxed mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>To configure announcement channels, you need to invite the Syro bot to this server first.</p>
          {/* Action buttons */}
          <div className="space-y-3">
            <button
              onClick={handleInviteBot}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 px-4 rounded-xl font-semibold"
              aria-label="Invite bot to server"
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Invite Bot to Server
              </div>
            </button>
            <button
              onClick={handleSwitchGuild}
              className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-200 border-2 ${isDarkMode
                ? 'border-gray-600 text-gray-300 hover:border-blue-500 hover:text-blue-400'
                : 'border-gray-300 text-gray-600 hover:border-blue-500 hover:text-blue-600'
                }`}
              aria-label="Switch to another server"
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                Switch to another Server
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

/**
 * Helper for responsive grid layout.
 * Returns the appropriate className for the grid based on isMobile.
 */
function getGridClass(isMobile: boolean, base: string, mobile: string) {
  return isMobile ? mobile : base;
}

/**
 * Main Dashboard component.
 * Handles guild selection, error display, and renders main dashboard sections.
 */
const Dashboard: React.FC<{ 
  user: User; 
  guildId?: string;
  availableGuilds?: Guild[];
  onGuildChange?: (guildId: string) => void;
}> = ({ user, guildId, availableGuilds = [], onGuildChange }) => {
  const { isDarkMode } = useTheme();
  const { dashboardAnimationComplete, markDashboardAnimationComplete } = useAnimation();
  const textRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const location = useLocation();
  const [showBotMissingModal, setShowBotMissingModal] = useState(false);
  const [selectedGuildWithoutBot, setSelectedGuildWithoutBot] = useState<Guild | null>(null);

  // Handler for changing guild, with bot presence verification
  const handleGuildChange = useCallback(async (newGuildId: string) => {
    try {
      const response = await fetch(`/api/guilds`);
      if (response.ok) {
        const data = await response.json();
        const botGuilds = data.guilds || [];
        const botIsInGuild = botGuilds.some((guild: any) => guild.id === newGuildId);
        if (!botIsInGuild) {
          const selectedGuild = availableGuilds.find(guild => guild.id === newGuildId) || null;
          setSelectedGuildWithoutBot(selectedGuild);
          setShowBotMissingModal(true);
          return;
        }
      }
    } catch (error) {
      console.error('Error verifying bot presence in server:', error);
    }
    if (onGuildChange) onGuildChange(newGuildId);
  }, [availableGuilds, onGuildChange]);

  // Parse error from URL
  const params = new URLSearchParams(location.search);
  const error = params.get('error');

  // Detect mobile layout
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Show huge SYRO console log with color gradient on /dashboard
  useEffect(() => {
    if (
      window.location.pathname === "/dashboard" ||
      window.location.pathname === "/dashboard/"
    ) {
      console.log(
        "%cS%cY%cR%cO",
        "font-size: 160px; font-weight: bold; color: #00c6ff;",
        "font-size: 160px; font-weight: bold; color: #0099ff;",
        "font-size: 160px; font-weight: bold; color: #0050c8;",
        "font-size: 160px; font-weight: bold; color: #003366;"
      );
    }
  }, []);

  // Animate dashboard welcome text on mount
  useEffect(() => {
    document.title = "Syro - Dashboard";
    if (textRef.current) {
      if (!dashboardAnimationComplete) {
        if (isMobile) {
          gsap.set(textRef.current, { 
            opacity: 0, 
            y: -50,
            position: 'relative',
            left: 'auto',
            top: 'auto',
            scale: 1
          });
          gsap.to(textRef.current, { 
            opacity: 1, 
            y: 0, 
            duration: 0.6, 
            ease: "power2.out",
            onComplete: () => {
              markDashboardAnimationComplete();
            }
          });
        } else {
          gsap.set(textRef.current, { 
            opacity: 0, 
            scale: 0.8, 
            xPercent: -50, 
            yPercent: -50, 
            left: '55%', 
            top: '50%', 
            position: 'fixed' 
          });
          gsap.to(textRef.current, { 
            opacity: 1, 
            scale: 1, 
            duration: 0.5, 
            ease: "power2.out" 
          });
          gsap.to(textRef.current, {
            delay: 0.8,
            duration: 0.7,
            left: '6rem',
            top: '6rem',
            xPercent: 0,
            yPercent: 0,
            scale: 0.4,
            ease: "power3.inOut",
            onComplete: () => {
              markDashboardAnimationComplete();
            }
          });
        }
      } else {
        // If animation already completed, set final state
        if (isMobile) {
          gsap.set(textRef.current, { 
            opacity: 1, 
            y: 0,
            position: 'relative',
            left: 'auto',
            top: 'auto',
            scale: 1
          });
        } else {
          gsap.set(textRef.current, { 
            opacity: 1, 
            scale: 0.4, 
            left: '6rem', 
            top: '6rem', 
            xPercent: 0, 
            yPercent: 0, 
            position: 'fixed' 
          });
        }
      }
    }
  }, [user, dashboardAnimationComplete, markDashboardAnimationComplete, isMobile]);

  return (
    <div className="relative min-h-screen w-full">
      {/* Error message for login/OAuth2 issues */}
      {error && (
        <ErrorAlert message={
          error === 'oauth_rate_limit' ? 'Discord is rate limiting logins. Please wait a few minutes and try again.' :
          error === 'oauth_failed' ? 'There was a problem with Discord login. Please try again.' :
          error === 'session_save' ? 'Error saving session. Please try again.' :
          error === 'no_code' ? 'No code received from Discord. Please try again.' :
          'Unknown error: ' + error
        } />
      )}
      {/* Main content grid */}
      <div className={getGridClass(isMobile, '', '')}>
        <div className={getGridClass(isMobile, 'grid grid-cols-2 gap-6', 'space-y-6')}>
          {/* Statistics chart */}
          <div className="w-full h-[23rem]">
            <JoinsChart guildId={guildId} />
          </div>
          {/* Real-time logs panel */}
          <div className="w-full h-[23rem]">
            <LiveLogs guildId={guildId} />
          </div>
        </div>
        {/* Second row - General options and placeholder */}
        <div className={getGridClass(isMobile, 'mt-6 grid grid-cols-2 gap-6', 'mt-6 space-y-6')}>
          {/* General options */}
          <div className="w-full h-[23rem]">
            <GeneralOptions guildId={guildId} />
          </div>
          {/* Placeholder for future features */}
          <div className={`w-full h-[23rem] rounded-2xl border-2 border-dashed transition-colors ${
            isDarkMode 
              ? 'border-gray-700' 
              : 'border-gray-300'
          }`}>
            <div className="flex items-center justify-center h-full">
              <div className={`text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}> 
                <div className="text-4xl mb-2" aria-hidden="true">📦</div>
                <p className="text-sm font-medium">New feature</p>
                <p className="text-xs mt-1">Coming soon</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Announcement warning and bot missing modal */}
      <AnnouncementWarning 
        guildId={guildId} 
        user={user} 
        availableGuilds={availableGuilds}
        onGuildChange={handleGuildChange}
      />
      <BotMissingModal
        isOpen={showBotMissingModal}
        onClose={() => setShowBotMissingModal(false)}
        selectedGuild={selectedGuildWithoutBot}
        availableGuilds={availableGuilds}
        onSwitchGuild={onGuildChange || (() => {})}
      />
    </div>
  );
};

export default Dashboard; 