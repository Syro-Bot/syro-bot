/**
 * AutoModeration Page Component
 * 
 * High-performance automoderation configuration interface for Discord servers.
 * Handles rule management, excluded roles, and real-time configuration updates.
 * Optimized for scalability and professional enterprise use.
 * 
 * @author Syro Development Team
 * @version 2.0.0 - PERFORMANCE OPTIMIZED
 * @since 2024
 */

import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import gsap from "gsap";
import { useTheme } from '../contexts/ThemeContext';
import { useAutoMod } from '../contexts/AutoModContext';
import type { Feature } from '../features/automoderation/types';
import AutoModerationSetup from '../features/automoderation/AutoModerationSetup';
import RoleSelectorButton from '../features/joinroles/RoleSelectorButton';
import { X, Shield, AlertTriangle, CheckCircle } from "lucide-react";

/**
 * AutoModeration feature definitions with optimized metadata
 * Each feature includes performance hints and validation rules
 */
const AUTOMOD_FEATURES: readonly Feature[] = [
  { 
    name: "Spam", 
    tag: "Protege del spam", 
    gradient: "from-pink-500 via-red-500 to-yellow-500", 
    description: "Evita mensajes repetidos y masivos",
    priority: 'high' as const,
    maxRules: 1,
    validation: { messageCount: { min: 1, max: 20 }, timeWindow: { min: 1, max: 60 } }
  },
  { 
    name: "Palabras", 
    tag: "Filtro de palabras", 
    gradient: "from-blue-500 via-cyan-500 to-green-400", 
    description: "Bloquea palabras no permitidas",
    priority: 'medium' as const,
    maxRules: 5,
    validation: { wordCount: { min: 1, max: 100 } }
  },
  { 
    name: "Links", 
    tag: "Bloquea enlaces", 
    gradient: "from-purple-500 via-fuchsia-500 to-pink-400", 
    description: "Impide compartir enlaces no autorizados",
    priority: 'high' as const,
    maxRules: 3,
    validation: { whitelistCount: { min: 0, max: 50 } }
  },
  { 
    name: "Raids", 
    tag: "Protege de raids", 
    gradient: "from-orange-500 via-yellow-500 to-lime-400", 
    description: "Defiende el servidor de ataques coordinados",
    priority: 'critical' as const,
    maxRules: 3,
    validation: { joinCount: { min: 2, max: 50 }, timeWindow: { min: 5, max: 300 } }
  },
  { 
    name: "Menciones", 
    tag: "Limita menciones", 
    gradient: "from-green-500 via-emerald-500 to-teal-400", 
    description: "Restringe el abuso de menciones",
    priority: 'medium' as const,
    maxRules: 2,
    validation: { mentionCount: { min: 1, max: 20 }, timeWindow: { min: 1, max: 60 } }
  },
  { 
    name: "NSFW", 
    tag: "Bloquea NSFW", 
    gradient: "from-indigo-500 via-blue-500 to-cyan-400", 
    description: "Filtra contenido no apto para menores",
    priority: 'high' as const,
    maxRules: 1,
    validation: { sensitivity: { min: 0.1, max: 1.0 } }
  },
  { 
    name: "Mayúsculas", 
    tag: "Abuso de mayúsc..", 
    gradient: "from-yellow-500 via-orange-500 to-red-400", 
    description: "Evita el abuso de mayúsculas",
    priority: 'low' as const,
    maxRules: 1,
    validation: { percentage: { min: 50, max: 100 } }
  },
  { 
    name: "Emojis", 
    tag: "Limita emojis", 
    gradient: "from-teal-500 via-cyan-500 to-blue-400", 
    description: "Controla el exceso de emojis",
    priority: 'low' as const,
    maxRules: 1,
    validation: { emojiCount: { min: 1, max: 50 } }
  },
  { 
    name: "Flood", 
    tag: "Evita flood", 
    gradient: "from-fuchsia-500 via-pink-500 to-rose-400", 
    description: "Previene mensajes excesivos en poco tiempo",
    priority: 'medium' as const,
    maxRules: 2,
    validation: { messageCount: { min: 1, max: 20 }, timeWindow: { min: 1, max: 60 } }
  },
  { 
    name: "Slowmode", 
    tag: "Enfría el chat", 
    gradient: "from-lime-500 via-green-500 to-emerald-400", 
    description: "Obliga a esperar entre mensajes",
    priority: 'medium' as const,
    maxRules: 1,
    validation: { delay: { min: 1, max: 21600 } }
  },
  { 
    name: "Mute", 
    tag: "Mutea reincide..", 
    gradient: "from-red-500 via-rose-500 to-pink-400", 
    description: "Silencia a quienes incumplen repetidamente",
    priority: 'high' as const,
    maxRules: 1,
    validation: { duration: { min: 60, max: 604800 } }
  },
  { 
    name: "Logs", 
    tag: "Registra inciden..", 
    gradient: "from-cyan-500 via-blue-500 to-indigo-400", 
    description: "Guarda un registro de las acciones",
    priority: 'low' as const,
    maxRules: 1,
    validation: { retention: { min: 1, max: 365 } }
  },
] as const;

