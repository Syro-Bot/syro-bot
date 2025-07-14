import React, { useState, useEffect, useMemo } from "react";
import { Users, User, Bot } from "lucide-react";
import RoleSelectorButton from "./RoleSelectorButton";
import { useTheme } from "../../contexts/ThemeContext";

interface JoinRolesSetupProps {
  guildId?: string;
}

interface Role {
  id: string;
  name: string;
  color: string;
}

interface RoleType {
  type: string;
  title: string;
  description: string;
  icon: React.ElementType;
  gradient: string;
}

const ROLE_TYPES: RoleType[] = [
  {
    type: "general",
    title: "General",
    description: "Roles for all users",
    icon: Users,
    gradient: "from-blue-500 to-blue-600"
  },
  {
    type: "user",
    title: "User",
    description: "Roles for human users",
    icon: User,
    gradient: "from-green-500 to-green-600"
  },
  {
    type: "bot",
    title: "Bot",
    description: "Roles for bot accounts",
    icon: Bot,
    gradient: "from-purple-500 to-purple-600"
  }
];

// Cache para almacenar configuraciones de join roles
const joinRolesCache = new Map<string, any>();

const JoinRolesSetup: React.FC<JoinRolesSetupProps> = ({ guildId }) => {
  const { isDarkMode } = useTheme();
  const [selectedRoles, setSelectedRoles] = useState<RoleType[]>([]);
  const [assignedGeneralRoles, setAssignedGeneralRoles] = useState<Role[]>([]);
  const [assignedUserRoles, setAssignedUserRoles] = useState<Role[]>([]);
  const [assignedBotRoles, setAssignedBotRoles] = useState<Role[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [hasUserChanges, setHasUserChanges] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Cargar datos desde caché si están disponibles
  const loadFromCache = useMemo(() => {
    if (guildId && joinRolesCache.has(guildId)) {
      const cachedData = joinRolesCache.get(guildId);
      return cachedData;
    }
    return null;
  }, [guildId]);

  useEffect(() => {
    if (guildId) {
      // Si tenemos datos en caché, usarlos inmediatamente
      if (loadFromCache) {
        const cachedData = loadFromCache;
        setAssignedGeneralRoles(cachedData.general || []);
        setAssignedUserRoles(cachedData.user || []);
        setAssignedBotRoles(cachedData.bot || []);

        // Auto-load role type cards if there are saved roles
        const hasGeneralRoles = (cachedData.general || []).length > 0;
        const hasUserRoles = (cachedData.user || []).length > 0;
        const hasBotRoles = (cachedData.bot || []).length > 0;

        const typesToLoad: string[] = [];
        if (hasGeneralRoles) typesToLoad.push('general');
        if (hasUserRoles) typesToLoad.push('user');
        if (hasBotRoles) typesToLoad.push('bot');

        const roleTypesToAdd = ROLE_TYPES.filter(role => typesToLoad.includes(role.type));
        setSelectedRoles(roleTypesToAdd);

        setIsInitialLoad(false);
        setLoadError(null);
        console.log('✅ Loaded from cache:', cachedData);
      } else {
        // Si no hay caché, cargar desde el servidor
        loadJoinRolesConfig();
      }
    }
  }, [guildId, loadFromCache]);

  const loadJoinRolesConfig = async () => {
    try {
      setIsLoading(true);
      setIsInitialLoad(true);
      setHasUserChanges(false);
      setLoadError(null);

      const response = await fetch(`/api/join-roles/${guildId}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseText = await response.text();
      console.log('🔍 Raw response:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        console.error('❌ Response was not valid JSON:', responseText);
        setLoadError('Invalid response from server');
        return;
      }

      if (data.success) {
        const joinRoles = data.joinRoles || { general: [], user: [], bot: [] };

        // Guardar en caché
        if (guildId) {
          joinRolesCache.set(guildId, joinRoles);
        }

        setAssignedGeneralRoles(joinRoles.general || []);
        setAssignedUserRoles(joinRoles.user || []);
        setAssignedBotRoles(joinRoles.bot || []);

        // Auto-load role type cards if there are saved roles
        const hasGeneralRoles = (joinRoles.general || []).length > 0;
        const hasUserRoles = (joinRoles.user || []).length > 0;
        const hasBotRoles = (joinRoles.bot || []).length > 0;

        const typesToLoad: string[] = [];
        if (hasGeneralRoles) typesToLoad.push('general');
        if (hasUserRoles) typesToLoad.push('user');
        if (hasBotRoles) typesToLoad.push('bot');

        const roleTypesToAdd = ROLE_TYPES.filter(role => typesToLoad.includes(role.type));
        setSelectedRoles(roleTypesToAdd);

        console.log('✅ Join roles config loaded:', joinRoles);
        console.log('📋 Auto-loaded role type cards:', roleTypesToAdd.map(r => r.type));
      } else {
        console.error('❌ Error loading join roles config:', data.error);
        setLoadError(data.error || 'Failed to load configuration');
      }
    } catch (error) {
      console.error('❌ Error loading join roles config:', error);
      setLoadError(error instanceof Error ? error.message : 'Network error');
    } finally {
      setIsLoading(false);
      // Marcar como no carga inicial después de un pequeño delay
      setTimeout(() => setIsInitialLoad(false), 300);
    }
  };

  const saveJoinRolesConfig = async () => {
    try {
      setIsSaving(true);
      const joinRoles = {
        general: assignedGeneralRoles,
        user: assignedUserRoles,
        bot: assignedBotRoles
      };

      const response = await fetch(`/api/join-roles/${guildId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ joinRoles })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseText = await response.text();
      console.log('🔍 Save response:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ JSON parse error on save:', parseError);
        console.error('❌ Save response was not valid JSON:', responseText);
        return;
      }

      if (data.success) {
        // Actualizar caché
        if (guildId) {
          joinRolesCache.set(guildId, joinRoles);
        }
        console.log('✅ Join roles config saved successfully');
      } else {
        console.error('❌ Error saving join roles config:', data.error);
      }
    } catch (error) {
      console.error('❌ Error saving join roles config:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-save when roles change (but only if user made changes)
  useEffect(() => {
    if (!isLoading && !isInitialLoad && hasUserChanges && guildId) {
      const timeoutId = setTimeout(() => {
        console.log('💾 Auto-saving due to user changes...');
        saveJoinRolesConfig();
        setHasUserChanges(false); // Reset after saving
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [assignedGeneralRoles, assignedUserRoles, assignedBotRoles, guildId, isLoading, isInitialLoad, hasUserChanges]);

  const handleAdd = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);
  const handleSelectType = (type: string) => {
    const roleType = ROLE_TYPES.find((r) => r.type === type);
    if (roleType) {
      setSelectedRoles((prev) => [...prev, roleType]);
    }
    setIsModalOpen(false);
  };

  const getAssignedRoles = (type: string) => {
    switch (type) {
      case "general": return assignedGeneralRoles;
      case "user": return assignedUserRoles;
      case "bot": return assignedBotRoles;
      default: return [];
    }
  };

  const getRoleColor = (type: string) => {
    switch (type) {
      case "general": return "blue";
      case "user": return "green";
      case "bot": return "purple";
      default: return "blue";
    }
  };

  // Mostrar error si hay problema de carga
  if (loadError && !isLoading) {
    return (
      <div className="w-full">
        <div className="bg-gradient-to-r from-blue-400 via-blue-600 to-blue-900 rounded-3xl p-24 mb-10 max-w-[80rem] mx-auto relative">
          <h1 className="text-6xl font-extrabold text-white uppercase leading-none text-center">
            Join Roles
          </h1>
          <p className="text-blue-100 text-center text-xl mt-4 font-medium">
            Assign roles automatically to users when they join your server
          </p>
        </div>

        <div className="max-w-[80rem] mx-auto flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-red-500 text-xl mb-4">⚠️ Error loading configuration</div>
            <div className="text-gray-600 mb-4">{loadError}</div>
            <button
              onClick={loadJoinRolesConfig}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Banner Header */}
      <div className="bg-gradient-to-r from-blue-400 via-blue-600 to-blue-900 rounded-3xl p-24 mb-10 max-w-[80rem] mx-auto relative">
        <button
          onClick={handleAdd}
          className="absolute top-4 right-6 px-3 py-1 text-xs font-bold uppercase rounded-md bg-white/30 text-white hover:bg-white/50 transition-colors"
        >
          Add
        </button>
        {isSaving && (
          <div className="absolute top-4 left-6 px-3 py-1 text-xs font-bold uppercase rounded-md bg-white/30 text-white">
            💾 Saving...
          </div>
        )}
        <h1 className="text-6xl font-extrabold text-white uppercase leading-none text-center">
          Join Roles
        </h1>
        <p className="text-blue-100 text-center text-xl mt-4 font-medium">
          Assign roles automatically to users when they join your server
        </p>
      </div>

      {isLoading ? (
        <div className="max-w-[80rem] mx-auto flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <div className="text-gray-600">Loading configuration...</div>
          </div>
        </div>
      ) : (
        <>
          {/* Tarjetas de roles seleccionados */}
          <div className="max-w-[80rem] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {selectedRoles.map((role, idx) => (
              <div
                key={idx}
                className={`rounded-2xl p-6 shadow-md flex flex-col gap-2 border-2 transition-all duration-200 ${isDarkMode
                    ? "bg-gradient-to-br from-[#181c24] via-[#101010] to-[#23272f] border-[#23272f]"
                    : "bg-gradient-to-br from-white via-blue-50 to-blue-100 border-blue-100"
                  }`}
              >
                <div className={`flex items-center gap-3 mb-2`}>
                  <div
                    className={`flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center
  ${role.type === 'general'
                        ? (isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100')
                        : role.type === 'user'
                          ? (isDarkMode ? 'bg-green-500/20' : 'bg-green-100')
                          : role.type === 'bot'
                            ? (isDarkMode ? 'bg-purple-500/20' : 'bg-purple-100')
                            : (isDarkMode ? 'bg-gray-500/20' : 'bg-gray-100')
                      }
`}>
                    <role.icon className={`w-5 h-5 md:w-6 md:h-6 ${role.type === 'general'
                        ? (isDarkMode ? 'text-blue-400' : 'text-blue-600')
                        : role.type === 'user'
                          ? (isDarkMode ? 'text-green-400' : 'text-green-600')
                          : role.type === 'bot'
                            ? (isDarkMode ? 'text-purple-400' : 'text-purple-600')
                            : (isDarkMode ? 'text-gray-300' : 'text-gray-600')
                      }`} />
                  </div>
                  <div>
                    <h4 className={`font-semibold text-lg ${isDarkMode ? "text-white" : "text-gray-900"}`}>{role.title}</h4>
                    <p className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>{role.description}</p>
                  </div>
                </div>

                {/* Botón + y modal para cada tipo */}
                <div className="mt-4 relative flex items-end justify-start h-10">
                  <RoleSelectorButton
                    guildId={guildId}
                    assignedRoles={getAssignedRoles(role.type)}
                    setAssignedRoles={(roles) => {
                      switch (role.type) {
                        case "general":
                          setAssignedGeneralRoles(roles);
                          break;
                        case "user":
                          setAssignedUserRoles(roles);
                          break;
                        case "bot":
                          setAssignedBotRoles(roles);
                          break;
                      }
                      setHasUserChanges(true); // Mark user changes
                    }}
                    isDarkMode={isDarkMode}
                    color={getRoleColor(role.type)}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Modal de selección de tipo de roles */}
          {isModalOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className={`rounded-2xl p-6 max-w-md w-full mx-4 shadow-lg border-2 ${isDarkMode
                  ? "bg-gradient-to-br from-[#181c24] via-[#101010] to-[#23272f] border-[#23272f]"
                  : "bg-gradient-to-br from-white via-blue-50 to-blue-100 border-blue-100"
                }`}>
                <h3 className={`text-xl font-bold mb-4 ${isDarkMode ? "text-white" : "text-gray-900"}`}>Select role type</h3>
                <div className="space-y-3">
                  {ROLE_TYPES.map((role) => (
                    <button
                      key={role.type}
                      onClick={() => handleSelectType(role.type)}
                      className={`w-full p-4 rounded-xl border-2 transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 ${isDarkMode
                          ? "border-gray-600/50 hover:border-gray-400/50 bg-gradient-to-r from-gray-800/50 to-gray-700/50"
                          : "border-gray-200 hover:border-gray-300 bg-gradient-to-r from-gray-50 to-gray-100"
                        }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-12 h-12 aspect-square flex-shrink-0 flex-grow-0 overflow-hidden rounded-xl bg-gradient-to-r ${role.gradient} flex items-center justify-center`}>
                          <role.icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="text-left">
                          <h4 className={`font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>{role.title}</h4>
                          <p className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>{role.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleCloseModal}
                  className={`w-full mt-4 py-2 px-4 rounded-lg font-semibold transition-colors ${isDarkMode ? "bg-gray-600 hover:bg-gray-500 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-700"}`}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default JoinRolesSetup; 