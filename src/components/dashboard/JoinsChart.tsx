/**
 * @fileoverview Joins Chart Component
 *
 * Componente que muestra el gráfico de joins de los últimos 15 días.
 * Incluye carga de datos, actualización automática y adaptación a dark mode.
 *
 * @author Syro Frontend Team
 * @version 1.0.0
 * @since 2024
 */

import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTheme } from '../../contexts/ThemeContext';
import { useDashboardAPI } from '../../hooks/useSmartAPI';
import { RefreshCw } from 'lucide-react';

interface ChartDataPoint {
  date: string;
  joins: number;
}

interface JoinsChartProps {
  guildId?: string;
}

/**
 * Componente JoinsChart
 * Muestra el gráfico de joins de los últimos días.
 *
 * @component
 * @param {string} guildId - ID del servidor seleccionado
 */
const JoinsChart: React.FC<JoinsChartProps> = ({ guildId }) => {
  const { isDarkMode } = useTheme();
  
  // Use smart API hook for chart data - load once and cache well
  const { data: statsData, loading, error, refetch, lastUpdated } = useDashboardAPI<{ success: boolean; data: ChartDataPoint[]; totalJoins: number }>({
    url: guildId ? `/api/stats/joins?guildId=${guildId}` : '',
    enabled: !!guildId,
    onSuccess: (data: any) => {
      console.log(`📊 Estadísticas cargadas para guild ${guildId}: ${data.totalJoins} joins`);
    },
    onError: (error: Error) => {
      console.warn('⚠️ Error fetching stats:', error.message);
    }
  });

  const chartData = statsData?.data || [];
  const totalJoins = statsData?.totalJoins || 0;

  return (
    <div className={`w-[48rem] h-[23rem] backdrop-blur-sm rounded-2xl p-6 transition-colors duration-300 ${
      isDarkMode ? 'bg-[#181c24]' : 'bg-white'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-md font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent uppercase flex items-center gap-2 ml-12">
          <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
          <span className="text-left">ÚLTIMOS 15 DÍAS: {totalJoins} JOINS</span>
        </h2>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Última actualización: {lastUpdated.toLocaleTimeString('es-ES', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          )}
          <button
            onClick={() => refetch()}
            disabled={loading}
            className={`p-2 rounded-lg ${
              loading 
                ? 'opacity-50 cursor-not-allowed bg-gray-200 dark:bg-gray-700' 
                : 'bg-gradient-to-r from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 shadow-md hover:shadow-lg'
            }`}
            title="Actualizar estadísticas"
          >
            <RefreshCw 
              size={14} 
              className={`${loading ? 'animate-spin' : ''} text-white`} 
            />
          </button>
        </div>
      </div>
      
      {loading && (
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Cargando estadísticas...
            </p>
          </div>
        </div>
      )}
      
      {error && (
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <div className="text-red-500 mb-2">⚠️</div>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {error.message.includes('Rate limited') 
                ? 'Rate limit alcanzado. Reanudando en 2 minutos...'
                : 'Error cargando estadísticas'
              }
            </p>
            {!error.message.includes('Rate limited') && (
              <button
                onClick={() => {
                  refetch();
                }}
                className={`mt-2 px-3 py-1 text-xs rounded-md transition-colors duration-200 ${
                  isDarkMode 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                Reintentar
              </button>
            )}
          </div>
        </div>
      )}
      
      {!loading && !error && (
        <ResponsiveContainer width="100%" height="85%">
        <BarChart data={chartData}>
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
          </defs>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke={isDarkMode ? '#4B5563' : '#E5E7EB'} 
          />
          <XAxis 
            dataKey="date" 
            stroke={isDarkMode ? '#9CA3AF' : '#6B7280'}
            tickFormatter={(value) => new Date(value).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
          />
          <YAxis 
            stroke={isDarkMode ? '#9CA3AF' : '#6B7280'} 
            allowDecimals={false} 
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: isDarkMode ? '#374151' : '#FFFFFF', 
              border: 'none', 
              borderRadius: '8px',
              color: isDarkMode ? '#F9FAFB' : '#1F2937',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
            }}
            labelFormatter={(value) => new Date(value).toLocaleDateString('es-ES', { 
              day: '2-digit', 
              month: 'long', 
              year: 'numeric' 
            })}
          />
          <Bar 
            dataKey="joins" 
            fill="url(#barGradient)"
            radius={[8, 8, 0, 0]}
            barSize={32}
          />
        </BarChart>
      </ResponsiveContainer>
      )}
    </div>
  );
};

export default JoinsChart; 