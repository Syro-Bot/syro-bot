import React, { useState, useEffect } from "react";
import { Plus, Users, User, Bot } from "lucide-react";
import RoleSelectorButton from "./RoleSelectorButton";

interface JoinRolesSetupProps {
  guildId?: string;
}

const ROLE_TYPES = [
  {
    type: "general",
    title: "General Roles",
    description: "The following roles will be assigned to users joining the server.",
    icon: Users,
    gradient: "from-blue-400 to-blue-600",
  },
  {
    type: "user",
    title: "User Specific Roles",
    description: "Assign roles to specific users when they join. (Coming soon)",
    icon: User,
    gradient: "from-green-400 to-green-600",
  },
  {
    type: "bot",
    title: "Bot Roles",
    description: "Assign roles to bots joining the server. (Coming soon)",
    icon: Bot,
    gradient: "from-purple-400 to-purple-600",
  },
];

const JoinRolesSetup: React.FC<JoinRolesSetupProps> = ({ guildId }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<any[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(
    document.documentElement.classList.contains("dark")
  );
  const [assignedGeneralRoles, setAssignedGeneralRoles] = useState<any[]>([]);
  const [assignedUserRoles, setAssignedUserRoles] = useState<any[]>([]);
  const [assignedBotRoles, setAssignedBotRoles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  // Load join roles configuration
  useEffect(() => {
    if (guildId) {
      loadJoinRolesConfig();
    }
  }, [guildId]);

  const loadJoinRolesConfig = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/join-roles/${guildId}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // Log the raw response for debugging
      const responseText = await response.text();
      console.log('🔍 Raw response:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        console.error('❌ Response was not valid JSON:', responseText);
        return;
      }
      
      if (data.success) {
        setAssignedGeneralRoles(data.joinRoles.general || []);
        setAssignedUserRoles(data.joinRoles.user || []);
        setAssignedBotRoles(data.joinRoles.bot || []);
        
        // Auto-load role type cards if there are saved roles
        const hasGeneralRoles = (data.joinRoles.general || []).length > 0;
        const hasUserRoles = (data.joinRoles.user || []).length > 0;
        const hasBotRoles = (data.joinRoles.bot || []).length > 0;
        
        const typesToLoad: string[] = [];
        if (hasGeneralRoles) typesToLoad.push('general');
        if (hasUserRoles) typesToLoad.push('user');
        if (hasBotRoles) typesToLoad.push('bot');
        
        // Load the corresponding role type cards
        const roleTypesToAdd = ROLE_TYPES.filter(role => typesToLoad.includes(role.type));
        setSelectedRoles(roleTypesToAdd);
        
        console.log('✅ Join roles config loaded:', data.joinRoles);
        console.log('📋 Auto-loaded role type cards:', roleTypesToAdd.map(r => r.type));
      } else {
        console.error('❌ Error loading join roles config:', data.error);
      }
    } catch (error) {
      console.error('❌ Error loading join roles config:', error);
    } finally {
      setIsLoading(false);
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

      // Log the raw response for debugging
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

  // Auto-save when roles change
  useEffect(() => {
    if (!isLoading && guildId) {
      const timeoutId = setTimeout(() => {
        saveJoinRolesConfig();
      }, 1000); // Debounce for 1 second

      return () => clearTimeout(timeoutId);
    }
  }, [assignedGeneralRoles, assignedUserRoles, assignedBotRoles, guildId, isLoading]);

  const handleAdd = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);
  const handleSelectType = (type: string) => {
    setSelectedRoles((prev) => [
      ...prev,
      ROLE_TYPES.find((r) => r.type === type),
    ]);
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
          </div>
        </div>
      ) : (
        <>
          {/* Tarjetas de roles seleccionados */}
          <div className="max-w-[80rem] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {selectedRoles.map((role, idx) => (
              <div
                key={idx}
                className={`rounded-2xl p-6 shadow-lg flex flex-col gap-2 border-2 transition-all duration-200 ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
              >
                <div className={`flex items-center gap-3 mb-2`}>
                  <div className={`w-12 h-12 aspect-square flex-shrink-0 flex-grow-0 overflow-hidden rounded-xl bg-gradient-to-r ${role.gradient} flex items-center justify-center`}>
                    <role.icon className="w-6 h-6 text-white" />
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
              <div className={`rounded-2xl p-6 max-w-md w-full mx-4 shadow-lg ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
                <h3 className={`text-xl font-bold mb-4 ${isDarkMode ? "text-white" : "text-gray-900"}`}>Select role type</h3>
                <div className="space-y-3">
                  {ROLE_TYPES.map((role) => (
                    <button
                      key={role.type}
                      onClick={() => handleSelectType(role.type)}
                      className={`w-full p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${isDarkMode ? "border-gray-600 hover:border-gray-400 bg-gray-700" : "border-gray-200 hover:border-gray-300 bg-gray-50"}`}
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