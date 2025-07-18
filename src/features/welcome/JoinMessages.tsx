import React from "react";
import WelcomeMessageConfig from "./WelcomeMessageConfig";

/**
 * Props for JoinMessages component
 */
interface JoinMessagesProps {
  onBack: () => void;
  guildId: string;
}

/**
 * JoinMessages wrapper for WelcomeMessageConfig (type="join")
 */
const JoinMessages: React.FC<JoinMessagesProps> = ({ onBack, guildId }) => {
  return <WelcomeMessageConfig type="join" onBack={onBack} guildId={guildId} />;
};

export default JoinMessages; 