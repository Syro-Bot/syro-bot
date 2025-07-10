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

const WelcomeMessages: React.FC = () => {
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
    return <JoinMessages onBack={handleBack} />;
  }

  if (currentView === "leave") {
    return <LeaveMessages onBack={handleBack} />;
  }

  if (currentView === "boost") {
    return <BoostMessages onBack={handleBack} />;
  }

  // Main view with cards
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex gap-x-8">
        {cards.map(({ label, icon: Icon, view }) => (
          <div
            key={label}
            onClick={() => handleCardClick(view)}
            className={`relative w-64 h-64 rounded-2xl flex items-center justify-center overflow-hidden cursor-pointer transition-all duration-200 ${isDarkMode
                ? 'bg-white/10 dark:bg-black/20 hover:bg-white/20 dark:hover:bg-black/30'
                : 'bg-white hover:bg-gray-50'
              }`}
          >
            <Icon className={`absolute inset-0 w-full h-full pointer-events-none ${isDarkMode ? 'opacity-5' : 'opacity-40'}`} style={{ color: '#c9daf8' }} />
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