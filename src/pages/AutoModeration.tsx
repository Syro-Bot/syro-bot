import React, { useRef, useState, useEffect } from "react";
import gsap from "gsap";
import { useTheme } from '../contexts/ThemeContext';
import type { Feature } from '../features/automoderation/types';
import AutoModerationSetup from '../features/automoderation/AutoModerationSetup';
import RoleSelectorButton from '../features/joinroles/RoleSelectorButton';
import { X, Shield } from "lucide-react";

const features = [
  { name: "Spam", tag: "Protege del spam", gradient: "from-pink-500 via-red-500 to-yellow-500", description: "Evita mensajes repetidos y masivos" },
  { name: "Palabras", tag: "Filtro de palabras", gradient: "from-blue-500 via-cyan-500 to-green-400", description: "Bloquea palabras no permitidas" },
  { name: "Links", tag: "Bloquea enlaces", gradient: "from-purple-500 via-fuchsia-500 to-pink-400", description: "Impide compartir enlaces no autorizados" },
  { name: "Raids", tag: "Protege de raids", gradient: "from-orange-500 via-yellow-500 to-lime-400", description: "Defiende el servidor de ataques coordinados" },
  { name: "Menciones", tag: "Limita menciones", gradient: "from-green-500 via-emerald-500 to-teal-400", description: "Restringe el abuso de menciones" },
  { name: "NSFW", tag: "Bloquea NSFW", gradient: "from-indigo-500 via-blue-500 to-cyan-400", description: "Filtra contenido no apto para menores" },
  { name: "Mayúsculas", tag: "Abuso de mayúsc..", gradient: "from-yellow-500 via-orange-500 to-red-400", description: "Evita el abuso de mayúsculas" },
  { name: "Emojis", tag: "Limita emojis", gradient: "from-teal-500 via-cyan-500 to-blue-400", description: "Controla el exceso de emojis" },
  { name: "Flood", tag: "Evita flood", gradient: "from-fuchsia-500 via-pink-500 to-rose-400", description: "Previene mensajes excesivos en poco tiempo" },
  { name: "Slowmode", tag: "Enfría el chat", gradient: "from-lime-500 via-green-500 to-emerald-400", description: "Obliga a esperar entre mensajes" },
  { name: "Mute", tag: "Mutea reincide..", gradient: "from-red-500 via-rose-500 to-pink-400", description: "Silencia a quienes incumplen repetidamente" },
  { name: "Logs", tag: "Registra inciden..", gradient: "from-cyan-500 via-blue-500 to-indigo-400", description: "Guarda un registro de las acciones" },
];

// Type definition for a Discord role
interface Role {
  id: string;
  name: string;
  color: string;
}

