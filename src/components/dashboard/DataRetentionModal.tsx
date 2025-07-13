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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl transition-all duration-300 ${
        isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              isDarkMode ? 'bg-orange-500/20' : 'bg-orange-100'
            }`}>
              <Database className={`w-5 h-5 ${
                isDarkMode ? 'text-orange-400' : 'text-orange-600'
              }`} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Data Retention Settings</h2>
              <p className={`text-sm ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Configure data deletion policies when Syro leaves the server
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors duration-200 ${
              isDarkMode 
                ? 'hover:bg-gray-800 text-gray-400 hover:text-white' 
                : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
          ) : (
            <>
              {/* Warning Banner */}
              <div className={`p-4 rounded-lg border ${
                isDarkMode 
                  ? 'bg-orange-500/10 border-orange-500/30' 
                  : 'bg-orange-50 border-orange-200'
              }`}>
                <div className="flex items-start gap-3">
                  <AlertTriangle className={`w-5 h-5 mt-0.5 ${
                    isDarkMode ? 'text-orange-400' : 'text-orange-600'
                  }`} />
                  <div>
                    <h3 className="font-semibold mb-1">Important Notice</h3>
                    <p className={`text-sm ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      By default, Syro automatically deletes all server data 3 days after being removed from the server. 
                      These settings allow you to customize this behavior.
                    </p>
                  </div>
                </div>
              </div>

              {/* Immediate Deletion Toggle */}
              <div className={`p-4 rounded-lg border ${
                isDarkMode ? 'border-gray-700' : 'border-gray-200'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Trash2 className={`w-5 h-5 ${
                      isDarkMode ? 'text-red-400' : 'text-red-600'
                    }`} />
                    <div>
                      <h3 className="font-semibold">Immediate Data Deletion</h3>
                      <p className={`text-sm ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Delete all data immediately when Syro leaves the server
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
                    <p className={`text-sm ${
                      isDarkMode ? 'text-red-300' : 'text-red-700'
                    }`}>
                      ⚠️ <strong>Warning:</strong> This will permanently delete all server data immediately when Syro is removed. 
                      This action cannot be undone.
                    </p>
                  </div>
                )}
              </div>

              {/* Retention Period */}
              {!settings.immediateDeletion && (
                <div className={`p-4 rounded-lg border ${
                  isDarkMode ? 'border-gray-700' : 'border-gray-200'
                }`}>
                  <div className="flex items-center gap-3 mb-3">
                    <Clock className={`w-5 h-5 ${
                      isDarkMode ? 'text-blue-400' : 'text-blue-600'
                    }`} />
                    <div>
                      <h3 className="font-semibold">Data Retention Period</h3>
                      <p className={`text-sm ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        How long to keep data after Syro leaves the server
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="1"
                      max="7"
                      value={settings.retentionDays}
                      onChange={(e) => handleRetentionDaysChange(parseInt(e.target.value))}
                      className={`flex-1 h-2 rounded-lg appearance-none cursor-pointer ${
                        isDarkMode 
                          ? 'bg-gray-700 slider-orange' 
                          : 'bg-gray-200 slider-orange'
                      }`}
                    />
                    <span className={`font-semibold min-w-[3rem] text-center ${
                      isDarkMode ? 'text-blue-400' : 'text-blue-600'
                    }`}>
                      {settings.retentionDays} {settings.retentionDays === 1 ? 'day' : 'days'}
                    </span>
                  </div>
                </div>
              )}

              {/* Data Type Selection */}
              <div className={`p-4 rounded-lg border ${
                isDarkMode ? 'border-gray-700' : 'border-gray-200'
              }`}>
                <div className="flex items-center gap-3 mb-4">
                  <Shield className={`w-5 h-5 ${
                    isDarkMode ? 'text-green-400' : 'text-green-600'
                  }`} />
                  <h3 className="font-semibold">Data Types to Delete</h3>
                </div>
                
                <div className="space-y-3">
                  {[
                    { key: 'deleteLogs', label: 'Server Logs', description: 'Activity logs and audit trails' },
                    { key: 'deleteStats', label: 'Statistics', description: 'Member counts, join/leave data' },
                    { key: 'deleteConfig', label: 'Configuration', description: 'Bot settings and preferences' }
                  ].map(({ key, label, description }) => (
                    <label key={key} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings[key as keyof DataRetentionSettings] as boolean}
                        onChange={() => handleToggle(key as keyof DataRetentionSettings)}
                        className={`w-4 h-4 rounded ${
                          isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                        }`}
                      />
                      <div>
                        <span className="font-medium">{label}</span>
                        <p className={`text-sm ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          {description}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-end gap-3 p-6 border-t ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <button
            onClick={onClose}
            disabled={saving}
            className={`px-4 py-2 rounded-lg transition-colors duration-200 ${
              isDarkMode 
                ? 'text-gray-400 hover:text-white hover:bg-gray-800' 
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
              saving
                ? 'opacity-50 cursor-not-allowed bg-gray-500'
                : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg hover:shadow-xl'
            }`}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataRetentionModal; 