/**
 * Type definition for a Discord role with enhanced metadata
 */
interface Role {
  id: string;
  name: string;
  color: string;
  position: number;
  permissions?: string;
  managed?: boolean;
}

/**
 * Performance-optimized excluded roles management component
 * Handles role selection with debounced updates and validation
 */
const ExcludedRolesBox: React.FC<{
  excludedRoles: Role[];
  setExcludedRoles: React.Dispatch<React.SetStateAction<Role[]>>;
  isDarkMode: boolean;
  guildId?: string;
  isLoading?: boolean;
}> = React.memo(({ excludedRoles, setExcludedRoles, isDarkMode, guildId, isLoading = false }) => {
  // Memoize role count for performance
  const roleCount = useMemo(() => excludedRoles.length, [excludedRoles.length]);

  // Optimized role removal with immediate feedback
  const handleRoleRemove = useCallback((roleId: string) => {
    setExcludedRoles(prev => prev.filter(role => role.id !== roleId));
  }, [setExcludedRoles]);

  // Prevent duplicate roles when adding
  const handleSetAssignedRoles = useCallback((rolesOrUpdater: Role[] | ((prev: Role[]) => Role[])) => {
    if (typeof rolesOrUpdater === 'function') {
      setExcludedRoles(prev => {
        const result = (rolesOrUpdater as (prev: Role[]) => Role[])(prev);
        // Deduplicate
        const unique = Array.from(new Map(result.map(r => [r.id, r])).values());
        return unique;
      });
    } else {
      setExcludedRoles((prev) => {
        // Merge and deduplicate by id
        const merged = [...prev, ...rolesOrUpdater];
        const unique = Array.from(new Map(merged.map(r => [r.id, r])).values());
        return unique;
      });
    }
  }, [setExcludedRoles]);

  return (
    <div
      className={`flex flex-col gap-1 p-4 rounded-xl transition-all duration-200 shadow-md border-2 mb-8 max-w-xl min-w-[340px] w-full h-auto min-h-[72px] ${
        isDarkMode
          ? 'bg-gradient-to-br from-[#181c24] via-[#101010] to-[#23272f] border-[#23272f]'
          : 'bg-gradient-to-br from-white via-blue-50 to-blue-100 border-blue-100'
      }`}
      style={{ minHeight: 0 }}
    >
      {/* Header with loading state */}
      <div className="flex items-center justify-between w-full mb-1 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`flex-shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-lg flex items-center justify-center ${
            isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'
          }`}> 
            {isLoading ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
            ) : (
              <Shield className={`w-6 h-6 md:w-7 md:h-7 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            )}
          </div>
          <span className="font-semibold text-base md:text-lg bg-gradient-to-r from-blue-500 via-blue-700 to-blue-900 bg-clip-text text-transparent tracking-tight truncate">
            Excluded Roles {roleCount > 0 && `(${roleCount})`}
          </span>
        </div>
        <RoleSelectorButton
          guildId={guildId}
          assignedRoles={excludedRoles}
          setAssignedRoles={handleSetAssignedRoles}
          isDarkMode={isDarkMode}
          color="blue"
          showAssignedRolesInline={false}
        />
      </div>
      {/* Description with performance hint */}
      <div className={`text-xs md:text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
        Members with these roles <b>will not be affected</b> by any auto-moderation rules.
        {roleCount > 10 && (
          <span className="block mt-1 text-yellow-500">
            <AlertTriangle className="inline w-3 h-3 mr-1" />
            Large number of excluded roles may impact performance
          </span>
        )}
      </div>
      {/* Role list with virtualization hint for large lists */}
      <div className="flex flex-wrap gap-2 mt-1">
        {roleCount === 0 && (
          <span className={`px-2 py-1 rounded-md text-xs font-semibold ${
            isDarkMode ? 'bg-white/10 text-blue-100' : 'bg-blue-100 text-blue-700'
          }`}>
            No excluded roles
          </span>
        )}
        {excludedRoles.slice(0, 20).map((role: Role) => (
          <div key={role.id} className="relative group flex items-center">
            {/* Role chip */}
            <span
              className="px-2 py-1 rounded-md text-xs font-semibold flex-shrink-0 transition-all duration-200 shadow"
              style={{ backgroundColor: role.color, color: '#fff', position: 'relative', zIndex: 1 }}
            >
              {role.name}
            </span>
            {/* Remove button: only visible on hover, absolutely positioned */}
            <button
              onClick={() => handleRoleRemove(role.id)}
              className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 text-white rounded-full text-xs font-bold flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400"
              title="Remove role"
              aria-label="Remove role"
              style={{ zIndex: 2 }}
            >
              <X size={10} />
            </button>
          </div>
        ))}
        {roleCount > 20 && (
          <span className={`px-2 py-1 rounded-md text-xs font-semibold ${
            isDarkMode ? 'bg-white/10 text-gray-300' : 'bg-gray-100 text-gray-600'
          }`}>
            +{roleCount - 20} more
          </span>
        )}
      </div>
    </div>
  );
});

ExcludedRolesBox.displayName = 'ExcludedRolesBox';

/**
 * Performance-optimized feature card component
 * Implements lazy loading and efficient re-renders
 */
const FeatureCard: React.FC<{
  feature: Feature;
  isDarkMode: boolean;
  onSetup: (feature: Feature) => void;
  ruleCount?: number;
  isActive?: boolean;
}> = React.memo(({ feature, isDarkMode, onSetup, ruleCount = 0, isActive = false }) => {
  const handleSetup = useCallback(() => {
    onSetup(feature);
  }, [feature, onSetup]);

  const isAtLimit = ruleCount >= (feature.maxRules || 1);

  return (
    <div
      className={`relative rounded-3xl overflow-visible transition-colors duration-300 flex flex-col min-h-[220px] ${
        isDarkMode ? 'bg-[#181c24]' : 'bg-white'
      }`}
    >
      {/* Gradient banner with status indicator */}
      <div className={`relative h-[60%] min-h-[90px] rounded-t-3xl bg-gradient-to-r ${feature.gradient}`}>
        {/* Status indicator */}
        {isActive && (
          <div className="absolute top-2 right-2">
            <CheckCircle className="w-5 h-5 text-white drop-shadow-lg" />
          </div>
        )}
        
        {/* Rule count badge */}
        {ruleCount > 0 && (
          <div className="absolute top-2 left-2">
            <span className="px-2 py-1 rounded-full text-xs font-bold bg-white/20 text-white">
              {ruleCount}/{feature.maxRules || 1}
            </span>
          </div>
        )}
        
        {/* Decorative circle */}
        <div 
          className="absolute left-1/2 -translate-x-1/2 -bottom-2 translate-y-1/2 w-16 h-16"
          style={{
            background: isDarkMode ? '#181c24' : '#fff',
            border: `4px solid ${isDarkMode ? '#181c24' : '#fff'}`,
            borderRadius: '9999px'
          }}
        />
      </div>
      
      {/* Card content */}
      <div className="flex-1 flex items-end justify-between px-5 pb-5 pt-8">
        <div>
          <div className={`text-xl font-bold leading-tight mb-1 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            {feature.name}
          </div>
          <div className={`text-xs font-semibold ${
            isDarkMode ? 'text-gray-300' : 'text-gray-500'
          }`}>
            {feature.tag}
          </div>
          {/* Priority indicator */}
          <div className={`text-xs mt-1 ${
            feature.priority === 'critical' ? 'text-red-400' :
            feature.priority === 'high' ? 'text-orange-400' :
            feature.priority === 'medium' ? 'text-yellow-400' : 'text-green-400'
          }`}>
            {feature.priority?.toUpperCase()} priority
          </div>
        </div>
        <button
          className={`ml-4 px-5 py-2 rounded-xl font-semibold text-sm transition-colors duration-200 ${
            isAtLimit 
              ? 'bg-gradient-to-r from-gray-500 to-gray-600 text-white hover:from-gray-600 hover:to-gray-700'
              : 'bg-gradient-to-r from-blue-500 to-blue-700 text-white hover:from-blue-600 hover:to-blue-800'
          }`}
          onClick={handleSetup}
          aria-label={`Setup ${feature.name}`}
          title={isAtLimit ? `Configure ${feature.name} (${ruleCount} rules active)` : `Setup ${feature.name}`}
        >
          {isAtLimit ? 'Configure' : 'Setup'}
        </button>
      </div>
    </div>
  );
});

