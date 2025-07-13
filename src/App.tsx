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
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Sidebar from "./components/layout/Sidebar";
import HeaderControls from "./components/layout/HeaderControls";
import { useTheme } from "./contexts/ThemeContext";
import { TemplateProvider, useTemplates } from "./contexts/TemplateContext";
import { AutoModProvider } from "./contexts/AutoModContext";
import { ModalProvider, useModal } from "./contexts/ModalContext";
import { AnimationProvider } from "./contexts/AnimationContext";
import { createLazyComponent } from "./components/shared/LazyComponent";
import APIMonitor from "./components/shared/APIMonitor";
import apiManager from "./utils/apiManager";
import { API_CONFIG } from "./config/apiConfig";

// Lazy load components for better performance
const RaidTypeModal = createLazyComponent(() => import("./features/automoderation/components/RaidTypeModal"));
const Dashboard = createLazyComponent(() => import("./pages/Dashboard"));
const AutoModeration = createLazyComponent(() => import("./pages/AutoModeration"));
const JoinRoles = createLazyComponent(() => import("./pages/JoinRoles"));
const ReactionRoles = createLazyComponent(() => import("./pages/ReactionRoles"));
const WelcomeMessages = createLazyComponent(() => import("./pages/WelcomeMessages"));
const SocialNotifications = createLazyComponent(() => import("./pages/SocialNotifications"));
const Login = createLazyComponent(() => import("./pages/Login"));
const CreateChannel = createLazyComponent(() => import("./pages/CreateChannel"));
const Templates = createLazyComponent(() => import("./pages/Templates"));

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
        <div className="flex h-screen transition-colors duration-500">
          <Sidebar onNavigate={setActiveComponent} activeComponent={activeComponent} />
          <main className="flex-1 h-screen flex flex-col transition-colors duration-500">
            <HeaderControls 
            activeSection={activeComponent} 
            user={user} 
            guildId={guildId}
            onGuildChange={setGuildId}
            availableGuilds={availableGuilds}
          />
            <div className={`rounded-tl-3xl shadow-xl p-8 flex-1 overflow-auto flex flex-col transition-colors duration-500 ${isDarkMode ? 'bg-[#101010]' : 'bg-[#ecf0f9]'}`}>{renderPage()}</div>
          </main>
          <APIMonitor />
        </div>
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
        const data = await apiManager.request({
          url: `${API_CONFIG.BASE_URL}/me`,
          options: {
            credentials: 'include'
          },
          cacheTTL: API_CONFIG.CACHE.USER_DATA_TTL,
          throttleDelay: API_CONFIG.ENDPOINTS.ME.throttleDelay,
          priority: API_CONFIG.ENDPOINTS.ME.priority
        });
        
        setUser(data?.user || null);
        console.log('✅ User data fetched successfully');
      } catch (error) {
        console.error('Error fetching user:', error);
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
 * Protected route component.
 * Only renders children if the user is authenticated.
 *
 * @param children - Render prop that receives the authenticated user
 */
const ProtectedRoute: React.FC<{ children: (user: any) => React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    // Mostrar un loading visible
    return (
      <div className="flex items-center justify-center h-screen">
        <span className="text-xl text-blue-600">Cargando sesión...</span>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }
  return <>{children(user)}</>;
};

/**
 * Root component for the Syro application.
 * Defines main routes and global context.
 */
const App: React.FC = () => {
  const [activeComponent, setActiveComponent] = React.useState("dashboard");
  const { isDarkMode } = useTheme();
  return (
    <div className={(isDarkMode ? "bg-black" : "bg-white") + " transition-colors duration-500"} style={{ minHeight: "100vh" }}>
      <Router>
        <AnimationProvider>
          <TemplateProvider>
            <ModalProvider>
              <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    {(user) => (
                      <MainLayout activeComponent={activeComponent} setActiveComponent={setActiveComponent} user={user} />
                    )}
                  </ProtectedRoute>
                } />
              </Routes>
              <GlobalModals />
            </ModalProvider>
          </TemplateProvider>
        </AnimationProvider>
      </Router>
    </div>
  );
};

const GlobalModals: React.FC = () => {
  const { showRaidTypeModal, setShowRaidTypeModal, raidTypeModalProps } = useModal();
  const { isDarkMode } = useTheme();

  if (!raidTypeModalProps) return null;

  return (
    <RaidTypeModal
      isOpen={showRaidTypeModal}
      onClose={() => setShowRaidTypeModal(false)}
      onSelectType={raidTypeModalProps.onSelectType}
      isDarkMode={isDarkMode}
    />
  );
};

export default App;
