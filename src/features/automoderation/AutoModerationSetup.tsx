import React from "react";
import { useTheme } from '../../contexts/ThemeContext';
import { useAutoMod } from '../../contexts/AutoModContext';
import { useModal } from '../../contexts/ModalContext';
import type { AutoModerationSetupProps } from "./types";
import SpamSetup from "./components/SpamSetup";
import RaidSetup from "./components/RaidSetup";

const AutoModerationSetup: React.FC<AutoModerationSetupProps> = ({ feature, onBack, onAdd }) => {
  const { isDarkMode } = useTheme();
  const { rules, addRule } = useAutoMod();
  const { setShowRaidTypeModal, setRaidTypeModalProps } = useModal();

  const handleAddRule = async () => {
    switch (feature.name) {
      case "Spam":
        if ((rules.Spam || []).length > 0) return; // Solo permitir uno
        await addRule("Spam", {
          title: "Spam",
          description: "Take Actions when a user sends messages too fast",
          messageCount: 3,
          timeWindow: 5
        });
        break;
      case "Raids":
        setRaidTypeModalProps({
          onSelectType: handleRaidTypeSelect,
          isDarkMode
        });
        setShowRaidTypeModal(true);
        break;
      default:
        if (onAdd) onAdd();
    }
  };

  const handleRaidTypeSelect = async (raidType: 'join' | 'channel' | 'role') => {
    setShowRaidTypeModal(false);
    
    const raidConfigs = {
      join: {
        title: "Join Raid Protection",
        description: "Activate lockdown when too many users join quickly",
        joinCount: 5,
        timeWindow: 10,
        lockdownDuration: 10,
        raidType: 'join' as const
      },
      channel: {
        title: "Channel Raid Protection",
        description: "Activate lockdown when too many channels are created quickly",
        channelCount: 3,
        timeWindow: 15,
        lockdownDuration: 15,
        raidType: 'channel' as const
      },
      role: {
        title: "Role Raid Protection",
        description: "Activate lockdown when too many roles are created quickly",
        roleCount: 3,
        timeWindow: 15,
        lockdownDuration: 15,
        raidType: 'role' as const
      }
    };

    const config = raidConfigs[raidType];
    await addRule("Raids", config);
  };

  const renderSetupContent = () => {
    switch (feature.name) {
      case "Spam":
        return <SpamSetup rules={rules.Spam || []} isDarkMode={isDarkMode} />;
      case "Raids":
        return <RaidSetup rules={rules.Raids || []} isDarkMode={isDarkMode} />;
      default:
        return <div className={isDarkMode ? "text-white" : "text-gray-900"}>Configuración no disponible</div>;
    }
  };

  return (
    <>
      <div className={"rounded-3xl p-8 flex flex-col items-center w-full max-w-6xl mx-auto "}>
        {/* Banner gradiente igual al card */}
        <div className={`w-full rounded-3xl h-60 flex items-center justify-center mb-8 bg-gradient-to-r ${feature.gradient} relative`}>
          <button
            className="absolute top-4 left-6 px-3 py-1 text-xs font-bold uppercase rounded-md bg-white/30 text-white hover:bg-white/50 transition-colors"
            onClick={onBack}
          >
            Ver todas las funcionalidades
          </button>
          <button
            className="absolute top-4 right-6 px-3 py-1 text-xs font-bold uppercase rounded-md bg-white/30 text-white hover:bg-white/50 transition-colors"
            onClick={handleAddRule}
            disabled={feature.name === 'Spam' && (rules.Spam || []).length > 0}
            style={feature.name === 'Spam' && (rules.Spam || []).length > 0 ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
          >
            Add
          </button>
          <h2 className="text-[3.5rem] font-bold text-white text-center w-full flex justify-center items-center">{feature.description}</h2>
        </div>
        {/* Contenido específico de cada funcionalidad */}
        <div className="w-full">
          {renderSetupContent()}
        </div>
      </div>


    </>
  );
};

export default AutoModerationSetup; 