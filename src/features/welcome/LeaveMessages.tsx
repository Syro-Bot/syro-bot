import React from "react";
import WelcomeMessageConfig from "./WelcomeMessageConfig";

interface LeaveMessagesProps {
  onBack: () => void;
  guildId?: string;
}

const LeaveMessages: React.FC<LeaveMessagesProps> = ({ onBack, guildId }) => {
  return <WelcomeMessageConfig type="leave" onBack={onBack} guildId={guildId} />;
};

export default LeaveMessages; 