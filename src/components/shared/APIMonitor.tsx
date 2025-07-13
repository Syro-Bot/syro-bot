/**
 * API Monitor Component
 * 
 * Componente para monitorear el estado del sistema de peticiones API,
 * incluyendo cache, rate limits y estadísticas de rendimiento.
 * 
 * @author Syro Frontend Team
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { Activity, Database, Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import apiManager from '../../utils/apiManager';

interface APIMonitorProps {
  showDetails?: boolean;
}

const APIMonitor: React.FC<APIMonitorProps> = ({ showDetails = false }) => {
  const { isDarkMode } = useTheme();
  const [cacheStats, setCacheStats] = useState(apiManager.getCacheStats());
  const [queueStats, setQueueStats] = useState(apiManager.getQueueStats());
  const [isExpanded, setIsExpanded] = useState(showDetails);

  useEffect(() => {
    const updateStats = () => {
      setCacheStats(apiManager.getCacheStats());
      setQueueStats(apiManager.getQueueStats());
    };

    // Update stats every 5 seconds
    const interval = setInterval(updateStats, 5000);
    updateStats(); // Initial update

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    if (queueStats.activeRequests >= 3) return 'text-red-500';
    if (queueStats.queueLength > 5) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getStatusIcon = () => {
    if (queueStats.activeRequests >= 3) return <XCircle size={16} />;
    if (queueStats.queueLength > 5) return <AlertTriangle size={16} />;
    return <CheckCircle size={16} />;
  };

  return (
    <div className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ${
      isExpanded ? 'w-80' : 'w-auto'
    }`}>
      {/* Status Indicator */}
      <div 
        className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors duration-200 ${
          isDarkMode ? 'bg-gray-800/90 hover:bg-gray-700/90' : 'bg-white/90 hover:bg-gray-50/90'
        } shadow-lg backdrop-blur-sm`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className={`flex items-center gap-2 ${getStatusColor()}`}>
          {getStatusIcon()}
          <span className="text-sm font-medium">
            API Status
          </span>
        </div>
        
        {!isExpanded && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <span>{queueStats.activeRequests}</span>
            <span>/</span>
            <span>{queueStats.queueLength}</span>
          </div>
        )}
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className={`mt-2 p-4 rounded-lg transition-all duration-300 ${
          isDarkMode ? 'bg-gray-800/90' : 'bg-white/90'
        } shadow-lg backdrop-blur-sm`}>
          <h3 className="text-sm font-bold mb-3 text-gray-700 dark:text-gray-300">
            API Performance Monitor
          </h3>
          
          {/* Cache Stats */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database size={14} className="text-blue-500" />
                <span className="text-xs text-gray-600 dark:text-gray-400">Cache</span>
              </div>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {cacheStats.size} entries
              </span>
            </div>

            {/* Queue Stats */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity size={14} className="text-green-500" />
                <span className="text-xs text-gray-600 dark:text-gray-400">Active</span>
              </div>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {queueStats.activeRequests}/{queueStats.maxConcurrentRequests || 3}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-yellow-500" />
                <span className="text-xs text-gray-600 dark:text-gray-400">Queue</span>
              </div>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {queueStats.queueLength} pending
              </span>
            </div>

            {/* Performance Indicators */}
            <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-600 dark:text-gray-400">Performance</span>
                <span className={`text-xs font-medium ${
                  queueStats.activeRequests === 0 && queueStats.queueLength === 0 
                    ? 'text-green-500' 
                    : 'text-yellow-500'
                }`}>
                  {queueStats.activeRequests === 0 && queueStats.queueLength === 0 ? 'Optimal' : 'Busy'}
                </span>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1">
                <div 
                  className="bg-green-500 h-1 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${Math.min(100, (queueStats.activeRequests / 3) * 100)}%` 
                  }}
                />
              </div>
            </div>

            {/* Cache Details */}
            {cacheStats.entries.length > 0 && (
              <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                <span className="text-xs text-gray-600 dark:text-gray-400 mb-2 block">
                  Recent Cache Entries
                </span>
                <div className="space-y-1 max-h-20 overflow-y-auto">
                  {cacheStats.entries.slice(0, 3).map((entry, index) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 dark:text-gray-400 truncate max-w-32">
                        {entry.key.split('/').pop()}
                      </span>
                      <span className="text-gray-400 dark:text-gray-500">
                        {Math.round(entry.age / 1000)}s
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
            <button
              onClick={() => {
                apiManager.clearCache();
                setCacheStats(apiManager.getCacheStats());
              }}
              className="text-xs text-blue-500 hover:text-blue-600 transition-colors duration-200"
            >
              Clear Cache
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default APIMonitor; 