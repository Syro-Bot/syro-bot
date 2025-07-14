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
import HeaderControls from "./components/layout/HeaderControls";
import MobileMenu from "./components/layout/MobileMenu";
import LoadingSpinner from "./components/shared/LoadingSpinner";
import { useTheme } from "./contexts/ThemeContext";
import { TemplateProvider, useTemplates } from "./contexts/TemplateContext";
import { AutoModProvider } from "./contexts/AutoModContext";
import { ModalProvider, useModal } from "./contexts/ModalContext";
import { AnimationProvider } from "./contexts/AnimationContext";
import APIMonitor from "./components/shared/APIMonitor";
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
  
  // Obtener el guildId del primer servidor disponible (temporal)
  const [guildId, setGuildId] = React.useState<string | undefined>();
  const [availableGuilds, setAvailableGuilds] = React.useState<any[]>([]);
  
  React.useEffect(() => {
    // Obtener los servidores donde el usuario tiene permisos usando el API manager optimizado
    if (user) {
      const fetchGuilds = async () => {
        try {
          const data = await apiManager.request({
            url: `${API_CONFIG.BASE_URL}/me`,
            options: {
              credentials: 'include'
            },
            cacheTTL: API_CONFIG.CACHE.USER_DATA_TTL,
            throttleDelay: API_CONFIG.ENDPOINTS.ME.throttleDelay,
            priority: API_CONFIG.ENDPOINTS.ME.priority
          });

          console.log('🏠 Servidores del usuario:', data);
          if (data.guilds && data.guilds.length > 0) {
            // Filtrar solo servidores donde el usuario es admin o tiene permisos de administrador
            const adminGuilds = data.guilds.filter((guild: any) => 
              guild.permissions && (parseInt(guild.permissions) & 0x8) === 0x8 // ADMINISTRATOR permission
            );
            
            console.log('👑 Servidores con permisos de admin:', adminGuilds);
            setAvailableGuilds(adminGuilds);
            
            // Recordar último guild seleccionado
            const lastGuildId = localStorage.getItem('lastSelectedGuildId');
            let selectedGuildId = undefined;
            if (lastGuildId && adminGuilds.some((g: any) => g.id === lastGuildId)) {
              selectedGuildId = lastGuildId;
            } else if (adminGuilds.length > 0) {
              selectedGuildId = adminGuilds[0].id;
            }
            if (selectedGuildId) {
              setGuildId(selectedGuildId);
              localStorage.setItem('lastSelectedGuildId', selectedGuildId);
              console.log('✅ GuildId seleccionado:', selectedGuildId);
            } else {
              console.log('❌ No hay servidores con permisos de administrador');
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

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const renderPage = () => {
    switch (activeComponent) {
      case "dashboard":
        return <Dashboard 
          user={user} 
          guildId={guildId} 
          availableGuilds={availableGuilds}
          onGuildChange={setGuildId}
        />;
      case "autoModeration":
        return <AutoModeration />;
      case "joinRoles":
        return <JoinRoles guildId={guildId} />;
      case "reactionRoles":
        return <ReactionRoles />;
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
          onGuildChange={setGuildId}
        />;
    }
  };
  
  return (
    <UserTemplateProvider user={user}>
      <AutoModProvider guildId={guildId}>
        <div className={`flex h-screen transition-colors duration-500 ${isDarkMode ? 'bg-black' : 'bg-white'}`}>
          {/* Sidebar - Oculto en móvil */}
          <div className="hidden md:block" key={`sidebar-${isDarkMode}`}>
            <Sidebar onNavigate={setActiveComponent} activeComponent={activeComponent} />
          </div>
          
          {/* Contenido principal */}
          <main className="flex-1 h-screen flex flex-col transition-colors duration-500">
            <HeaderControls 
              key={`header-${isDarkMode}`}
              activeSection={activeComponent} 
              user={user} 
              guildId={guildId}
              onGuildChange={setGuildId}
              availableGuilds={availableGuilds}
              onMobileMenuToggle={handleMobileMenuToggle}
              isMobileMenuOpen={isMobileMenuOpen}
            />
            <div className={`rounded-tl-3xl md:rounded-tl-3xl shadow-xl p-4 md:p-8 flex-1 overflow-auto flex flex-col transition-colors duration-500 ${isDarkMode ? 'bg-[#101010]' : 'bg-[#ecf0f9]'}`}>
              {renderPage()}
            </div>
          </main>
          
          {/* API Monitor - Solo en desarrollo */}
          {(import.meta.env.DEV || import.meta.env.VITE_SHOW_API_MONITOR === 'true') && <APIMonitor />}
        </div>

        {/* Menú móvil */}
        <MobileMenu
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          onNavigate={setActiveComponent}
          activeComponent={activeComponent}
        />
      </AutoModProvider>
    </UserTemplateProvider>
  );
};

/**
 * Authentication hook to get the current user and loading state.
 * Handles session logic, rate limiting, and login redirection.
 *
 * @returns {{ user: any, loading: boolean }}
 */
const useAuth = () => {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  
  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        // Usar fetch directo para debuggear
        const response = await fetch(`${API_CONFIG.BASE_URL}/me`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        console.log('🔍 Status de respuesta:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('🔍 Respuesta de autenticación:', data);
          
          if (data && data.user) {
            setUser(data.user);
            console.log('✅ Usuario autenticado:', data.user.username);
          } else {
            console.log('❌ Usuario no autenticado - Data recibida:', data);
            setUser(null);
          }
        } else {
          console.log('❌ Error de respuesta:', response.status, response.statusText);
          setUser(null);
        }
      } catch (error) {
        console.error('❌ Error de autenticación:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  return { user, loading };
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
  const { user, loading } = useAuth();
  const { isDarkMode } = useTheme();

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${isDarkMode ? 'bg-black' : 'bg-white'}`}>
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
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

  return (
    <Router>
      <AnimationProvider>
        <TemplateProvider>
          <ModalProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
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
