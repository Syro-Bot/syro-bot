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

import React, { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTheme } from '../../contexts/ThemeContext';

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
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [totalJoins, setTotalJoins] = useState(0);

  // Función para cargar datos del gráfico
  const loadChartData = () => {
    if (!guildId) {
      console.log('⚠️ No hay guildId seleccionado, no cargando estadísticas');
      return;
    }
    
    fetch(`http://localhost:3001/api/stats/joins?guildId=${guildId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setChartData(data.data);
          setTotalJoins(data.totalJoins);
          console.log(`📊 Estadísticas cargadas para guild ${guildId}: ${data.totalJoins} joins`);
        }
      })
      .catch(error => {
        console.error('Error cargando estadísticas:', error);
        setChartData([]);
        setTotalJoins(0);
      });
  };

  // Cargar datos iniciales
  useEffect(() => {
    loadChartData();
  }, [guildId]);

  // Actualización automática cada 30 segundos
  useEffect(() => {
    const interval = setInterval(loadChartData, 30000); // 30 segundos
    return () => clearInterval(interval);
  }, [guildId]);

  return (
    <div className={`w-[48rem] h-[23rem] backdrop-blur-sm rounded-2xl p-6 transition-colors duration-300 ${
      isDarkMode ? 'bg-[#181c24]' : 'bg-white'
    }`}>
      <h2 className="text-md font-bold mb-4 bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent uppercase flex items-center gap-2 ml-12">
        <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
        <span className="text-left">ÚLTIMOS 15 DÍAS: {totalJoins} JOINS</span>
      </h2>
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
    </div>
  );
};

export default JoinsChart; 