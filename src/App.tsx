/**
 * Syro Web Application Root
 *
 * Main entry point for the Syro web dashboard. Defines the global layout, routing, and context providers.
 * Handles authentication, protected routes, and main navigation structure.
 * Optimized with lazy loading for better performance.
 *
 * @author Syro Frontend Team
 * @version 1.0.0
 */

import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/layout/Sidebar";
import MobileMenu from "./components/layout/MobileMenu";
import LoadingSpinner from "./components/shared/LoadingSpinner";
import { useTheme } from "./contexts/ThemeContext";
import { TemplateProvider, useTemplates } from "./contexts/TemplateContext";
import { AutoModProvider } from "./contexts/AutoModContext";
import { ModalProvider, useModal } from "./contexts/ModalContext";
import { AnimationProvider } from "./contexts/AnimationContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import apiManager from "./utils/apiManager";
import { API_CONFIG } from "./config/apiConfig";

// Import components directly instead of lazy loading
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

// Componente wrapper para pasar el usuario al TemplateContext
const UserTemplateProvider: React.FC<{ children: React.ReactNode; user: any }> = ({ children, user }) => {
  const { setUser } = useTemplates();
  
  React.useEffect(() => {
    if (user) {
      setUser({
        id: user.id,
        username: user.username,
        avatar: user.avatar
      });
    } else {
      setUser(null);
    }
  }, [user, setUser]);
  
  return <>{children}</>;
};

/**
 * Main layout component for the Syro app.
 * Includes sidebar, header, and renders the active page.
 *
 * @param activeComponent - The current active page/component
 * @param setActiveComponent - Setter to change the active page
 * @param user - The currently authenticated user
 */
