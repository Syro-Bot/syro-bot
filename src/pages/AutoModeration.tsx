import React, { useRef, useState, useEffect } from "react";
import gsap from "gsap";
import { useTheme } from '../contexts/ThemeContext';
import type { Feature } from '../features/automoderation/types';
import AutoModerationSetup from '../features/automoderation/AutoModerationSetup';

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

const AutoModeration: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [selected, setSelected] = useState<Feature | null>(null); // Guarda el feature seleccionado
  const cardsRef = useRef<HTMLDivElement | null>(null);
  const setupRef = useRef<HTMLDivElement | null>(null);

  // Animación de entrada del setup
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
    // Aquí puedes agregar lógica específica para cada feature
    console.log(`Add clicked for ${selected?.name}`);
  };

  return (
    <div className={"w-full max-w-[90rem] mx-auto py-12   transition-colors duration-300"}>
      {(!selected) && (
      <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-400 via-blue-600 to-blue-900 bg-clip-text text-transparent uppercase leading-none mb-10 text-center">
        AutoModeration
      </h1>
      )}
      {!selected ? (
        <div
          ref={cardsRef}
          className={selected ? 'pointer-events-none opacity-0' : 'opacity-100'}
        >
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
        {features.map((f) => (
          <div
            key={f.name}
            className={
              "relative rounded-3xl overflow-visible transition-colors duration-300 flex flex-col min-h-[220px] " +
              (isDarkMode ? 'bg-[#181c24]' : 'bg-white')
            }
          >
            {/* Banner gradiente */}
            <div className={`relative h-[60%] min-h-[90px] rounded-t-3xl bg-gradient-to-r ${f.gradient}`}>
              {/* Círculo decorativo */}
              <div className="absolute left-1/2 -translate-x-1/2 -bottom-2 translate-y-1/2 w-16 h-16"
                style={{
                  background: isDarkMode ? '#181c24' : '#fff',
                  border: `4px solid ${isDarkMode ? '#181c24' : '#fff'}`,
                  borderRadius: '9999px'
                }}
              ></div>
            </div>
            {/* Contenido inferior */}
            <div className="flex-1 flex items-end justify-between px-5 pb-5 pt-8">
              <div>
                <div className={"text-xl font-bold leading-tight mb-1 " + (isDarkMode ? 'text-white' : 'text-gray-900')}>{f.name}</div>
                <div className={"text-xs font-semibold " + (isDarkMode ? 'text-gray-300' : 'text-gray-500')}>{f.tag}</div>
              </div>
                  <button
                    className="ml-4 px-5 py-2 rounded-xl font-semibold text-sm bg-gradient-to-r from-blue-500 to-blue-700 text-white transition-colors duration-200 hover:from-blue-600 hover:to-blue-800"
                    onClick={() => handleSetup(f)}
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