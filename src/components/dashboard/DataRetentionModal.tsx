/**
 * Data Retention Modal Component
 * 
 * Professional modal for managing server data retention settings.
 * Allows administrators to control data deletion policies when the bot leaves the server.
 * 
 * @author Syro Frontend Team
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { X, Database, AlertTriangle, Shield, Clock, Trash2 } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface DataRetentionModalProps {
  guildId?: string;
  isOpen: boolean;
  onClose: () => void;
}

interface DataRetentionSettings {
  immediateDeletion: boolean;
  retentionDays: number;
  deleteLogs: boolean;
  deleteStats: boolean;
  deleteConfig: boolean;
}

const DataRetentionModal: React.FC<DataRetentionModalProps> = ({ guildId, isOpen, onClose }) => {
  const { isDarkMode } = useTheme();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<DataRetentionSettings>({
    immediateDeletion: false,
    retentionDays: 3,
    deleteLogs: true,
    deleteStats: true,
    deleteConfig: false
  });

  // Load current settings
  useEffect(() => {
    if (isOpen && guildId) {
      loadSettings();
    }
  }, [isOpen, guildId]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/guild/${guildId}/data-retention`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings || settings);
      }
    } catch (error) {
      console.error('Error loading data retention settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!guildId) return;
    
    setSaving(true);
    try {
      const response = await fetch(`/api/guild/${guildId}/data-retention`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ settings })
      });

      if (response.ok) {
        console.log('✅ Data retention settings saved successfully');
        onClose();
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving data retention settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (key: keyof DataRetentionSettings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleRetentionDaysChange = (days: number) => {
    setSettings(prev => ({
      ...prev,
      retentionDays: Math.max(1, Math.min(7, days))
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`relative rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border-2 ${
        isDarkMode 
          ? 'bg-gradient-to-br from-[#181c24] via-[#101010] to-[#23272f] border-[#23272f]' 
          : 'bg-gradient-to-br from-white via-orange-50 to-orange-100 border-orange-100'
      }`}>
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Data Retention</h3>
              <p className="text-orange-100 text-sm">Configure data deletion policies</p>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6">
          <p className={`text-sm leading-relaxed mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Configure how Syro handles your server data when it leaves. By default, all data is automatically deleted 3 days after removal.
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
          ) : (
            <>
              {/* Warning Banner */}
              <div className={`p-4 rounded-xl mb-6 ${
                isDarkMode 
                  ? 'bg-orange-500/10 border border-orange-500/20' 
                  : 'bg-orange-50 border border-orange-200'
              }`}>
                <div className="flex items-start gap-3">
                  <AlertTriangle className={`w-5 h-5 mt-0.5 ${
                    isDarkMode ? 'text-orange-400' : 'text-orange-600'
                  }`} />
                  <div>
                    <h4 className={`font-semibold mb-1 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                      Important Notice
                    </h4>
                    <p className={`text-sm ${isDarkMode ? 'text-orange-300' : 'text-orange-700'}`}>
                      By default, Syro automatically deletes all server data 3 days after being removed from the server. 
                      These settings allow you to customize this behavior.
                    </p>
                  </div>
                </div>
              </div>

              {/* Immediate Deletion Toggle */}
              <div className={`p-4 rounded-xl mb-6 ${
                isDarkMode ? 'bg-gray-800/50 border border-gray-600' : 'bg-gray-50 border border-gray-200'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Trash2 className={`w-5 h-5 ${
                      isDarkMode ? 'text-red-400' : 'text-red-600'
                    }`} />
                    <div>
                      <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Immediate Data Deletion
                      </h4>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Delete all data immediately when Syro leaves
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.immediateDeletion}
                      onChange={() => handleToggle('immediateDeletion')}
                      className="sr-only peer"
                    />
                    <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all ${
                      settings.immediateDeletion 
                        ? 'bg-red-600' 
                        : isDarkMode ? 'bg-gray-600' : 'bg-gray-300'
                    }`}></div>
                  </label>
                </div>
                
                {settings.immediateDeletion && (
                  <div className={`p-3 rounded-lg ${
                    isDarkMode ? 'bg-red-500/10' : 'bg-red-50'
                  }`}>
                    <p className={`text-sm ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>
                      ⚠️ <strong>Warning:</strong> This will permanently delete all server data immediately when Syro is removed. 
                      This action cannot be undone.
                    </p>
                  </div>
                )}
              </div>

              {/* Retention Period */}
              {!settings.immediateDeletion && (
                <div className={`p-4 rounded-xl mb-6 ${
                  isDarkMode ? 'bg-gray-800/50 border border-gray-600' : 'bg-gray-50 border border-gray-200'
                }`}>
                  <div className="flex items-center gap-3 mb-3">
                    <Clock className={`w-5 h-5 ${
                      isDarkMode ? 'text-blue-400' : 'text-blue-600'
                    }`} />
                    <div>
                      <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Data Retention Period
                      </h4>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        How long to keep data after Syro leaves
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handleRetentionDaysChange(settings.retentionDays - 1)}
                      disabled={settings.retentionDays <= 1}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                        settings.retentionDays <= 1
                          ? 'opacity-50 cursor-not-allowed bg-gray-300 dark:bg-gray-600'
                          : 'bg-orange-500 hover:bg-orange-600 text-white'
                      }`}
                    >
                      -
                    </button>
                    <span className={`text-lg font-semibold min-w-[3rem] text-center ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {settings.retentionDays}
                    </span>
                    <button
                      onClick={() => handleRetentionDaysChange(settings.retentionDays + 1)}
                      disabled={settings.retentionDays >= 7}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                        settings.retentionDays >= 7
                          ? 'opacity-50 cursor-not-allowed bg-gray-300 dark:bg-gray-600'
                          : 'bg-orange-500 hover:bg-orange-600 text-white'
                      }`}
                    >
                      +
                    </button>
                    <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      days
                    </span>
                  </div>
                </div>
              )}

              {/* Data Type Options */}
              <div className={`p-4 rounded-xl mb-6 ${
                isDarkMode ? 'bg-gray-800/50 border border-gray-600' : 'bg-gray-50 border border-gray-200'
              }`}>
                <div className="flex items-center gap-3 mb-4">
                  <Shield className={`w-5 h-5 ${
                    isDarkMode ? 'text-green-400' : 'text-green-600'
                  }`} />
                  <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Data Types to Delete
                  </h4>
                </div>
                
                <div className="space-y-3">
                  {[
                    { key: 'deleteLogs', label: 'Server Logs', description: 'Activity logs and audit trails' },
                    { key: 'deleteStats', label: 'Statistics', description: 'Member counts and usage statistics' },
                    { key: 'deleteConfig', label: 'Configuration', description: 'Bot settings and preferences' }
                  ].map(({ key, label, description }) => (
                    <div key={key} className="flex items-center justify-between">
                      <div>
                        <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {label}
                        </span>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {description}
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings[key as keyof DataRetentionSettings] as boolean}
                          onChange={() => handleToggle(key as keyof DataRetentionSettings)}
                          className="sr-only peer"
                        />
                        <div className={`w-10 h-5 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all ${
                          settings[key as keyof DataRetentionSettings] as boolean
                            ? 'bg-orange-600' 
                            : isDarkMode ? 'bg-gray-600' : 'bg-gray-300'
                        }`}></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          
          {/* Action buttons */}
          <div className="space-y-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-3 px-4 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center justify-center gap-2">
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Database className="w-5 h-5" />
                    Save Settings
                  </>
                )}
              </div>
            </button>
            <button
              onClick={onClose}
              className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-200 border-2 ${
                isDarkMode
                  ? 'border-gray-600 text-gray-300 hover:border-orange-500 hover:text-orange-400'
                  : 'border-gray-300 text-gray-600 hover:border-orange-500 hover:text-orange-600'
              }`}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataRetentionModal; 