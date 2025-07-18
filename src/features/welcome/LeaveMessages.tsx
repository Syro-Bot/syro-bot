import React from "react";
import WelcomeMessageConfig from "./WelcomeMessageConfig";

/**
 * Props for LeaveMessages component
 */
interface LeaveMessagesProps {
  onBack: () => void;
  guildId: string;
}

/**
 * LeaveMessages wrapper for WelcomeMessageConfig (type="leave")
 */
const LeaveMessages: React.FC<LeaveMessagesProps> = ({ onBack, guildId }) => {
  return <WelcomeMessageConfig type="leave" onBack={onBack} guildId={guildId} />;
};

export default LeaveMessages; 