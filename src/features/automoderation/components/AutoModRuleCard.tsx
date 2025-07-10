import React, { useState, useEffect } from "react";
import type { AutoModRule, RaidTypeInfo } from "../types";
import { useAutoMod } from "../../../contexts/AutoModContext";
import { Users, Hash, Shield, ShieldCheck } from "lucide-react";

interface AutoModRuleCardProps {
  rule: AutoModRule;
  isDarkMode: boolean;
  featureName: string;
}

const AutoModRuleCard: React.FC<AutoModRuleCardProps> = ({ rule, isDarkMode, featureName }) => {
  const { updateRule } = useAutoMod();
  const [messageCount, setMessageCount] = useState(rule.messageCount || 3);
  const [timeWindow, setTimeWindow] = useState(rule.timeWindow || 5);
  const [joinCount, setJoinCount] = useState(rule.joinCount || 5);
  const [lockdownDuration, setLockdownDuration] = useState(rule.lockdownDuration || 10);
  const [channelCount, setChannelCount] = useState(rule.channelCount || 3);
  const [roleCount, setRoleCount] = useState(rule.roleCount || 3);

  // Actualizar cuando cambie la regla desde el contexto
  useEffect(() => {
    setMessageCount(rule.messageCount || 3);
    setTimeWindow(rule.timeWindow || 5);
    setJoinCount(rule.joinCount || 5);
    setLockdownDuration(rule.lockdownDuration || 10);
    setChannelCount(rule.channelCount || 3);
    setRoleCount(rule.roleCount || 3);
  }, [rule]);

  const handleMessageCountChange = async (value: number) => {
    setMessageCount(value);
    await updateRule(featureName, rule.id, { messageCount: value });
  };

  const handleTimeWindowChange = async (value: number) => {
    setTimeWindow(value);
    await updateRule(featureName, rule.id, { timeWindow: value });
  };

  const handleJoinCountChange = async (value: number) => {
    setJoinCount(value);
    await updateRule(featureName, rule.id, { joinCount: value });
  };

  const handleLockdownDurationChange = async (value: number) => {
    setLockdownDuration(value);
    await updateRule(featureName, rule.id, { lockdownDuration: value });
  };

  const handleChannelCountChange = async (value: number) => {
    setChannelCount(value);
    await updateRule(featureName, rule.id, { channelCount: value });
  };

  const handleRoleCountChange = async (value: number) => {
    setRoleCount(value);
    await updateRule(featureName, rule.id, { roleCount: value });
  };

  const sliderStyle = {
    WebkitAppearance: 'none' as const,
    appearance: 'none' as const,
    height: '8px',
    borderRadius: '4px',
    cursor: 'pointer',
  };

  const getRaidTypeInfo = (): RaidTypeInfo => {
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
  };

  const renderSpamControls = () => (
    <>
      {/* Número de mensajes */}
      <div>
        <label className={`block text-xs font-semibold mb-2 ${
          isDarkMode ? 'text-white/90' : 'text-gray-700'
        }`}>
          Mensajes: {messageCount}
        </label>
        <input
          type="range"
          min="1"
          max="10"
          value={messageCount}
          onChange={(e) => handleMessageCountChange(Number(e.target.value))}
          style={{
            ...sliderStyle,
            background: isDarkMode ? 'rgba(255,255,255,0.2)' : '#d1d5db',
          }}
          className="w-full"
        />
      </div>

      {/* Ventana de tiempo */}
      <div>
        <label className={`block text-xs font-semibold mb-2 ${
          isDarkMode ? 'text-white/90' : 'text-gray-700'
        }`}>
          Segundos: {timeWindow}
        </label>
        <input
          type="range"
          min="1"
          max="30"
          value={timeWindow}
          onChange={(e) => handleTimeWindowChange(Number(e.target.value))}
          style={{
            ...sliderStyle,
            background: isDarkMode ? 'rgba(255,255,255,0.2)' : '#d1d5db',
          }}
          className="w-full"
        />
      </div>

      {/* Resumen de la regla */}
      <div className={`text-xs p-2 rounded-md ${
        isDarkMode 
          ? 'bg-white/10 text-white/80' 
          : 'bg-gray-200/50 text-gray-600'
      }`}>
        Borrar mensajes después de <strong>{messageCount}</strong> mensajes en menos de <strong>{timeWindow}</strong> segundos
      </div>
    </>
  );

  const renderJoinRaidControls = () => (
    <>
      {/* Número de joins */}
      <div>
        <label className={`block text-xs font-semibold mb-2 ${
          isDarkMode ? 'text-white/90' : 'text-gray-700'
        }`}>
          Joins: {joinCount}
        </label>
        <input
          type="range"
          min="2"
          max="20"
          value={joinCount}
          onChange={(e) => handleJoinCountChange(Number(e.target.value))}
          style={{
            ...sliderStyle,
            background: isDarkMode ? 'rgba(255,255,255,0.2)' : '#d1d5db',
          }}
          className="w-full"
        />
      </div>

      {/* Ventana de tiempo */}
      <div>
        <label className={`block text-xs font-semibold mb-2 ${
          isDarkMode ? 'text-white/90' : 'text-gray-700'
        }`}>
          Segundos: {timeWindow}
        </label>
        <input
          type="range"
          min="5"
          max="60"
          value={timeWindow}
          onChange={(e) => handleTimeWindowChange(Number(e.target.value))}
          style={{
            ...sliderStyle,
            background: isDarkMode ? 'rgba(255,255,255,0.2)' : '#d1d5db',
          }}
          className="w-full"
        />
      </div>

      {/* Duración del lockdown */}
      <div>
        <label className={`block text-xs font-semibold mb-2 ${
          isDarkMode ? 'text-white/90' : 'text-gray-700'
        }`}>
          Lockdown (minutos): {lockdownDuration}
        </label>
        <input
          type="range"
          min="1"
          max="60"
          value={lockdownDuration}
          onChange={(e) => handleLockdownDurationChange(Number(e.target.value))}
          style={{
            ...sliderStyle,
            background: isDarkMode ? 'rgba(255,255,255,0.2)' : '#d1d5db',
          }}
          className="w-full"
        />
      </div>

      {/* Resumen de la regla */}
      <div className={`text-xs p-2 rounded-md ${
        isDarkMode 
          ? 'bg-white/10 text-white/80' 
          : 'bg-gray-200/50 text-gray-600'
      }`}>
        Activar lockdown después de <strong>{joinCount}</strong> joins en menos de <strong>{timeWindow}</strong> segundos por <strong>{lockdownDuration}</strong> minutos
      </div>
    </>
  );

  const renderChannelRaidControls = () => (
    <>
      {/* Número de canales */}
      <div>
        <label className={`block text-xs font-semibold mb-2 ${
          isDarkMode ? 'text-white/90' : 'text-gray-700'
        }`}>
          Canales: {channelCount}
        </label>
        <input
          type="range"
          min="1"
          max="10"
          value={channelCount}
          onChange={(e) => handleChannelCountChange(Number(e.target.value))}
          style={{
            ...sliderStyle,
            background: isDarkMode ? 'rgba(255,255,255,0.2)' : '#d1d5db',
          }}
          className="w-full"
        />
      </div>

      {/* Ventana de tiempo */}
      <div>
        <label className={`block text-xs font-semibold mb-2 ${
          isDarkMode ? 'text-white/90' : 'text-gray-700'
        }`}>
          Segundos: {timeWindow}
        </label>
        <input
          type="range"
          min="5"
          max="60"
          value={timeWindow}
          onChange={(e) => handleTimeWindowChange(Number(e.target.value))}
          style={{
            ...sliderStyle,
            background: isDarkMode ? 'rgba(255,255,255,0.2)' : '#d1d5db',
          }}
          className="w-full"
        />
      </div>

      {/* Duración del lockdown */}
      <div>
        <label className={`block text-xs font-semibold mb-2 ${
          isDarkMode ? 'text-white/90' : 'text-gray-700'
        }`}>
          Lockdown (minutos): {lockdownDuration}
        </label>
        <input
          type="range"
          min="1"
          max="60"
          value={lockdownDuration}
          onChange={(e) => handleLockdownDurationChange(Number(e.target.value))}
          style={{
            ...sliderStyle,
            background: isDarkMode ? 'rgba(255,255,255,0.2)' : '#d1d5db',
          }}
          className="w-full"
        />
      </div>

      {/* Resumen de la regla */}
      <div className={`text-xs p-2 rounded-md ${
        isDarkMode 
          ? 'bg-white/10 text-white/80' 
          : 'bg-gray-200/50 text-gray-600'
      }`}>
        Activar lockdown después de <strong>{channelCount}</strong> canales creados en menos de <strong>{timeWindow}</strong> segundos por <strong>{lockdownDuration}</strong> minutos
      </div>
    </>
  );

  const renderRoleRaidControls = () => (
    <>
      {/* Número de roles */}
      <div>
        <label className={`block text-xs font-semibold mb-2 ${
          isDarkMode ? 'text-white/90' : 'text-gray-700'
        }`}>
          Roles: {roleCount}
        </label>
        <input
          type="range"
          min="1"
          max="10"
          value={roleCount}
          onChange={(e) => handleRoleCountChange(Number(e.target.value))}
          style={{
            ...sliderStyle,
            background: isDarkMode ? 'rgba(255,255,255,0.2)' : '#d1d5db',
          }}
          className="w-full"
        />
      </div>

      {/* Ventana de tiempo */}
      <div>
        <label className={`block text-xs font-semibold mb-2 ${
          isDarkMode ? 'text-white/90' : 'text-gray-700'
        }`}>
          Segundos: {timeWindow}
        </label>
        <input
          type="range"
          min="5"
          max="60"
          value={timeWindow}
          onChange={(e) => handleTimeWindowChange(Number(e.target.value))}
          style={{
            ...sliderStyle,
            background: isDarkMode ? 'rgba(255,255,255,0.2)' : '#d1d5db',
          }}
          className="w-full"
        />
      </div>

      {/* Duración del lockdown */}
      <div>
        <label className={`block text-xs font-semibold mb-2 ${
          isDarkMode ? 'text-white/90' : 'text-gray-700'
        }`}>
          Lockdown (minutos): {lockdownDuration}
        </label>
        <input
          type="range"
          min="1"
          max="60"
          value={lockdownDuration}
          onChange={(e) => handleLockdownDurationChange(Number(e.target.value))}
          style={{
            ...sliderStyle,
            background: isDarkMode ? 'rgba(255,255,255,0.2)' : '#d1d5db',
          }}
          className="w-full"
        />
      </div>

      {/* Resumen de la regla */}
      <div className={`text-xs p-2 rounded-md ${
        isDarkMode 
          ? 'bg-white/10 text-white/80' 
          : 'bg-gray-200/50 text-gray-600'
      }`}>
        Activar lockdown después de <strong>{roleCount}</strong> roles creados en menos de <strong>{timeWindow}</strong> segundos por <strong>{lockdownDuration}</strong> minutos
      </div>
    </>
  );

  const renderRaidControls = () => {
    switch (rule.raidType) {
      case 'join':
        return renderJoinRaidControls();
      case 'channel':
        return renderChannelRaidControls();
      case 'role':
        return renderRoleRaidControls();
      default:
        return renderJoinRaidControls(); // Fallback
    }
  };

  const raidTypeInfo = getRaidTypeInfo();

  return (
    <div
      className={`rounded-xl p-4 border ${
        isDarkMode 
          ? 'bg-white/10 backdrop-blur-sm border-white/20' 
          : 'bg-gray-100/80 backdrop-blur-sm border-gray-200'
      }`}
    >
      <div className="flex items-center mb-2">
        <div className="mr-2">
          <raidTypeInfo.icon className="w-5 h-5 text-blue-500" />
        </div>
        <h3 className={`text-lg font-bold ${
          isDarkMode ? 'text-white' : 'text-gray-900'
        }`}>
          {raidTypeInfo.label}
        </h3>
      </div>
      <p className={`text-sm text-left mb-4 ${
        isDarkMode ? 'text-white/80' : 'text-gray-700'
      }`}>
        {rule.description}
      </p>
      
      {/* Configuración */}
      <div className="space-y-3">
        {featureName === "Raids" ? renderRaidControls() : renderSpamControls()}
      </div>
    </div>
  );
};

export default AutoModRuleCard; 