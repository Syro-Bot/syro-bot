import React from "react";
import WelcomeMessageConfig from "./WelcomeMessageConfig";

/**
 * Props for BoostMessages component
 */
interface BoostMessagesProps {
  onBack: () => void;
  guildId: string;
}

/**
 * BoostMessages wrapper for WelcomeMessageConfig (type="boost")
 */
const BoostMessages: React.FC<BoostMessagesProps> = ({ onBack, guildId }) => {
  return <WelcomeMessageConfig type="boost" onBack={onBack} guildId={guildId} />;
};

export default BoostMessages; 