// ExcludedRolesBox component for displaying and managing excluded roles
const ExcludedRolesBox: React.FC<{
  excludedRoles: Role[];
  setExcludedRoles: React.Dispatch<React.SetStateAction<Role[]>>;
  isDarkMode: boolean;
  guildId?: string;
}> = ({ excludedRoles, setExcludedRoles, isDarkMode, guildId }) => (
  <div
    className={`flex flex-col gap-1 p-4 rounded-xl transition-all duration-200 shadow-md border-2 mb-8 max-w-xl min-w-[340px] w-full h-auto min-h-[72px] ${isDarkMode
      ? 'bg-gradient-to-br from-[#181c24] via-[#101010] to-[#23272f] border-[#23272f]'
      : 'bg-gradient-to-br from-white via-blue-50 to-blue-100 border-blue-100'
    }`}
    style={{ minHeight: 0 }}
  >
    {/* Header: icon, title, add button */}
    <div className="flex items-center justify-between w-full mb-1 gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <div className={`flex-shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'}`}> 
          <Shield className={`w-6 h-6 md:w-7 md:h-7 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
        </div>
        <span className="font-semibold text-base md:text-lg bg-gradient-to-r from-blue-500 via-blue-700 to-blue-900 bg-clip-text text-transparent tracking-tight truncate">
          Excluded Roles
        </span>
      </div>
      <RoleSelectorButton
        guildId={guildId}
        assignedRoles={excludedRoles}
        setAssignedRoles={setExcludedRoles}
        isDarkMode={isDarkMode}
        color="blue"
      />
    </div>
    <div className={`text-xs md:text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}
    >
      Members with these roles <b>will not be affected</b> by any auto-moderation rules.
    </div>
    <div className="flex flex-wrap gap-2 mt-1">
      {excludedRoles.length === 0 && (
        <span className={`px-2 py-1 rounded-md text-xs font-semibold ${isDarkMode ? 'bg-white/10 text-blue-100' : 'bg-blue-100 text-blue-700'}`}>No excluded roles</span>
      )}
      {excludedRoles.map((role: Role) => (
        <div key={role.id} className="group relative flex items-center">
          <span
            className="px-2 py-1 rounded-md text-xs font-semibold flex-shrink-0 transition-all duration-200 group-hover:opacity-80 shadow"
            style={{ backgroundColor: role.color, color: '#fff' }}
          >
            {role.name}
          </span>
          <button
            onClick={() => setExcludedRoles((prev: Role[]) => prev.filter((r) => r.id !== role.id))}
            className="-ml-2 w-4 h-4 bg-red-500 text-white rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center hover:bg-red-600"
            title="Remove role"
            aria-label="Remove role"
            style={{ marginLeft: '-8px' }}
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  </div>
);

const AutoModeration: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [selected, setSelected] = useState<Feature | null>(null);
  const cardsRef = useRef<HTMLDivElement | null>(null);
  const setupRef = useRef<HTMLDivElement | null>(null);
  // Use Role[] for excludedRoles
  const [excludedRoles, setExcludedRoles] = useState<Role[]>([]);

  // Animation for setup panel
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

  const handleSetup = (feature: Feature) => {
    if (cardsRef.current) {
      gsap.to(cardsRef.current, {
        opacity: 0,
        y: 40,
        duration: 0.5,
        onComplete: () => setSelected(feature),
      });
    }
  };

  const handleBack = () => {
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
  };

  const handleAdd = () => {
    // Add logic for adding a new feature if needed
    console.log(`Add clicked for ${selected?.name}`);
  };

  return (
    <div className={"w-full max-w-[90rem] mx-auto transition-colors duration-300"}>
      {/* Excluded roles box */}
      {!selected ? (
        <div
          ref={cardsRef}
          className={selected ? 'pointer-events-none opacity-0' : 'opacity-100'}
        >
          <ExcludedRolesBox
            excludedRoles={excludedRoles}
            setExcludedRoles={setExcludedRoles}
            isDarkMode={isDarkMode}
            guildId={undefined} // Pass real guildId if available
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
            {features.map((f) => (
              <div
                key={f.name}
                className={
                  "relative rounded-3xl overflow-visible transition-colors duration-300 flex flex-col min-h-[220px] " +
                  (isDarkMode ? 'bg-[#181c24]' : 'bg-white')
                }
              >
                {/* Gradient banner */}
                <div className={`relative h-[60%] min-h-[90px] rounded-t-3xl bg-gradient-to-r ${f.gradient}`}>
                  {/* Decorative circle */}
                  <div className="absolute left-1/2 -translate-x-1/2 -bottom-2 translate-y-1/2 w-16 h-16"
                    style={{
                      background: isDarkMode ? '#181c24' : '#fff',
                      border: `4px solid ${isDarkMode ? '#181c24' : '#fff'}`,
                      borderRadius: '9999px'
                    }}
                  ></div>
                </div>
                {/* Card content */}
                <div className="flex-1 flex items-end justify-between px-5 pb-5 pt-8">
                  <div>
                    <div className={"text-xl font-bold leading-tight mb-1 " + (isDarkMode ? 'text-white' : 'text-gray-900')}>{f.name}</div>
                    <div className={"text-xs font-semibold " + (isDarkMode ? 'text-gray-300' : 'text-gray-500')}>{f.tag}</div>
                  </div>
                  <button
                    className="ml-4 px-5 py-2 rounded-xl font-semibold text-sm bg-gradient-to-r from-blue-500 to-blue-700 text-white transition-colors duration-200 hover:from-blue-600 hover:to-blue-800"
                    onClick={() => handleSetup(f)}
                    aria-label={`Setup ${f.name}`}
                  >
                    Setup
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div ref={setupRef}>
          {selected && (
            <AutoModerationSetup feature={selected} onBack={handleBack} onAdd={handleAdd} />
          )}
        </div>
      )}
    </div>
  );
};

export default AutoModeration; 