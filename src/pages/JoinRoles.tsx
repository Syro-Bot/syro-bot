import React from "react";
import JoinRolesSetup from "../features/joinroles/JoinRolesSetup";

// Recibe guildId como prop desde el layout principal
interface JoinRolesProps {
  guildId?: string;
}
const JoinRoles: React.FC<JoinRolesProps> = ({ guildId }) => <JoinRolesSetup guildId={guildId} />;

export default JoinRoles; 