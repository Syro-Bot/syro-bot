/**
 * AutoModeration Setup Component
 * 
 * High-performance setup interface for configuring automoderation features.
 * Implements efficient rule management, validation, and real-time feedback.
 * Optimized for enterprise-scale Discord servers with complex configurations.
 * 
 * @author Syro Development Team
 * @version 2.0.0 - PERFORMANCE OPTIMIZED
 * @since 2024
 */

import React, { useCallback, useMemo } from "react";
import { useTheme } from '../../contexts/ThemeContext';
import { useAutoMod } from '../../contexts/AutoModContext';
import { useModal } from '../../contexts/ModalContext';
import type { AutoModerationSetupProps } from "./types";
import SpamSetup from "./components/SpamSetup";
import RaidSetup from "./components/RaidSetup";
import { AlertTriangle, CheckCircle, Loader2 } from "lucide-react";

/**
 * Performance-optimized AutoModeration setup component
 * Implements efficient rule management and validation
 */
const AutoModerationSetup: React.FC<AutoModerationSetupProps> = React.memo(({ 
  feature, 
  onBack, 
  onAdd 
}) => {
  const { isDarkMode } = useTheme();
  const { rules, addRule, isLoading, error, getRuleCount, validateRule } = useAutoMod();
  const { setShowRaidTypeModal, setRaidTypeModalProps } = useModal();

  // Memoized rule count for performance
  const currentRuleCount = useMemo(() => 
    getRuleCount(feature.name), [getRuleCount, feature.name]
  );

  // Check if feature is at rule limit
  const isAtLimit = useMemo(() => {
    const maxRules = feature.maxRules || 1;
    return currentRuleCount >= maxRules;
  }, [currentRuleCount, feature.maxRules]);

  // Memoized add rule handler with validation
  const handleAddRule = useCallback(async () => {
    // Allow configuration even if at limit (for editing existing rules)
    if (isAtLimit && currentRuleCount === 0) {
      console.warn(`[AUTOMOD] Cannot add more rules for ${feature.name} - limit reached`);
      return;
    }

    try {
      switch (feature.name) {
        case "Spam":
          // For spam, if there's already a rule, don't add another one
          if (currentRuleCount > 0) {
            console.log('[AUTOMOD] Spam rule already exists, allowing configuration');
            return; // Allow access to configuration but don't add new rule
          }
          
          const spamRule = {
            title: "Spam Protection",
            description: "Take actions when a user sends messages too fast",
            messageCount: 3,
            timeWindow: 5
          };
          
          if (validateRule(feature.name, spamRule)) {
            await addRule("Spam", spamRule);
          }
          break;

        case "Raids":
          // For raids, check if we can add more rules
          if (isAtLimit) {
            console.log('[AUTOMOD] Raid rules at limit, allowing configuration');
            return; // Allow access to configuration but don't add new rule
          }
          
          setRaidTypeModalProps({
            onSelectType: handleRaidTypeSelect,
            isDarkMode
          });
          setShowRaidTypeModal(true);
          break;

        default:
          if (onAdd) onAdd();
      }
    } catch (error) {
      console.error(`[AUTOMOD] Error adding rule for ${feature.name}:`, error);
    }
  }, [
    isAtLimit, 
    feature.name, 
    currentRuleCount, 
    addRule, 
    validateRule, 
    setRaidTypeModalProps, 
    setShowRaidTypeModal, 
    isDarkMode, 
    onAdd
  ]);

  // Memoized raid type selection handler
  const handleRaidTypeSelect = useCallback(async (raidType: 'join' | 'channel' | 'role') => {
    setShowRaidTypeModal(false);
    
    const raidConfigs = {
      join: {
        title: "Join Raid Protection",
        description: "Activate lockdown when too many users join quickly",
        joinCount: 5,
        timeWindow: 10,
        lockdownDuration: 10,
        raidType: 'join' as const
      },
      channel: {
        title: "Channel Raid Protection",
        description: "Activate lockdown when too many channels are created quickly",
        channelCount: 3,
        timeWindow: 15,
        lockdownDuration: 15,
        raidType: 'channel' as const
      },
      role: {
        title: "Role Raid Protection",
        description: "Activate lockdown when too many roles are created quickly",
        roleCount: 3,
        timeWindow: 15,
        lockdownDuration: 15,
        raidType: 'role' as const
      }
    };

    const config = raidConfigs[raidType];
    
    if (validateRule("Raids", config)) {
      await addRule("Raids", config);
    }
  }, [setShowRaidTypeModal, addRule, validateRule]);

  // Memoized setup content renderer
  const renderSetupContent = useCallback(() => {
    switch (feature.name) {
      case "Spam":
        return <SpamSetup rules={rules.Spam || []} isDarkMode={isDarkMode} />;
      case "Raids":
        return <RaidSetup rules={rules.Raids || []} isDarkMode={isDarkMode} />;
      default:
        return (
          <div className={`text-center py-8 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
            <p className="text-lg font-semibold mb-2">Configuration Not Available</p>
            <p className="text-sm opacity-75">
              Setup interface for {feature.name} is not yet implemented.
            </p>
          </div>
        );
    }
  }, [feature.name, rules, isDarkMode]);

  // Memoized status indicator
  const StatusIndicator = useMemo(() => {
    if (isLoading) {
      return (
        <div className="flex items-center gap-2 text-blue-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Saving...</span>
        </div>
      );
    }
    
    if (currentRuleCount > 0) {
      return (
        <div className="flex items-center gap-2 text-green-500">
          <CheckCircle className="w-4 h-4" />
          <span className="text-sm">{currentRuleCount} rule(s) active</span>
        </div>
      );
    }
    
    return null;
  }, [isLoading, currentRuleCount]);

  // Memoized error display
  const ErrorDisplay = useMemo(() => {
    if (!error) return null;
    
    return (
      <div className="mb-6 p-4 rounded-xl bg-red-100 border border-red-400 text-red-700">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-semibold">Configuration Error</span>
        </div>
        <p className="mt-1 text-sm">{error}</p>
      </div>
    );
  }, [error]);

  return (
    <>
      <div className="rounded-3xl p-8 flex flex-col items-center w-full max-w-6xl mx-auto">
        {/* Banner with gradient and controls */}
        <div className={`w-full rounded-3xl h-60 flex items-center justify-center mb-8 bg-gradient-to-r ${feature.gradient} relative`}>
          {/* Back button */}
          <button
            className="absolute top-4 left-6 px-3 py-1 text-xs font-bold uppercase rounded-md bg-white/30 text-white hover:bg-white/50 transition-colors"
            onClick={onBack}
            disabled={isLoading}
          >
            View all features
          </button>
          
          {/* Add button with status */}
          <div className="absolute top-4 right-6 flex items-center gap-2">
            {StatusIndicator}
            <button
              onClick={handleAddRule}
              disabled={isLoading}
              className={`px-3 py-1 text-xs font-bold uppercase rounded-md transition-colors ${
                isLoading
                  ? 'bg-white/20 text-white/50 cursor-not-allowed'
                  : 'bg-white/30 text-white hover:bg-white/50'
              }`}
              title={isAtLimit ? `Configure ${feature.name} (${currentRuleCount} rules active)` : `Add ${feature.name} rule`}
            >
              {isAtLimit ? 'Configure' : 'Add'}
            </button>
          </div>
          
          {/* Feature title */}
          <h2 className="text-[3.5rem] font-bold text-white text-center w-full flex justify-center items-center">
            {feature.description}
          </h2>
        </div>

        {/* Error display */}
        {ErrorDisplay}

        {/* Priority and limits info */}
        <div className="w-full mb-6">
          <div className={`p-4 rounded-xl ${
            isDarkMode 
              ? 'bg-white/5 border border-white/10' 
              : 'bg-gray-50 border border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-semibold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Configuration Status
              </span>
              <span className={`text-xs px-2 py-1 rounded-full ${
                feature.priority === 'critical' ? 'bg-red-100 text-red-700' :
                feature.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                feature.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-green-100 text-green-700'
              }`}>
                {feature.priority?.toUpperCase()} PRIORITY
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <span className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Active Rules:
                </span>
                <span className={`ml-2 font-semibold ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {currentRuleCount}/{feature.maxRules || 1}
                </span>
              </div>
              
              <div>
                <span className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Max Rules:
                </span>
                <span className={`ml-2 font-semibold ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {feature.maxRules || 1}
                </span>
              </div>
              
              <div>
                <span className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Status:
                </span>
                <span className={`ml-2 font-semibold ${
                  currentRuleCount > 0 ? 'text-green-500' : 'text-yellow-500'
                }`}>
                  {currentRuleCount > 0 ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Feature-specific content */}
        <div className="w-full">
          {renderSetupContent()}
        </div>
      </div>
    </>
  );
});

AutoModerationSetup.displayName = 'AutoModerationSetup';

export default AutoModerationSetup; 