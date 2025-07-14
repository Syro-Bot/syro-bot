import React from "react";
import WelcomeMessageConfig from "./WelcomeMessageConfig";

interface JoinMessagesProps {
  onBack: () => void;
  guildId?: string;
}

const JoinMessages: React.FC<JoinMessagesProps> = ({ onBack, guildId }) => {
  return <WelcomeMessageConfig type="join" onBack={onBack} guildId={guildId} />;
};

export default JoinMessages; 