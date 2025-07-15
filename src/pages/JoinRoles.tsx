import React from "react";
import JoinRolesSetup from "../features/joinroles/JoinRolesSetup";

// Recibe guildId como prop desde el layout principal
const JoinRoles: React.FC<{ guildId?: string }> = ({ guildId }) => <JoinRolesSetup guildId={guildId} />;

export default JoinRoles; 