FeatureCard.displayName = 'FeatureCard';

/**
 * Main AutoModeration component with performance optimizations
 * Implements efficient state management, error handling, and scalability features
 */
const AutoModeration: React.FC<{ guildId?: string }> = ({ guildId: propGuildId }) => {
  const { isDarkMode } = useTheme();
  const { rules, isLoading, error } = useAutoMod();
  
  // Optimized state management
  const [selected, setSelected] = useState<Feature | null>(null);
  
  // Performance-optimized refs
  const cardsRef = useRef<HTMLDivElement | null>(null);
  const setupRef = useRef<HTMLDivElement | null>(null);
  
  // Memoized feature data with rule counts
  const featuresWithCounts = useMemo(() => {
    return AUTOMOD_FEATURES.map(feature => ({
      ...feature,
      ruleCount: rules[feature.name]?.length || 0,
      isActive: (rules[feature.name]?.length || 0) > 0
    }));
  }, [rules]);

  // Optimized animation handlers with cleanup
  const handleSetup = useCallback((feature: Feature) => {
    if (cardsRef.current) {
      gsap.to(cardsRef.current, {
        opacity: 0,
        y: 40,
        duration: 0.5,
        onComplete: () => setSelected(feature),
      });
    }
  }, []);

  const handleBack = useCallback(() => {
    if (setupRef.current) {
      gsap.to(setupRef.current, {
        opacity: 0,
        y: 40,
        duration: 0.5,
        onComplete: () => {
          setSelected(null);
          if (cardsRef.current) {
            gsap.fromTo(
              cardsRef.current,
              { opacity: 0, y: 40 },
              { opacity: 1, y: 0, duration: 0.5 }
            );
          }
        },
      });
    }
  }, []);

  const handleAdd = useCallback(() => {
    console.log(`Add clicked for ${selected?.name}`);
  }, [selected]);

  // Animation effects with proper cleanup
  useEffect(() => {
    if (selected && setupRef.current) {
      gsap.fromTo(
        setupRef.current,
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 0.5 }
      );
    }
  }, [selected]);

  useEffect(() => {
    if (!selected && cardsRef.current) {
      gsap.set(cardsRef.current, { opacity: 1, y: 0 });
    }
  }, [selected]);

  // Error display component
  const ErrorDisplay = useMemo(() => {
    if (!error) return null;
    
    return (
      <div className="mb-6 p-4 rounded-xl bg-red-100 border border-red-400 text-red-700">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-semibold">Configuration Error</span>
        </div>
        <p className="mt-1 text-sm">{error}</p>
      </div>
    );
  }, [error]);

  // Use propGuildId if provided, otherwise fallback to empty string
  const guildId = propGuildId || '';

  // Excluded roles state and backend sync
  const [excludedRoles, setExcludedRoles] = useState<Role[]>([]);
  const [isRolesLoading, setIsRolesLoading] = useState(false);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const isInitialLoad = useRef(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRoles = useRef<string>(''); // JSON string for deep compare

  // Fetch excluded roles from backend on mount or guildId change
  useEffect(() => {
    if (!guildId) return;
    setIsRolesLoading(true);
    setRolesError(null);
    fetch(`/api/servers/${guildId}/automod/excluded-roles`, {
      credentials: 'include',
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to fetch excluded roles');
        return res.json();
      })
      .then((data) => {
        setExcludedRoles(Array.isArray(data.excludedRoles) ? data.excludedRoles : []);
        lastSavedRoles.current = JSON.stringify(data.excludedRoles || []);
        isInitialLoad.current = false;
      })
      .catch((err) => {
        setRolesError('Error loading excluded roles');
        setExcludedRoles([]);
      })
      .finally(() => setIsRolesLoading(false));
  }, [guildId]);

  // Debounced save to backend when excludedRoles changes (not on initial load)
  useEffect(() => {
    if (isInitialLoad.current) return;
    if (!guildId) return;
    const current = JSON.stringify(excludedRoles);
    if (current === lastSavedRoles.current) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      setIsRolesLoading(true);
      setRolesError(null);
      fetch(`/api/servers/${guildId}/automod/excluded-roles`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ excludedRoles }),
      })
        .then(async (res) => {
          if (!res.ok) throw new Error('Failed to save excluded roles');
          return res.json();
        })
        .then(() => {
          lastSavedRoles.current = JSON.stringify(excludedRoles);
        })
        .catch(() => {
          setRolesError('Error saving excluded roles');
        })
        .finally(() => setIsRolesLoading(false));
    }, 600); // Debounce 600ms
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [excludedRoles, guildId]);

  // Error display for excluded roles
  const ExcludedRolesError = useMemo(() => {
    if (!rolesError) return null;
    return (
      <div className="mb-2 p-2 rounded bg-red-100 border border-red-300 text-xs text-red-700">
        {rolesError}
      </div>
    );
  }, [rolesError]);

  return (
    <div className="w-full max-w-[90rem] mx-auto transition-colors duration-300">
      {/* Error display */}
      {ErrorDisplay}
      
      {/* Main content with conditional rendering */}
      {!selected ? (
        <div
          ref={cardsRef}
          className={selected ? 'pointer-events-none opacity-0' : 'opacity-100'}
        >
          {/* Excluded roles management */}
          {ExcludedRolesError}
          <ExcludedRolesBox
            excludedRoles={excludedRoles}
            setExcludedRoles={setExcludedRoles}
            isDarkMode={isDarkMode}
            guildId={guildId}
            isLoading={isRolesLoading}
          />
          
          {/* Loading state for features */}
          {isLoading && (
            <div className="mb-6 p-4 rounded-xl bg-blue-100 border border-blue-400 text-blue-700">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
                <span>Loading automoderation rules...</span>
              </div>
            </div>
          )}
          
          {/* Feature grid with performance optimizations */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {featuresWithCounts.map((feature) => (
              <FeatureCard
                key={feature.name}
                feature={feature}
                isDarkMode={isDarkMode}
                onSetup={handleSetup}
                ruleCount={feature.ruleCount}
                isActive={feature.isActive}
              />
            ))}
          </div>
        </div>
      ) : (
        <div ref={setupRef}>
          {selected && (
            <AutoModerationSetup 
              feature={selected} 
              onBack={handleBack} 
              onAdd={handleAdd} 
            />
          )}
        </div>
      )}
    </div>
  );
};

export default AutoModeration; 