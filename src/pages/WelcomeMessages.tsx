import React, { useState } from "react";
import { UserPlus, UserMinus, Rocket } from "lucide-react";
import JoinMessages from "../features/welcome/JoinMessages";
import LeaveMessages from "../features/welcome/LeaveMessages";
import BoostMessages from "../features/welcome/BoostMessages";
import { useTheme } from "../contexts/ThemeContext";

type WelcomeView = "main" | "join" | "leave" | "boost";

const cards = [
  {
    label: "Join Messages",
    icon: UserPlus,
    view: "join" as WelcomeView,
  },
  {
    label: "Leave Messages",
    icon: UserMinus,
    view: "leave" as WelcomeView,
  },
  {
    label: "Boost Messages",
    icon: Rocket,
    view: "boost" as WelcomeView,
  },
];

// Recibe guildId como prop desde el layout principal
interface WelcomeMessagesProps {
  guildId: string;
}

const WelcomeMessages: React.FC<WelcomeMessagesProps> = ({ guildId }) => {
  const { isDarkMode } = useTheme();
  const [currentView, setCurrentView] = useState<WelcomeView>("main");

  const handleCardClick = (view: WelcomeView) => {
    setCurrentView(view);
  };

  const handleBack = () => {
    setCurrentView("main");
  };

  // Render different views based on currentView
  if (currentView === "join") {
    return <JoinMessages onBack={handleBack} guildId={guildId} />;
  }

  if (currentView === "leave") {
    return <LeaveMessages onBack={handleBack} guildId={guildId} />;
  }

  if (currentView === "boost") {
    return <BoostMessages onBack={handleBack} guildId={guildId} />;
  }

  // Main view with cards
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex gap-x-8">
        {cards.map(({ label, icon: Icon, view }) => (
          <div
            key={label}
            onClick={() => handleCardClick(view)}
            className={`relative w-64 h-64 rounded-2xl flex items-center justify-center overflow-hidden cursor-pointer transition-all duration-300
              group border-2
              ${isDarkMode
                ? 'bg-gradient-to-br from-[#181c24] via-[#101010] to-[#23272f] border-[#23272f]'
                : 'bg-gradient-to-br from-white via-blue-50 to-blue-100 border-blue-100'
              }
              hover:shadow-[0_0_32px_0_rgba(80,180,255,0.25)]
              hover:border-blue-400
            `}
            style={{ minWidth: 220 }}
          >
            <Icon className={`absolute inset-0 w-full h-full pointer-events-none ${isDarkMode ? 'opacity-10' : 'opacity-30'} group-hover:scale-110 transition-transform duration-300`} style={{ color: '#c9daf8' }} />
            <span className="relative z-10 text-xl font-bold text-center drop-shadow bg-gradient-to-r from-blue-300 via-blue-400 to-blue-500 bg-clip-text text-transparent">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WelcomeMessages;