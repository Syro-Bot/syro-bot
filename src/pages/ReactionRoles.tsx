import React from "react";

interface ReactionRolesProps {
  guildId: string;
}

const ReactionRoles: React.FC<ReactionRolesProps> = ({ guildId }) => (
  <div className="text-xl font-semibold text-gray-700 dark:text-white">Reaction Roles page (guildId: {guildId})</div>
);
 
export default ReactionRoles; 