import React from "react";
import WelcomeMessageConfig from "./WelcomeMessageConfig";

interface BoostMessagesProps {
  onBack: () => void;
  guildId?: string;
}

const BoostMessages: React.FC<BoostMessagesProps> = ({ onBack, guildId }) => {
  return <WelcomeMessageConfig type="boost" onBack={onBack} guildId={guildId} />;
};

export default BoostMessages; 