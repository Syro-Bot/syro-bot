/**
 * AutoModeration Rule Card Component
 * 
 * High-performance card component for displaying and editing automoderation rules.
 * Implements efficient state management, validation, and real-time updates.
 * Optimized for enterprise-scale Discord servers with complex rule configurations.
 * 
 * @author Syro Development Team
 * @version 2.0.0 - PERFORMANCE OPTIMIZED
 * @since 2024
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import type { AutoModRule, RaidTypeInfo } from "../types";
import { useAutoMod } from "../../../contexts/AutoModContext";
import { Users, Hash, Shield, ShieldCheck, Trash, AlertTriangle, CheckCircle } from "lucide-react";

interface AutoModRuleCardProps {
  rule: AutoModRule;
  isDarkMode: boolean;
  featureName: string;
}

/**
 * Performance-optimized AutoModeration rule card
 * Implements efficient re-renders, validation, and user feedback
 */
const AutoModRuleCard: React.FC<AutoModRuleCardProps> = React.memo(({ 
  rule, 
  isDarkMode, 
  featureName 
}) => {
  const { updateRule, deleteRule, validateRule } = useAutoMod();
  
  // Optimized state management with validation
  const [localState, setLocalState] = useState({
    messageCount: rule.messageCount || 3,
    timeWindow: rule.timeWindow || 5,
    joinCount: rule.joinCount || 5,
    lockdownDuration: rule.lockdownDuration || 10,
    channelCount: rule.channelCount || 3,
    roleCount: rule.roleCount || 3
  });
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Update local state when rule changes from context
  useEffect(() => {
    setLocalState({
      messageCount: rule.messageCount || 3,
      timeWindow: rule.timeWindow || 5,
      joinCount: rule.joinCount || 5,
      lockdownDuration: rule.lockdownDuration || 10,
      channelCount: rule.channelCount || 3,
      roleCount: rule.roleCount || 3
    });
  }, [rule]);

  // Memoized validation function
  const validateLocalState = useCallback(() => {
    const errors: string[] = [];
    
    // Feature-specific validation
    if (featureName === 'Spam') {
      if (localState.messageCount < 1 || localState.messageCount > 20) {
        errors.push('Message count must be between 1 and 20');
      }
      if (localState.timeWindow < 1 || localState.timeWindow > 60) {
        errors.push('Time window must be between 1 and 60 seconds');
      }
    } else if (featureName === 'Raids') {
      if (rule.raidType === 'join') {
        if (localState.joinCount < 2 || localState.joinCount > 50) {
          errors.push('Join count must be between 2 and 50');
        }
        if (localState.timeWindow < 5 || localState.timeWindow > 300) {
          errors.push('Time window must be between 5 and 300 seconds');
        }
        if (localState.lockdownDuration < 1 || localState.lockdownDuration > 1440) {
          errors.push('Lockdown duration must be between 1 and 1440 minutes');
        }
      }
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  }, [localState, featureName, rule.raidType]);

  // Optimized change handlers with debouncing
  const createChangeHandler = useCallback((field: keyof typeof localState) => {
    return async (value: number) => {
      setLocalState(prev => ({ ...prev, [field]: value }));
      
      // Validate immediately
      const isValid = validateLocalState();
      
      if (isValid) {
        setIsUpdating(true);
        try {
          await updateRule(featureName, rule.id, { [field]: value });
          setLastSaved(new Date());
        } catch (error) {
          console.error(`[AUTOMOD] Error updating ${field}:`, error);
        } finally {
          setIsUpdating(false);
        }
      }
    };
  }, [featureName, rule.id, updateRule, validateLocalState]);

  // Memoized change handlers
  const handleMessageCountChange = useMemo(() => 
    createChangeHandler('messageCount'), [createChangeHandler]);
  const handleTimeWindowChange = useMemo(() => 
    createChangeHandler('timeWindow'), [createChangeHandler]);
  const handleJoinCountChange = useMemo(() => 
    createChangeHandler('joinCount'), [createChangeHandler]);
  const handleLockdownDurationChange = useMemo(() => 
    createChangeHandler('lockdownDuration'), [createChangeHandler]);
  const handleChannelCountChange = useMemo(() => 
    createChangeHandler('channelCount'), [createChangeHandler]);
  const handleRoleCountChange = useMemo(() => 
    createChangeHandler('roleCount'), [createChangeHandler]);

  // Optimized delete handler
  const handleDelete = useCallback(async () => {
    if (window.confirm('Are you sure you want to delete this rule?')) {
      try {
        await deleteRule(featureName, rule.id);
      } catch (error) {
        console.error('[AUTOMOD] Error deleting rule:', error);
      }
    }
  }, [featureName, rule.id, deleteRule]);

  // Memoized slider styles for performance
  const sliderStyle = useMemo(() => ({
    WebkitAppearance: 'none' as const,
    appearance: 'none' as const,
    height: '8px',
    borderRadius: '4px',
    cursor: 'pointer',
  }), []);

  // Memoized raid type information
  const getRaidTypeInfo = useCallback((): RaidTypeInfo => {
    switch (rule.raidType) {
      case 'join':
        return { icon: Users, color: 'text-green-500', label: 'Join Raid' };
      case 'channel':
        return { icon: Hash, color: 'text-purple-500', label: 'Channel Raid' };
      case 'role':
        return { icon: Shield, color: 'text-orange-500', label: 'Role Raid' };
      default:
        return { icon: ShieldCheck, color: 'text-blue-500', label: 'Raid Protection' };
    }
  }, [rule.raidType]);

  // Memoized icon styling
  const getIconBgAndColor = useCallback(() => {
    if (featureName === 'Raids') {
      switch (rule.raidType) {
        case 'join':
          return {
            bg: isDarkMode ? 'bg-green-500/20' : 'bg-green-100',
            color: isDarkMode ? 'text-green-400' : 'text-green-600',
          };
        case 'channel':
          return {
            bg: isDarkMode ? 'bg-purple-500/20' : 'bg-purple-100',
            color: isDarkMode ? 'text-purple-400' : 'text-purple-600',
          };
        case 'role':
          return {
            bg: isDarkMode ? 'bg-orange-500/20' : 'bg-orange-100',
            color: isDarkMode ? 'text-orange-400' : 'text-orange-600',
          };
        default:
          return {
            bg: isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100',
            color: isDarkMode ? 'text-blue-400' : 'text-blue-600',
          };
      }
    } else {
      return {
        bg: isDarkMode ? 'bg-red-500/20' : 'bg-red-100',
        color: isDarkMode ? 'text-red-400' : 'text-red-600',
      };
    }
  }, [featureName, rule.raidType, isDarkMode]);

  const iconStyle = getIconBgAndColor();

  /**
   * Render spam detection controls with validation
   */
  const renderSpamControls = useCallback(() => (
    <>
      {/* Message count slider */}
      <div>
        <label className={`block text-xs font-semibold mb-2 ${
          isDarkMode ? 'text-white/90' : 'text-gray-700'
        }`}>
          Messages: {localState.messageCount}
          {validationErrors.includes('Message count must be between 1 and 20') && (
            <AlertTriangle className="inline w-3 h-3 ml-1 text-red-500" />
          )}
        </label>
        <input
          type="range"
          min="1"
          max="20"
          value={localState.messageCount}
          onChange={(e) => handleMessageCountChange(Number(e.target.value))}
          style={{
            ...sliderStyle,
            background: isDarkMode ? 'rgba(255,255,255,0.2)' : '#d1d5db',
          }}
          className="w-full"
          disabled={isUpdating}
        />
      </div>

      {/* Time window slider */}
      <div>
        <label className={`block text-xs font-semibold mb-2 ${
          isDarkMode ? 'text-white/90' : 'text-gray-700'
        }`}>
          Seconds: {localState.timeWindow}
          {validationErrors.includes('Time window must be between 1 and 60 seconds') && (
            <AlertTriangle className="inline w-3 h-3 ml-1 text-red-500" />
          )}
        </label>
        <input
          type="range"
          min="1"
          max="60"
          value={localState.timeWindow}
          onChange={(e) => handleTimeWindowChange(Number(e.target.value))}
          style={{
            ...sliderStyle,
            background: isDarkMode ? 'rgba(255,255,255,0.2)' : '#d1d5db',
          }}
          className="w-full"
          disabled={isUpdating}
        />
      </div>

      {/* Rule summary */}
      <div className={`text-xs p-2 rounded-md ${
        isDarkMode 
          ? 'bg-white/10 text-white/80' 
          : 'bg-gray-200/50 text-gray-600'
      }`}>
        Delete messages after <strong>{localState.messageCount}</strong> messages in less than <strong>{localState.timeWindow}</strong> seconds
      </div>
    </>
  ), [localState, isDarkMode, sliderStyle, handleMessageCountChange, handleTimeWindowChange, isUpdating, validationErrors]);

  /**
   * Render join raid controls with validation
   */
  const renderJoinRaidControls = useCallback(() => (
    <>
      {/* Join count slider */}
      <div>
        <label className={`block text-xs font-semibold mb-2 ${
          isDarkMode ? 'text-white/90' : 'text-gray-700'
        }`}>
          Joins: {localState.joinCount}
          {validationErrors.includes('Join count must be between 2 and 50') && (
            <AlertTriangle className="inline w-3 h-3 ml-1 text-red-500" />
          )}
        </label>
        <input
          type="range"
          min="2"
          max="50"
          value={localState.joinCount}
          onChange={(e) => handleJoinCountChange(Number(e.target.value))}
          style={{
            ...sliderStyle,
            background: isDarkMode ? 'rgba(255,255,255,0.2)' : '#d1d5db',
          }}
          className="w-full"
          disabled={isUpdating}
        />
      </div>

      {/* Time window slider */}
      <div>
        <label className={`block text-xs font-semibold mb-2 ${
          isDarkMode ? 'text-white/90' : 'text-gray-700'
        }`}>
          Seconds: {localState.timeWindow}
          {validationErrors.includes('Time window must be between 5 and 300 seconds') && (
            <AlertTriangle className="inline w-3 h-3 ml-1 text-red-500" />
          )}
        </label>
        <input
          type="range"
          min="5"
          max="300"
          value={localState.timeWindow}
          onChange={(e) => handleTimeWindowChange(Number(e.target.value))}
          style={{
            ...sliderStyle,
            background: isDarkMode ? 'rgba(255,255,255,0.2)' : '#d1d5db',
          }}
          className="w-full"
          disabled={isUpdating}
        />
      </div>

      {/* Lockdown duration slider */}
      <div>
        <label className={`block text-xs font-semibold mb-2 ${
          isDarkMode ? 'text-white/90' : 'text-gray-700'
        }`}>
          Lockdown (minutes): {localState.lockdownDuration}
          {validationErrors.includes('Lockdown duration must be between 1 and 1440 minutes') && (
            <AlertTriangle className="inline w-3 h-3 ml-1 text-red-500" />
          )}
        </label>
        <input
          type="range"
          min="1"
          max="1440"
          value={localState.lockdownDuration}
          onChange={(e) => handleLockdownDurationChange(Number(e.target.value))}
          style={{
            ...sliderStyle,
            background: isDarkMode ? 'rgba(255,255,255,0.2)' : '#d1d5db',
          }}
          className="w-full"
          disabled={isUpdating}
        />
      </div>

      {/* Rule summary */}
      <div className={`text-xs p-2 rounded-md ${
        isDarkMode 
          ? 'bg-white/10 text-white/80' 
          : 'bg-gray-200/50 text-gray-600'
      }`}>
        Activate lockdown after <strong>{localState.joinCount}</strong> joins in less than <strong>{localState.timeWindow}</strong> seconds for <strong>{localState.lockdownDuration}</strong> minutes
      </div>
    </>
  ), [localState, isDarkMode, sliderStyle, handleJoinCountChange, handleTimeWindowChange, handleLockdownDurationChange, isUpdating, validationErrors]);

  /**
   * Render channel raid controls
   */
  const renderChannelRaidControls = useCallback(() => (
    <>
      {/* Channel count slider */}
      <div>
        <label className={`block text-xs font-semibold mb-2 ${
          isDarkMode ? 'text-white/90' : 'text-gray-700'
        }`}>
          Channels: {localState.channelCount}
        </label>
        <input
          type="range"
          min="1"
          max="20"
          value={localState.channelCount}
          onChange={(e) => handleChannelCountChange(Number(e.target.value))}
          style={{
            ...sliderStyle,
            background: isDarkMode ? 'rgba(255,255,255,0.2)' : '#d1d5db',
          }}
          className="w-full"
          disabled={isUpdating}
        />
      </div>

      {/* Time window slider */}
      <div>
        <label className={`block text-xs font-semibold mb-2 ${
          isDarkMode ? 'text-white/90' : 'text-gray-700'
        }`}>
          Seconds: {localState.timeWindow}
        </label>
        <input
          type="range"
          min="5"
          max="300"
          value={localState.timeWindow}
          onChange={(e) => handleTimeWindowChange(Number(e.target.value))}
          style={{
            ...sliderStyle,
            background: isDarkMode ? 'rgba(255,255,255,0.2)' : '#d1d5db',
          }}
          className="w-full"
          disabled={isUpdating}
        />
      </div>

      {/* Lockdown duration slider */}
      <div>
        <label className={`block text-xs font-semibold mb-2 ${
          isDarkMode ? 'text-white/90' : 'text-gray-700'
        }`}>
          Lockdown (minutes): {localState.lockdownDuration}
        </label>
        <input
          type="range"
          min="1"
          max="1440"
          value={localState.lockdownDuration}
          onChange={(e) => handleLockdownDurationChange(Number(e.target.value))}
          style={{
            ...sliderStyle,
            background: isDarkMode ? 'rgba(255,255,255,0.2)' : '#d1d5db',
          }}
          className="w-full"
          disabled={isUpdating}
        />
      </div>

      {/* Rule summary */}
      <div className={`text-xs p-2 rounded-md ${
        isDarkMode 
          ? 'bg-white/10 text-white/80' 
          : 'bg-gray-200/50 text-gray-600'
      }`}>
        Activate lockdown after <strong>{localState.channelCount}</strong> channels created in less than <strong>{localState.timeWindow}</strong> seconds for <strong>{localState.lockdownDuration}</strong> minutes
      </div>
    </>
  ), [localState, isDarkMode, sliderStyle, handleChannelCountChange, handleTimeWindowChange, handleLockdownDurationChange, isUpdating]);

  /**
   * Render role raid controls
   */
  const renderRoleRaidControls = useCallback(() => (
    <>
      {/* Role count slider */}
      <div>
        <label className={`block text-xs font-semibold mb-2 ${
          isDarkMode ? 'text-white/90' : 'text-gray-700'
        }`}>
          Roles: {localState.roleCount}
        </label>
        <input
          type="range"
          min="1"
          max="20"
          value={localState.roleCount}
          onChange={(e) => handleRoleCountChange(Number(e.target.value))}
          style={{
            ...sliderStyle,
            background: isDarkMode ? 'rgba(255,255,255,0.2)' : '#d1d5db',
          }}
          className="w-full"
          disabled={isUpdating}
        />
      </div>

      {/* Time window slider */}
      <div>
        <label className={`block text-xs font-semibold mb-2 ${
          isDarkMode ? 'text-white/90' : 'text-gray-700'
        }`}>
          Seconds: {localState.timeWindow}
        </label>
        <input
          type="range"
          min="5"
          max="300"
          value={localState.timeWindow}
          onChange={(e) => handleTimeWindowChange(Number(e.target.value))}
          style={{
            ...sliderStyle,
            background: isDarkMode ? 'rgba(255,255,255,0.2)' : '#d1d5db',
          }}
          className="w-full"
          disabled={isUpdating}
        />
      </div>

      {/* Lockdown duration slider */}
      <div>
        <label className={`block text-xs font-semibold mb-2 ${
          isDarkMode ? 'text-white/90' : 'text-gray-700'
        }`}>
          Lockdown (minutes): {localState.lockdownDuration}
        </label>
        <input
          type="range"
          min="1"
          max="1440"
          value={localState.lockdownDuration}
          onChange={(e) => handleLockdownDurationChange(Number(e.target.value))}
          style={{
            ...sliderStyle,
            background: isDarkMode ? 'rgba(255,255,255,0.2)' : '#d1d5db',
          }}
          className="w-full"
          disabled={isUpdating}
        />
      </div>

      {/* Rule summary */}
      <div className={`text-xs p-2 rounded-md ${
        isDarkMode 
          ? 'bg-white/10 text-white/80' 
          : 'bg-gray-200/50 text-gray-600'
      }`}>
        Activate lockdown after <strong>{localState.roleCount}</strong> roles created in less than <strong>{localState.timeWindow}</strong> seconds for <strong>{localState.lockdownDuration}</strong> minutes
      </div>
    </>
  ), [localState, isDarkMode, sliderStyle, handleRoleCountChange, handleTimeWindowChange, handleLockdownDurationChange, isUpdating]);

  /**
   * Render raid controls based on raid type
   */
  const renderRaidControls = useCallback(() => {
    switch (rule.raidType) {
      case 'join':
        return renderJoinRaidControls();
      case 'channel':
        return renderChannelRaidControls();
      case 'role':
        return renderRoleRaidControls();
      default:
        return renderJoinRaidControls();
    }
  }, [rule.raidType, renderJoinRaidControls, renderChannelRaidControls, renderRoleRaidControls]);

  // Memoized raid type info
  const raidTypeInfo = useMemo(() => getRaidTypeInfo(), [getRaidTypeInfo]);

  return (
    <div className={`relative rounded-xl p-4 border-2 transition-all duration-200 ${
      isDarkMode 
        ? 'bg-gradient-to-br from-[#181c24] via-[#101010] to-[#23272f] border-[#23272f]' 
        : 'bg-gradient-to-br from-white via-gray-50 to-gray-100 border-gray-200'
    }`}>
      {/* Header with status indicators */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconStyle.bg}`}>
            <raidTypeInfo.icon className={`w-5 h-5 ${iconStyle.color}`} />
          </div>
          <div>
            <h3 className={`font-semibold text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {rule.title}
            </h3>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {raidTypeInfo.label}
            </p>
          </div>
        </div>
        
        {/* Status indicators */}
        <div className="flex items-center gap-2">
          {isUpdating && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
          )}
          {lastSaved && (
            <div title={`Last saved: ${lastSaved.toLocaleTimeString()}`}>
              <CheckCircle className="w-4 h-4 text-green-500" />
            </div>
          )}
          <button
            onClick={handleDelete}
            className="p-1 rounded-md hover:bg-red-500/20 transition-colors"
            title="Delete rule"
            disabled={isUpdating}
          >
            <Trash className="w-4 h-4 text-red-500" />
          </button>
        </div>
      </div>

      {/* Description */}
      {rule.description && (
        <p className={`text-xs mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          {rule.description}
        </p>
      )}

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <div className="mb-4 p-2 rounded-md bg-red-100 border border-red-300">
          {validationErrors.map((error, index) => (
            <div key={index} className="text-xs text-red-700 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {error}
            </div>
          ))}
        </div>
      )}

      {/* Controls based on feature type */}
      <div className="space-y-4">
        {featureName === 'Spam' && renderSpamControls()}
        {featureName === 'Raids' && renderRaidControls()}
      </div>
    </div>
  );
});

AutoModRuleCard.displayName = 'AutoModRuleCard';

export default AutoModRuleCard; 