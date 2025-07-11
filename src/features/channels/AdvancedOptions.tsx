import React from 'react';
import { Lock, Settings, Zap, X } from 'lucide-react';
import type { Role } from './types';

interface AdvancedOptionsProps {
  isDarkMode: boolean;
  type: string;
  roles: Role[];
  selectedRoles: string[];
  isPrivate: boolean;
  isNSFW: boolean;
  slowmode: number;
  showAdvanced: boolean;
  setShowAdvanced: (v: boolean) => void;
  setIsPrivate: (v: boolean) => void;
  setIsNSFW: (v: boolean) => void;
  setSlowmode: (v: number) => void;
  toggleRole: (roleId: string) => void;
  isCategory?: boolean;
  labelHoverClass?: string;
}

const AdvancedOptions: React.FC<AdvancedOptionsProps> = ({
  isDarkMode,
  type,
  roles,
  selectedRoles,
  isPrivate,
  isNSFW,
  slowmode,
  showAdvanced,
  setShowAdvanced,
  setIsPrivate,
  setIsNSFW,
  setSlowmode,
  toggleRole,
  isCategory = false,
  labelHoverClass = ''
}) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <h3 className={`text-lg font-semibold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
        <Zap className="w-5 h-5 text-blue-500" />
        Advanced Settings
      </h3>
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 ${showAdvanced
          ? 'bg-blue-500 text-white'
          : isDarkMode
            ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        {showAdvanced ? <X className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
        {showAdvanced ? 'Hide' : 'Show'} Advanced
      </button>
    </div>
    {showAdvanced && (
      <div className={`space-y-6 p-6 rounded-2xl ${
        isDarkMode 
          ? 'bg-gradient-to-r from-gray-800 to-gray-900 border border-gray-700' 
          : 'bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200'
      }`}>
        {/* Privacy Settings */}
        <div className="space-y-4">
          <h4 className={`font-semibold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            <Lock className="w-4 h-4 text-blue-500" />
            Privacy & Security
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all duration-200 ${labelHoverClass}`}>
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={e => setIsPrivate(e.target.checked)}
                className="w-4 h-4 text-blue-500 rounded focus:ring-blue-500"
              />
              <div>
                <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  Private {isCategory ? 'Category' : 'Channel'}
                </div>
                <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Only specific roles can see this {isCategory ? 'category and its channels' : 'channel'}
                </div>
              </div>
            </label>
            {!isCategory && (
              <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all duration-200 ${labelHoverClass}`}>
                <input
                  type="checkbox"
                  checked={isNSFW}
                  onChange={e => setIsNSFW(e.target.checked)}
                  className="w-4 h-4 text-blue-500 rounded focus:ring-blue-500"
                />
                <div>
                  <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                    NSFW Channel
                  </div>
                  <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Age-restricted content allowed
                  </div>
                </div>
              </label>
            )}
          </div>
        </div>
        {/* Slowmode (solo para canal de texto) */}
        {!isCategory && type === 'text' && (
          <div>
            <label className={`block mb-3 font-semibold text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Slowmode (seconds between messages)
            </label>
            <input
              type="number"
              min="0"
              max="21600"
              value={slowmode}
              onChange={e => setSlowmode(parseInt(e.target.value) || 0)}
              className={`w-full px-4 py-3 rounded-xl border transition-all duration-200 ${isDarkMode
                ? 'bg-gray-800 border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
              }`}
            />
          </div>
        )}
        {/* Role Permissions */}
        {isPrivate && (
          <div>
            <label className={`block mb-3 font-semibold text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Allowed Roles
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto">
              {roles.map(role => (
                <label
                  key={role.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200 ${labelHoverClass}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(role.id)}
                    onChange={() => toggleRole(role.id)}
                    className="w-4 h-4 text-blue-500 rounded focus:ring-blue-500"
                  />
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: role.color }}
                    />
                    <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                      {role.name}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    )}
  </div>
);

export default AdvancedOptions; 