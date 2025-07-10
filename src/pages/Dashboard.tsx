/**
 * @fileoverview Dashboard Page
 *
 * Página principal del dashboard de Syro. Muestra la bienvenida y el gráfico de joins.
 * Incluye animaciones, carga de datos y adaptación a dark mode.
 *
 * @author Syro Frontend Team
 * @version 1.0.0
 * @since 2024
 */

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTheme } from '../contexts/ThemeContext';

interface ChartDataPoint {
  date: string;
  joins: number;
}

/**
 * Componente Dashboard
 * Muestra la bienvenida y el gráfico de joins de los últimos días.
 *
 * @component
 * @param {object} user - Usuario autenticado
 * @param {string} guildId - ID del servidor seleccionado
 */
const Dashboard: React.FC<{ user: any; guildId?: string }> = ({ user, guildId }) => {
  const { isDarkMode } = useTheme();
  const textRef = useRef<HTMLDivElement>(null);
  const [showChart, setShowChart] = useState(false);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [totalJoins, setTotalJoins] = useState(0);

  useEffect(() => {
    document.title = "Syro - Dashboard";
    if (textRef.current) {
      // Estado inicial: perfectamente centrado en pantalla
      gsap.set(textRef.current, { opacity: 0, scale: 0.8, xPercent: -50, yPercent: -50, left: '55%', top: '50%', position: 'fixed' });
      // Fade in y scale up centrado
      gsap.to(textRef.current, { opacity: 1, scale: 1, duration: 0.5, ease: "power2.out" });
      // Luego de 0.8s, desplazar solo un poco hacia arriba y a la izquierda y achicar
      gsap.to(textRef.current, {
        delay: 0.8,
        duration: 0.7,
        left: '6rem',
        top: '6rem',
        xPercent: 0,
        yPercent: 0,
        scale: 0.4,
        ease: "power3.inOut"
      });
    }
  }, [user]);

  // Mostrar gráfico después de la animación
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowChart(true);
      loadChartData();
    }, 2000); // 2 segundos después de que termine la animación

    return () => clearTimeout(timer);
  }, [guildId]); // Recargar cuando cambie el guildId

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

  // Actualización automática cada 30 segundos
  useEffect(() => {
    if (showChart) {
      const interval = setInterval(loadChartData, 30000); // 30 segundos
      return () => clearInterval(interval);
    }
  }, [showChart]);

  return (
    <div className="relative h-screen w-full">
      <div ref={textRef} className="z-10">
        <h1 className="text-7xl font-extrabold bg-gradient-to-r from-blue-400 via-blue-600 to-blue-900 bg-clip-text text-transparent uppercase leading-none text-center">
          Welcome {user?.username?.toUpperCase()}
        </h1>
      </div>
      
      {/* Gráfico de estadísticas */}
      {showChart && (
        <div className="absolute top-16 left-6 z-0">
          <div className={`w-[50rem] h-[25rem] backdrop-blur-sm rounded-2xl p-6 transition-colors duration-300 ${
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
        </div>
      )}
    </div>
  );
};
 
export default Dashboard; 