/**
 * Syro Web Application Root
 *
 * Main entry point for the Syro web dashboard. Defines the global layout, routing, and context providers.
 * Handles authentication, protected routes, and main navigation structure.
 * Refactored for maintainability, accessibility, and professional standards.
 *
 * @author Syro Frontend Team
 * @version 1.1.0
 */

import React, { useEffect, useState, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/layout/Sidebar";
import MobileMenu from "./components/layout/MobileMenu";
import LoadingSpinner from "./components/shared/LoadingSpinner";
import { useTheme } from "./contexts/ThemeContext";
import { TemplateProvider, useTemplates } from "./contexts/TemplateContext";
import { AutoModProvider } from "./contexts/AutoModContext";
import { ModalProvider, useModal } from "./contexts/ModalContext";
import { AnimationProvider } from "./contexts/AnimationContext";
import { AuthProvider, useAuth, getSyroToken } from "./contexts/AuthContext";
import apiManager from "./utils/apiManager";
import { API_CONFIG } from "./config/apiConfig";
import RaidTypeModal from "./features/automoderation/components/RaidTypeModal";
import Dashboard from "./pages/Dashboard";
import AutoModeration from "./pages/AutoModeration";
import JoinRoles from "./pages/JoinRoles";
import ReactionRoles from "./pages/ReactionRoles";
import WelcomeMessages from "./pages/WelcomeMessages";
import SocialNotifications from "./pages/SocialNotifications";
import Login from "./pages/Login";
import CreateChannel from "./pages/CreateChannel";
import Templates from "./pages/Templates";
import RightPanel from "./components/layout/RightPanel";

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
 * Type definition for a Discord guild/server.
 */
export interface Guild {
  id: string;
  name: string;
  icon?: string;
  permissions: string;
  botPresent: boolean;
}

/**
 * Custom hook to manage guilds and user-related state for the dashboard.
 */
function useGuilds(user: User | null) {
  const [guildId, setGuildId] = useState<string>('');
  const [availableGuilds, setAvailableGuilds] = useState<Guild[]>([]);
  const [showBotMissingModal, setShowBotMissingModal] = useState(false);
  const [selectedGuildWithoutBot, setSelectedGuildWithoutBot] = useState<Guild | null>(null);
  const { setUser } = useTemplates();
  const { isDarkMode } = useTheme();

  // Set user in TemplateContext
  useEffect(() => {
    if (user) {
      setUser({
        id: user.id,
        username: user.username,
        avatar: user.avatar || ""
      });
    } else {
      setUser(null);
    }
  }, [user, setUser]);

  // Fetch available guilds for the user
  useEffect(() => {
    if (user) {
      const fetchGuilds = async () => {
        try {
          // Fetch user guilds
          const data = await apiManager.request({
            url: `${API_CONFIG.BASE_URL}/api/me`,
            options: {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getSyroToken()}`
              }
            },
            cacheTTL: API_CONFIG.CACHE.USER_DATA_TTL,
            throttleDelay: API_CONFIG.ENDPOINTS.ME.throttleDelay,
            priority: API_CONFIG.ENDPOINTS.ME.priority
          });

          // Fetch bot guilds - CORREGIDO: usar la ruta correcta
          const botGuildsRes = await fetch(`${API_CONFIG.BASE_URL}/guilds`);
          const botGuildsData = botGuildsRes.ok ? await botGuildsRes.json() : { guilds: [] };
          const botGuildIds = new Set((botGuildsData.guilds || []).map((g: any) => g.id));

          if (data.guilds && data.guilds.length > 0) {
            // Merge: add botPresent property
            const mergedGuilds = data.guilds.map((guild: any) => ({
              ...guild,
              botPresent: botGuildIds.has(guild.id)
            }));
            setAvailableGuilds(mergedGuilds);
            const lastGuildId = localStorage.getItem('lastSelectedGuildId');
            let selectedGuildId = '';
            if (lastGuildId && mergedGuilds.some((g: any) => g.id === lastGuildId)) {
              selectedGuildId = lastGuildId;
            } else if (mergedGuilds.length > 0) {
              selectedGuildId = mergedGuilds[0].id;
            }
            if (selectedGuildId) {
              setGuildId(selectedGuildId);
              localStorage.setItem('lastSelectedGuildId', selectedGuildId);
            } else {
              setGuildId('');
            }
          }
        } catch (error) {
          console.error('Error fetching user guilds:', error);
        }
      };
      fetchGuilds();
    }
  }, [user]);

  // Persist last selected guild
  useEffect(() => {
    if (guildId) {
      localStorage.setItem('lastSelectedGuildId', guildId);
    }
  }, [guildId]);

  // Handler for changing guild, with bot presence verification
  const handleGuildChange = useCallback(async (newGuildId: string) => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/guilds`);
      if (response.ok) {
        const data = await response.json();
        const botGuilds = data.guilds || [];
        const botIsInGuild = botGuilds.some((guild: any) => guild.id === newGuildId);
        if (!botIsInGuild) {
          const selectedGuild = availableGuilds.find((g: Guild) => g.id === newGuildId) || null;
          setSelectedGuildWithoutBot(selectedGuild);
          setShowBotMissingModal(true);
          return;
        }
      }
    } catch (error) {
      console.error('Error verifying bot presence in server:', error);
    }
    setGuildId(newGuildId || '');
  }, [availableGuilds]);

  return {
    guildId,
    setGuildId,
    availableGuilds,
    showBotMissingModal,
    setShowBotMissingModal,
    selectedGuildWithoutBot,
    setSelectedGuildWithoutBot,
    handleGuildChange,
    isDarkMode
  };
}

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
  isDarkMode: boolean;
}> = React.memo(({ isOpen, onClose, selectedGuild, availableGuilds, onSwitchGuild, isDarkMode }) => {
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
    fetch(`${API_CONFIG.BASE_URL}/guilds`)
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
 * Main layout component for the Syro app.
 * Includes sidebar, header, and renders the active page.
 */
const MainLayout: React.FC<{ activeComponent: string; setActiveComponent: (c: string) => void; user: User }> = ({ activeComponent, setActiveComponent, user }) => {
  const {
    guildId,
    availableGuilds,
    showBotMissingModal,
    setShowBotMissingModal,
    selectedGuildWithoutBot,
    handleGuildChange,
    isDarkMode
  } = useGuilds(user);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu when section changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [activeComponent]);

  // Page mapping for cleaner render logic
  const pageMap: Record<string, React.ReactNode> = {
    dashboard: <Dashboard user={user} guildId={guildId || ''} availableGuilds={availableGuilds} onGuildChange={handleGuildChange} />,
    autoModeration: <AutoModeration guildId={guildId || ''} />,
    joinRoles: <JoinRoles guildId={guildId || ''} />,
    reactionRoles: <ReactionRoles guildId={guildId || ''} />,
    templates: <Templates />,
    createChannel: <CreateChannel guildId={guildId || ''} />,
    welcomeMessages: <WelcomeMessages guildId={guildId || ''} />,
    socialNotifications: <SocialNotifications />,
  };

  return (
    <>
      <AutoModProvider guildId={guildId}>
        <div className={`h-screen w-full flex items-start justify-center transition-colors duration-500 ${isDarkMode ? 'bg-[#101010]' : 'bg-[#ffffff]'}`}>
          {/* Sidebar */}
          <div className="hidden md:flex">
            <div className={`my-4 ml-4 h-[calc(100vh-2rem)] flex flex-col justify-between min-w-[280px] bg-transparent shadow-none`}>
              <Sidebar onNavigate={setActiveComponent} activeComponent={activeComponent} />
            </div>
          </div>
          {/* Main content */}
          <main className="flex-1 flex flex-col items-center mx-1 h-full">
            <div className="flex flex-col gap-4 w-full min-w-[65vw] max-w-6xl h-full">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-500 via-blue-600 to-blue-800 rounded-3xl p-8 flex flex-col justify-center items-center shadow-lg min-h-[6rem] mt-4">
                {activeComponent === 'dashboard' && user ? (
                  <div className="text-5xl font-extrabold text-white mb-2 text-center">Welcome, <span className="text-white">{user.username}</span>!</div>
                ) : (
                  <>
                    <h1 className="text-3xl font-extrabold text-white uppercase tracking-wide mb-2">
                      {activeComponent === 'autoModeration' ? 'Auto Moderation' :
                       activeComponent === 'joinRoles' ? 'Join Roles' :
                       activeComponent === 'reactionRoles' ? 'Reaction Roles' :
                       activeComponent === 'templates' ? 'Templates' :
                       activeComponent === 'createChannel' ? 'Create Channel' :
                       activeComponent === 'welcomeMessages' ? 'Welcome Messages' :
                       activeComponent === 'socialNotifications' ? 'Social Notifications' :
                       activeComponent}
                    </h1>
                    <p className="text-blue-100 text-center text-base font-medium">
                      {activeComponent === 'autoModeration' && 'Configure automoderation rules and filters.'}
                      {activeComponent === 'joinRoles' && 'Assign roles automatically to users when they join your server.'}
                      {activeComponent === 'reactionRoles' && 'Manage reaction roles for your community.'}
                      {activeComponent === 'templates' && 'Browse and manage server templates.'}
                      {activeComponent === 'createChannel' && 'Create and organize channels and categories.'}
                      {activeComponent === 'welcomeMessages' && 'Customize welcome and leave messages for your server.'}
                      {activeComponent === 'socialNotifications' && 'Configure social notifications and integrations.'}
                    </p>
                  </>
                )}
              </div>
              {/* Main section */}
              <div className={`rounded-t-3xl p-8 w-full flex flex-col overflow-y-auto flex-1 bg-transparent shadow-none`}>
                {pageMap[activeComponent] || pageMap['dashboard']}
              </div>
            </div>
          </main>
          {/* RightPanel */}
          <div className="hidden md:flex">
            <div className="rounded-3xl shadow-lg my-4 mr-4 h-[calc(100vh-2rem)] flex flex-col justify-between min-w-[320px] max-w-[380px] bg-transparent">
              <RightPanel user={user} availableGuilds={availableGuilds} guildId={guildId} onGuildChange={handleGuildChange} />
            </div>
          </div>
        </div>
        {/* Mobile menu */}
        <MobileMenu
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          onNavigate={setActiveComponent}
          activeComponent={activeComponent}
        />
        {/* Bot missing modal */}
        <BotMissingModal
          isOpen={showBotMissingModal}
          onClose={() => setShowBotMissingModal(false)}
          selectedGuild={selectedGuildWithoutBot}
          availableGuilds={availableGuilds}
          onSwitchGuild={handleGuildChange}
          isDarkMode={isDarkMode}
        />
      </AutoModProvider>
    </>
  );
};

/**
 * Protected route component that requires authentication.
 * Redirects to login if user is not authenticated.
 */
const ProtectedRoute: React.FC<{ children: (user: User) => React.ReactNode }> = ({ children }) => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${useTheme().isDarkMode ? 'bg-black' : 'bg-white'}`}>
        <LoadingSpinner />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/" replace />;
  }

  return <>{children(user)}</>;
};

/**
 * Main App component that sets up routing and global providers.
 * Handles the overall application structure and navigation.
 */
const App: React.FC = () => {
  const [activeComponent, setActiveComponent] = useState('dashboard');

  return (
    <Router>
      <AnimationProvider>
        <AuthProvider>
          <TemplateProvider>
            <ModalProvider>
              <Routes>
                <Route path="/" element={<Login />} />
                <Route
                  path="/*"
                  element={
                    <ProtectedRoute>
                      {(user) => (
                        <MainLayout
                          activeComponent={activeComponent}
                          setActiveComponent={setActiveComponent}
                          user={user}
                        />
                      )}
                    </ProtectedRoute>
                  }
                />
              </Routes>
              <GlobalModals />
            </ModalProvider>
          </TemplateProvider>
        </AuthProvider>
      </AnimationProvider>
    </Router>
  );
};

/**
 * Global modals component that renders modals that need to be available globally.
 * Currently includes the RaidTypeModal for automoderation features.
 */
const GlobalModals: React.FC = () => {
  const { showRaidTypeModal, setShowRaidTypeModal, raidTypeModalProps } = useModal();
  const { isDarkMode } = useTheme();

  if (!raidTypeModalProps) return null;

  return (
    <>
      <RaidTypeModal
        isOpen={showRaidTypeModal}
        onClose={() => setShowRaidTypeModal(false)}
        onSelectType={raidTypeModalProps.onSelectType}
        isDarkMode={isDarkMode}
      />
    </>
  );
};

export default App;