const MainLayout: React.FC<{ activeComponent: string; setActiveComponent: (c: string) => void; user: any }> = ({ activeComponent, setActiveComponent, user }) => {
  const { isDarkMode } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [guildId, setGuildId] = React.useState<string | undefined>();
  const [availableGuilds, setAvailableGuilds] = React.useState<any[]>([]);
  const [showBotMissingModal, setShowBotMissingModal] = React.useState(false);
  const [selectedGuildWithoutBot, setSelectedGuildWithoutBot] = React.useState<any>(null);

  // Handler global para cambio de guild
  const handleGuildChange = async (newGuildId: string) => {
    try {
      const response = await fetch(`/api/guilds`);
      if (response.ok) {
        const data = await response.json();
        const botGuilds = data.guilds || [];
        const botIsInGuild = botGuilds.some((guild: any) => guild.id === newGuildId);
        if (!botIsInGuild) {
          const selectedGuild = availableGuilds.find((g: any) => g.id === newGuildId) || null;
          setSelectedGuildWithoutBot(selectedGuild);
          setShowBotMissingModal(true);
          return;
        }
      }
    } catch (error) {
      console.error('Error verificando si el bot está en el servidor:', error);
    }
    setGuildId(newGuildId);
  };
  
  // Obtener el guildId del primer servidor disponible (temporal)
  React.useEffect(() => {
    // Obtener los servidores donde el usuario tiene permisos usando el API manager optimizado
    if (user) {
      const fetchGuilds = async () => {
        try {
          const data = await apiManager.request({
            url: `${API_CONFIG.BASE_URL}/api/me`,
            options: {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('syro-jwt-token')}`
              }
            },
            cacheTTL: API_CONFIG.CACHE.USER_DATA_TTL,
            throttleDelay: API_CONFIG.ENDPOINTS.ME.throttleDelay,
            priority: API_CONFIG.ENDPOINTS.ME.priority
          });

          console.log('🏠 Servidores del usuario:', data);
          if (data.guilds && data.guilds.length > 0) {
            setAvailableGuilds(data.guilds);
            // Recordar último guild seleccionado
            const lastGuildId = localStorage.getItem('lastSelectedGuildId');
            let selectedGuildId = undefined;
            if (lastGuildId && data.guilds.some((g: any) => g.id === lastGuildId)) {
              selectedGuildId = lastGuildId;
            } else if (data.guilds.length > 0) {
              selectedGuildId = data.guilds[0].id;
            }
            if (selectedGuildId) {
              setGuildId(selectedGuildId);
              localStorage.setItem('lastSelectedGuildId', selectedGuildId);
              console.log('✅ GuildId seleccionado:', selectedGuildId);
            } else {
              console.log('❌ No hay servidores disponibles');
            }
          } else {
            console.log('❌ No hay servidores disponibles');
          }
        } catch (error) {
          console.error('Error obteniendo guilds del usuario:', error);
        }
      };

      fetchGuilds();
    }
  }, [user]);

  // Guardar el último guild seleccionado cuando cambie
  React.useEffect(() => {
    if (guildId) {
      localStorage.setItem('lastSelectedGuildId', guildId);
    }
  }, [guildId]);

  // Cerrar menú móvil cuando cambie la sección
  React.useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [activeComponent]);

  const renderPage = () => {
    switch (activeComponent) {
      case "dashboard":
        return <Dashboard 
          user={user} 
          guildId={guildId} 
          availableGuilds={availableGuilds}
          onGuildChange={handleGuildChange}
        />;
      case "autoModeration":
        return <AutoModeration />;
      case "joinRoles":
        return <JoinRoles guildId={guildId} />;
      case "reactionRoles":
        return <ReactionRoles guildId={guildId} />;
      case "templates":
        return <Templates />;
      case "createChannel":
        return <CreateChannel guildId={guildId} />;
      case "welcomeMessages":
        return <WelcomeMessages guildId={guildId} />;
      case "socialNotifications":
        return <SocialNotifications />;
      default:
        return <Dashboard 
          user={user} 
          guildId={guildId} 
          availableGuilds={availableGuilds}
          onGuildChange={handleGuildChange}
        />;
    }
  };
  
  return (
    <UserTemplateProvider user={user}>
      <AutoModProvider guildId={guildId}>
        <div className={`h-screen w-full flex items-start justify-center transition-colors duration-500 ${isDarkMode ? 'bg-[#101010]' : 'bg-[#ffffff]'}`}>
          {/* Sidebar flotante */}
          <div className="hidden md:flex">
            <div className={`my-4 ml-4 h-[calc(100vh-2rem)] flex flex-col justify-between min-w-[280px] bg-transparent shadow-none`}>
              <Sidebar onNavigate={setActiveComponent} activeComponent={activeComponent} />
            </div>
          </div>
          {/* Contenido principal flotante */}
          <main className="flex-1 flex flex-col items-center mx-1 h-full">
            <div className="flex flex-col gap-4 w-full min-w-[65vw] max-w-6xl h-full">
              {/* Panel superior */}
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
              {/* Contenido principal */}
              <div className={`rounded-t-3xl p-8 w-full flex flex-col overflow-y-auto flex-1 bg-transparent shadow-none`}>
                {renderPage()}
              </div>
            </div>
          </main>
          {/* RightPanel flotante */}
          <div className="hidden md:flex">
            <div className="rounded-3xl shadow-lg my-4 mr-4 h-[calc(100vh-2rem)] flex flex-col justify-between min-w-[320px] max-w-[380px] bg-transparent">
              <RightPanel user={user} availableGuilds={availableGuilds} guildId={guildId} onGuildChange={handleGuildChange} />
            </div>
          </div>
        </div>
        {/* Menú móvil */}
        <MobileMenu
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          onNavigate={setActiveComponent}
          activeComponent={activeComponent}
        />
        {/* Modal global de bot faltante */}
        {showBotMissingModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`relative rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border-2 ${
              isDarkMode 
                ? 'bg-gradient-to-br from-[#181c24] via-[#101010] to-[#23272f] border-[#23272f]' 
                : 'bg-gradient-to-br from-white via-orange-50 to-orange-100 border-orange-100'
            }`}>
              {/* Header con gradiente */}
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Bot no encontrado</h3>
                    <p className="text-blue-100 text-sm">Servidor: {selectedGuildWithoutBot?.name || 'Servidor desconocido'}</p>
                  </div>
                </div>
              </div>
              {/* Contenido */}
              <div className="p-6">
                <p className={`text-sm leading-relaxed mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  El bot de Syro no está presente en este servidor. Para configurar el canal de anuncios, necesitas invitar el bot primero.
                </p>
                {/* Botones */}
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      if (selectedGuildWithoutBot) {
                        const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${process.env.REACT_APP_BOT_CLIENT_ID || ''}&permissions=8&scope=bot%20applications.commands&guild_id=${selectedGuildWithoutBot.id}`;
                        window.open(inviteUrl, '_blank');
                      }
                      setShowBotMissingModal(false);
                    }}
                    className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 px-4 rounded-xl font-semibold"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Invitar Bot al Servidor
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setShowBotMissingModal(false);
                      // Buscar un servidor donde sí esté el bot
                      fetch('/api/guilds')
                        .then(res => res.json())
                        .then(data => {
                          const botGuilds = data.guilds || [];
                          const guildWithBot = availableGuilds.find((guild: any) =>
                            botGuilds.some((botGuild: any) => botGuild.id === guild.id)
                          );
                          if (guildWithBot) {
                            setGuildId(guildWithBot.id);
                          }
                        });
                    }}
                    className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-200 border-2 ${isDarkMode
                      ? 'border-gray-600 text-gray-300 hover:border-blue-500 hover:text-blue-400'
                      : 'border-gray-300 text-gray-600 hover:border-blue-500 hover:text-blue-600'
                      }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                      Cambiar a otro Servidor
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AutoModProvider>
    </UserTemplateProvider>
  );
};

/**
 * Protected route component that requires authentication.
 * Redirects to login if user is not authenticated.
 *
 * @component
 * @param {Object} props - Component props
 * @param {Function} props.children - Function that receives the authenticated user
 */
const ProtectedRoute: React.FC<{ children: (user: any) => React.ReactNode }> = ({ children }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const { isDarkMode } = useTheme();

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${isDarkMode ? 'bg-black' : 'bg-white'}`}>
        <LoadingSpinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children(user)}</>;
};

/**
 * Main App component that sets up routing and global providers.
 * Handles the overall application structure and navigation.
 *
 * @component
 */
const App: React.FC = () => {
  const [activeComponent, setActiveComponent] = React.useState('dashboard');
  const { isDarkMode } = useTheme();

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
 *
 * @component
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
