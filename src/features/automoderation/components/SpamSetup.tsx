import React from "react";
import type { SpamSetupProps } from "../types";
import AutoModRuleCard from "./AutoModRuleCard";

const SpamSetup: React.FC<SpamSetupProps> = ({ rules, isDarkMode }) => {
  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rules.map((rule) => (
          <AutoModRuleCard 
            key={rule.id} 
            rule={rule} 
            isDarkMode={isDarkMode}
            featureName="Spam"
          />
        ))}
      </div>
    </div>
  );
};

export default SpamSetup;
