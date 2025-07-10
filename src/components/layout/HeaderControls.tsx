/**
 * @fileoverview Header Controls Component
 *
 * Este componente provee los controles principales del header de la aplicación Syro.
 * Incluye título de sección, selector de servidor, cambio de tema, idioma, perfil y modales de acción.
 *
 * @author Syro Frontend Team
 * @version 1.0.0
 * @since 2024
 */

import React, { useState } from 'react';
import { Globe, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useTemplates } from '../../contexts/TemplateContext';
import { capitalizeFirst } from '../../utils';
import PendingTemplatesModal from '../shared/PendingTemplatesModal';

/**
 * Props para HeaderControls
 * @interface HeaderControlsProps
 * @property {string} activeSection - Sección activa del dashboard
 * @property {object} user - Usuario autenticado
 * @property {string} guildId - ID del servidor seleccionado
 * @property {function} onGuildChange - Callback para cambiar el servidor
 * @property {Array} availableGuilds - Lista de servidores disponibles
 */
interface HeaderControlsProps {
  activeSection: string;
  user?: any;
  guildId?: string;
  onGuildChange?: (guildId: string) => void;
  availableGuilds?: any[];
}

function formatSectionName(name: string) {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

/**
 * Componente de controles de header para Syro.
 * Muestra el título de la sección, selector de servidor, y acciones de usuario.
 *
 * @component
 * @param {HeaderControlsProps} props
 */
const HeaderControls: React.FC<HeaderControlsProps> = ({ activeSection, user, guildId, onGuildChange, availableGuilds }) => {
  const { isDarkMode, toggleTheme } = useTheme();
  const { pendingCount, submitTemplate } = useTemplates();
  const [showModal, setShowModal] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    tags: '',
    link: '',
    icon: null as File | null,
    iconUrl: '/eyes.png' 
  });
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showBotMissingModal, setShowBotMissingModal] = useState(false);
  const [selectedGuildWithoutBot, setSelectedGuildWithoutBot] = useState<any>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      // Subir la imagen al backend
      const formDataUpload = new FormData();
      formDataUpload.append('image', file);
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formDataUpload
        });
        if (res.ok) {
          const data = await res.json();
          setFormData(prev => ({ ...prev, icon: file, iconUrl: data.url }));
        } else {
          alert('Error subiendo la imagen');
        }
      } catch (err) {
        alert('Error subiendo la imagen');
      }
    }
  };

  const handleSubmitTemplate = async () => {
    // Validar que todos los campos estén completos
    if (!formData.name || !formData.tags || !formData.link) {
      alert('Por favor completa todos los campos');
      return;
    }

    // Validar que el link sea un template válido de Discord
    const templateRegex = /^https:\/\/(discord\.com\/template\/[a-zA-Z0-9]+|discord\.new\/[a-zA-Z0-9]+)/;
    if (!templateRegex.test(formData.link)) {
      alert('El link debe ser un template válido de Discord');
      return;
    }

    try {
      const result = await submitTemplate({
        name: formData.name,
        tags: formData.tags,
        link: formData.link,
        icon: formData.iconUrl
      });

      if (result.success) {
        alert('Template enviado para revisión');
        setShowModal(false);
        // Resetear el formulario
        setFormData({
          name: '',
          tags: '',
          link: '',
          icon: null,
          iconUrl: '/eyes.png'
        });
      } else {
        alert(result.error || 'Error al enviar el template');
      }
    } catch (error) {
      console.error('Error submitting template:', error);
      alert('Error al enviar el template');
    }
  };

  const handleGuildChange = async (newGuildId: string) => {
    if (onGuildChange) {
      // Verificar si el bot está en el servidor seleccionado
      try {
        const response = await fetch(`/api/guilds`);
        if (response.ok) {
          const data = await response.json();
          const botGuilds = data.guilds || [];
          const botIsInGuild = botGuilds.some((guild: any) => guild.id === newGuildId);

          if (!botIsInGuild) {
            // Bot no está en este servidor
            const selectedGuild = availableGuilds?.find(guild => guild.id === newGuildId);
            setSelectedGuildWithoutBot(selectedGuild);
            setShowBotMissingModal(true);
            return; // No cambiar el guildId
          }
        }
      } catch (error) {
        console.error('Error verificando si el bot está en el servidor:', error);
      }

      // Si el bot está presente, cambiar normalmente
      onGuildChange(newGuildId);
    }
  };

  const handleInviteBot = () => {
    if (selectedGuildWithoutBot) {
      window.open(`http://localhost:3002/invite/${selectedGuildWithoutBot.id}`, '_blank');
    }
    setShowBotMissingModal(false);
  };

  const handleSwitchToGuildWithBot = () => {
    // Buscar un servidor donde sí esté el bot
    if (availableGuilds && availableGuilds.length > 0) {
      fetch('/api/guilds')
        .then(res => res.json())
        .then(data => {
          const botGuilds = data.guilds || [];
          const guildWithBot = availableGuilds.find(guild =>
            botGuilds.some((botGuild: any) => botGuild.id === guild.id)
          );

          if (guildWithBot && onGuildChange) {
            onGuildChange(guildWithBot.id);
          }
        })
        .catch(error => {
          console.error('Error buscando servidor con bot:', error);
        });
    }
    setShowBotMissingModal(false);
  };

  return (
    <>
      <header className="flex items-center justify-between px-8 py-4 transition-colors duration-300 bg-transparent">
        <div className="flex items-center space-x-[1rem]">
          <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{formatSectionName(activeSection)}</div>

          {/* Selector de servidor */}
          {availableGuilds && availableGuilds.length > 1 && (
            <div className="flex items-center">
              <select
                value={guildId || ''}
                onChange={(e) => handleGuildChange(e.target.value)}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                  isDarkMode
                    ? 'bg-gray-800 text-white focus:ring-2 focus:ring-blue-500'
                    : 'bg-[#ecf0f9] text-gray-800 focus:ring-2 focus:ring-blue-500'
                }`}
              >
                {availableGuilds.map((guild: any) => (
                  <option key={guild.id} value={guild.id}>
                    {guild.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-4">
          {activeSection === 'templates' && (
            <>
              {/* Contador de pendientes */}
              {pendingCount > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowPendingModal(true)}
                    className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-blue-600 hover:bg-blue-600 transition-colors cursor-pointer"
                    title={`${pendingCount} template${pendingCount !== 1 ? 's' : ''} pendiente${pendingCount !== 1 ? 's' : ''}`}
                  >
                    {pendingCount}
                  </button>
                </div>
              )}
              <button
                onClick={() => setShowModal(true)}
                className="bg-gradient-to-r from-blue-500 to-blue-700 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow hover:from-blue-600 hover:to-blue-800 transition-all duration-200"
              >
                Upload Template
              </button>
            </>
          )}
          <button
            className={`relative w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-colors ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-800'}`}
            title="Language"
          >
            <Globe size={24} strokeWidth={2.75} />
          </button>
          <button
            onClick={toggleTheme}
            className={`relative w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-colors ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-800'}`}
            title={isDarkMode ? "Light Mode" : "Dark Mode"}
          >
            {isDarkMode ? <Sun size={24} strokeWidth={2.75} /> : <Moon size={24} strokeWidth={2.75} />}
          </button>
          {user ? (
            <div className="relative flex items-center gap-2 group">
              <button
                className={`flex items-center gap-2 focus:outline-none`}
                onClick={() => setShowUserMenu((prev) => !prev)}
                style={{ background: 'none', border: 'none', padding: 0 }}
              >
                <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{user.username}</span>
                <img
                  src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`}
                  alt={user.username}
                  className="w-8 h-8 rounded-full object-cover"
                />
              </button>
              {/* Menú desplegable */}
              {showUserMenu && (
                <div className={`absolute right-0 mt-10 w-40 bg-white dark:bg-[#181c24] rounded-lg shadow-lg z-50 border border-gray-200 dark:border-gray-700 animate-fadeIn`}>
                  <button
                    onClick={async () => {
                      await fetch('http://localhost:3002/logout', { method: 'POST', credentials: 'include' });
                      window.location.reload();
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg transition-colors"
                  >
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              className="relative w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden cursor-pointer"
              title="Profile"
            >
              <img
                src="/profile.jpg"
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover"
              />
            </button>
          )}
        </div>
      </header>
      {/* Modal para subir template */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className={`relative rounded-2xl shadow-2xl min-w-[500px] max-w-[600px] min-h-[420px] p-0 ${isDarkMode ? 'bg-[#181c24]' : 'bg-white'}`}>
            {/* Banner superior */}
            <div className={`relative w-full h-36 rounded-t-2xl ${isDarkMode ? 'bg-gradient-to-r from-blue-900 via-blue-700 to-blue-500' : 'bg-gradient-to-r from-blue-400 via-blue-300 to-blue-200'}`}>
              {/* Input file oculto */}
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="icon-upload"
              />
              {/* Imagen de perfil (clickeable) */}
              <label
                htmlFor="icon-upload"
                className="cursor-pointer"
              >
                <img
                  src={formData.iconUrl || "/eyes.jpg"}
                  alt="Template Icon"
                  className={`absolute -bottom-8 left-8 w-24 h-24 rounded-lg object-cover shadow-xl hover:opacity-80 transition-opacity`}
                  style={{ zIndex: 2 }}
                />
              </label>
            </div>
            {/* Contenido del modal */}
            <div className="pt-16 pb-8 px-8">
              {/* Inputs para nombre y tags */}
              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                    Template Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter template name"
                    className={`w-full p-2 border rounded-lg ${isDarkMode ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                  />
                </div>
                <div className="flex-1">
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                    Tags
                  </label>
                  <input
                    type="text"
                    name="tags"
                    value={formData.tags}
                    onChange={handleInputChange}
                    placeholder="gaming, community, music"
                    className={`w-full p-2 border rounded-lg ${isDarkMode ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                  />
                </div>
              </div>

              {/* Input para link */}
              <div className="mb-6">
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                  Template Link
                </label>
                <input
                  type="url"
                  name="link"
                  value={formData.link}
                  onChange={handleInputChange}
                  placeholder="https://discord.new/... o https://discord.com/template/..."
                  className={`w-full p-2 border rounded-lg ${isDarkMode ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                />
              </div>

              {/* Botones */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-500 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitTemplate}
                  className="flex-1 bg-blue-500 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                >
                  Upload Template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de templates pendientes */}
      <PendingTemplatesModal
        isOpen={showPendingModal}
        onClose={() => setShowPendingModal(false)}
      />

             {/* Modal para invitar bot o cambiar servidor */}
       {showBotMissingModal && selectedGuildWithoutBot && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
           <div className={`relative rounded-3xl shadow-2xl w-full max-w-md overflow-hidden ${isDarkMode ? 'bg-[#181c24]' : 'bg-white'}`}>
             {/* Header con gradiente */}
             <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
               <div className="flex items-center gap-3">
                 <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                   </svg>
                 </div>
                 <div>
                   <h3 className="text-xl font-bold">Bot no encontrado</h3>
                   <p className="text-blue-100 text-sm">Servidor: {selectedGuildWithoutBot.name}</p>
                 </div>
               </div>
             </div>

             {/* Contenido */}
             <div className="p-6">
               <p className={`text-sm leading-relaxed mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                 El bot de Syro no está presente en este servidor. Para acceder a todas las funciones del dashboard, necesitas invitar el bot primero.
               </p>

               {/* Botones */}
               <div className="space-y-3">
                 <button
                   onClick={handleInviteBot}
                   className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 px-4 rounded-xl font-semibold"
                 >
                   <div className="flex items-center justify-center gap-2">
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                     </svg>
                     Invitar Bot al Servidor
                   </div>
                 </button>

                 <button
                   onClick={handleSwitchToGuildWithBot}
                   className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-200 border-2 ${
                     isDarkMode
                       ? 'border-gray-600 text-gray-300 hover:border-blue-500 hover:text-blue-400'
                       : 'border-gray-300 text-gray-600 hover:border-blue-500 hover:text-blue-600'
                   }`}
                 >
                   <div className="flex items-center justify-center gap-2">
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                     </svg>
                     Cambiar a otro Servidor
                   </div>
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}
    </>
  );
};

export default HeaderControls; 