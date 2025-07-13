    import React, { useState, useEffect, useRef } from "react";
import { Plus, X } from "lucide-react";

interface RoleSelectorButtonProps {
  guildId?: string;
  assignedRoles: any[];
  setAssignedRoles: (roles: any[] | ((prev: any[]) => any[])) => void;
  isDarkMode: boolean;
  color?: "blue" | "green" | "purple";
}

// Cache global para roles por servidor
const rolesCache = new Map<string, any[]>();

const RoleSelectorButton: React.FC<RoleSelectorButtonProps> = ({ 
  guildId, 
  assignedRoles, 
  setAssignedRoles, 
  isDarkMode,
  color = "blue"
}) => {
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleSearch, setRoleSearch] = useState("");
  const [allRoles, setAllRoles] = useState<any[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  const roleModalRef = useRef<HTMLDivElement>(null);

  const getColorClasses = () => {
    switch (color) {
      case "green":
        return isDarkMode 
          ? 'bg-white/30 text-white hover:bg-white/50' 
          : 'bg-green-500/20 text-green-700 hover:bg-green-200';
      case "purple":
        return isDarkMode 
          ? 'bg-white/30 text-white hover:bg-white/50' 
          : 'bg-purple-500/20 text-purple-700 hover:bg-purple-200';
      default: // blue
        return isDarkMode 
          ? 'bg-white/30 text-white hover:bg-white/50' 
          : 'bg-blue-500/20 text-blue-700 hover:bg-blue-200';
    }
  };

  const getHoverColor = () => {
    switch (color) {
      case "green":
        return "hover:bg-green-100 dark:hover:bg-green-900";
      case "purple":
        return "hover:bg-purple-100 dark:hover:bg-purple-900";
      default: // blue
        return "hover:bg-blue-100 dark:hover:bg-blue-900";
    }
  };

  const loadRoles = async () => {
    if (!guildId) return;

    // Verificar si ya tenemos roles en caché
    if (rolesCache.has(guildId)) {
      setAllRoles(rolesCache.get(guildId) || []);
      return;
    }

    try {
      setIsLoadingRoles(true);
      console.log('🔍 Fetching roles for guildId:', guildId);
      
      const response = await fetch(`/api/roles/${guildId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📋 Roles response:', data);
      
      if (data.success) {
        const roles = data.roles || [];
        // Guardar en caché
        rolesCache.set(guildId, roles);
        setAllRoles(roles);
        console.log('✅ Roles loaded and cached:', roles.length);
      } else {
        console.error('❌ Error loading roles:', data.error);
      }
    } catch (error) {
      console.error('❌ Fetch error:', error);
    } finally {
      setIsLoadingRoles(false);
    }
  };

  useEffect(() => {
    if (showRoleModal && guildId) {
      loadRoles();
    }
  }, [showRoleModal, guildId]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (roleModalRef.current && !roleModalRef.current.contains(event.target as Node)) {
        setShowRoleModal(false);
        setRoleSearch(""); // Limpiar búsqueda al cerrar
      }
    }
    if (showRoleModal) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showRoleModal]);

  const filteredRoles = allRoles.filter(r => 
    r.name.toLowerCase().includes(roleSearch.toLowerCase())
  );

  return (
    <div className="relative flex items-center justify-start h-10">
      <button
        onClick={() => setShowRoleModal(true)}
        className={`flex items-center justify-center w-8 h-8 rounded-md transition-colors text-xl font-bold ${getColorClasses()}`}
        title="Add Role"
        style={{ position: 'absolute', left: 0, bottom: 0 }}
      >
        <Plus size={20} />
      </button>
      
      {/* Mostrar roles asignados al lado del botón + */}
      {assignedRoles.length > 0 && (
        <div className="ml-12 flex flex-wrap gap-2 max-w-64 items-center">
          {assignedRoles.slice(0, 3).map(r => (
            <div
              key={r.id}
              className="group relative"
            >
              <span 
                className="px-2 py-1 rounded-md text-xs font-semibold flex-shrink-0 transition-all duration-200 group-hover:opacity-80" 
                style={{ backgroundColor: r.color, color: '#fff' }}
              >
                {r.name}
              </span>
              <button
                onClick={() => {
                  setAssignedRoles((prev: any[]) => prev.filter(role => role.id !== r.id));
                }}
                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center hover:bg-red-600"
                title="Remove role"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          {assignedRoles.length > 3 && (
            <span className="px-2 py-1 rounded-md text-xs font-semibold bg-gray-500 text-white flex-shrink-0">
              +{assignedRoles.length - 3}
            </span>
          )}
        </div>
      )}
      
      {showRoleModal && (
        <div ref={roleModalRef} className={`absolute left-0 top-full mt-2 z-50 w-80 rounded-xl shadow-xl border ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
          <div className={`p-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <input
              type="text"
              value={roleSearch}
              onChange={e => setRoleSearch(e.target.value)}
              placeholder="Search roles..."
              className={`w-full px-3 py-2 rounded-lg border ${isDarkMode ? "bg-gray-900 border-gray-700 text-white placeholder-gray-400" : "bg-gray-100 border-gray-300 text-gray-800 placeholder-gray-500"}`}
              autoFocus
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-2">
            {isLoadingRoles ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className={`ml-2 text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>Loading roles...</span>
              </div>
            ) : filteredRoles.length > 0 ? (
              filteredRoles.map(r => (
                <button
                  key={r.id}
                  onClick={() => {
                    setAssignedRoles((prev: any[]) => {
                      if (!Array.isArray(prev)) prev = [];
                      if (!r || !r.id) return prev;
                      return prev.some((ar: any) => ar.id === r.id) ? prev : [...prev, r];
                    });
                    setShowRoleModal(false);
                    setRoleSearch(""); // Limpiar búsqueda
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${getHoverColor()}`}
                >
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: r.color }} />
                  <span className={`font-medium ${isDarkMode ? "text-white" : "text-gray-800"}`}>{r.name}</span>
                </button>
              ))
            ) : (
              <div className="text-center py-4">
                <div className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                  {roleSearch ? 'No roles found matching your search' : 'No roles available'}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleSelectorButton; 