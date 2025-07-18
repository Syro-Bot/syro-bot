import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Upload, Download, Palette, Type, Image as ImageIcon, MessageSquare, Settings, Save } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { API_CONFIG } from '../../config/apiConfig';
const API_BASE_URL = API_CONFIG.BASE_URL;

/**
 * Type definition for a Discord channel (minimal for welcome config)
 */
interface Channel {
  id: string;
  name: string;
  type?: number;
}

interface ImageConfigProps {
  onBack: () => void;
  selectedChannel: Channel | null;
}

interface WelcomeImageConfig {
  welcomeText: string;
  userText: string;
  backgroundColor: string;
  textColor: string;
  fontSize: number;
  imageSize: number;
  mentionUser?: boolean;
  customMessage?: string;
}

const ImageConfig: React.FC<ImageConfigProps> = ({ onBack, selectedChannel }) => {
  const { isDarkMode } = useTheme();
  const [config, setConfig] = useState<WelcomeImageConfig>({
    welcomeText: 'Welcome',
    userText: '{user}',
    backgroundColor: '#1a1a1a',
    textColor: '#ffffff',
    fontSize: 24,
    imageSize: 120,
    mentionUser: true,
    customMessage: ''
  });
  const [saving, setSaving] = useState(false);

  // Cargar configuración guardada cuando el componente se monta
  useEffect(() => {
    const loadSavedConfig = async () => {
      if (!selectedChannel) return;
      
      console.log('🔄 Loading config for channel:', selectedChannel.id);
      
      try {
        const response = await fetch(`${API_BASE_URL}/api/welcome-config/${selectedChannel.id}`);
        console.log('�� Response status:', response.status);
        
        if (response.ok) {
          const savedConfig = await response.json();
          console.log('📦 Saved config received:', savedConfig);
          
          if (savedConfig.config) {
            console.log('✅ Setting config:', savedConfig.config);
            setConfig(prev => ({
              ...prev,
              ...savedConfig.config.config // Acceder al config anidado
            }));
            // También cargar la imagen de fondo si existe
            if (savedConfig.config.config.backgroundImage) {
              console.log('🖼️ Setting background image');
              setPreviewBg(savedConfig.config.config.backgroundImage);
            }
          } else {
            console.log('⚠️ No config found in response');
          }
        } else {
          console.log('❌ Response not ok:', response.status);
          const errorText = await response.text();
          console.log('❌ Error response:', errorText);
        }
      } catch (error) {
        console.error('💥 Error loading saved config:', error);
      }
    };

    loadSavedConfig();
  }, [selectedChannel]);

  const [previewBg, setPreviewBg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBgUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewBg(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConfigChange = (key: keyof WelcomeImageConfig, value: string | number) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!selectedChannel) return;
    setSaving(true);
    const channelId = selectedChannel.id;
    const configToSend = {
      ...config,
      backgroundImage: previewBg // base64 o null
    };
    const response = await fetch(`${API_BASE_URL}/api/welcome-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channelId,
        config: configToSend
      })
    });
    setSaving(false);
    if (response.ok) {
      alert('Configuration saved successfully');
    } else {
      alert('Error saving configuration');
    }
  };

  const handleDownload = () => {
    // Aquí implementarías la lógica para descargar la imagen generada
    console.log('Downloading welcome image');
  };

  return (
    <div className="flex flex-col md:flex-row h-full w-full items-center justify-center">
      {/* Panel de configuración */}
      <div className="w-full md:w-[500px] h-[calc(100vh-200px)] max-h-[700px] p-4 md:p-6 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="flex-1 overflow-y-auto space-y-4 w-full">
          {/* Header */}
          <div className="flex items-center gap-4 mb-2">
            <button
              onClick={onBack}
              className={`p-2 rounded-xl transition-all duration-200 ${
                isDarkMode 
                  ? 'bg-gradient-to-r from-gray-700/50 to-gray-800/50 hover:from-gray-600/50 hover:to-gray-700/50 text-white border border-gray-600/30' 
                  : 'bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-900 border border-gray-300'
              }`}
              aria-label="Go back"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className={`text-xl font-bold bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent flex items-center gap-2`}>
                <ImageIcon className="w-5 h-5" />
                Image Configuration
              </h2>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} ml-0`}>
                Configure #{selectedChannel?.name}
              </p>
            </div>
          </div>

          {/* Configuración de texto */}
          <div className={`rounded-2xl p-4 border-2 shadow-md transition-all duration-200 ${
            isDarkMode
              ? 'bg-gradient-to-br from-[#181c24] via-[#101010] to-[#23272f] border-[#23272f]'
              : 'bg-gradient-to-br from-white via-blue-50 to-blue-100 border-blue-100'
          }`}>
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'
              }`}>
                <Type className={`w-4 h-4 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
              </div>
              <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Text Configuration</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Welcome Text
                </label>
                <input
                  type="text"
                  value={config.welcomeText}
                  onChange={(e) => handleConfigChange('welcomeText', e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 ${
                    isDarkMode 
                      ? 'bg-gradient-to-r from-gray-800/50 to-gray-700/50 border-gray-600/50 text-white focus:border-blue-500/50 focus:shadow-blue-500/20' 
                      : 'bg-gradient-to-r from-white to-gray-50 border-gray-300 text-gray-900 focus:border-blue-500 focus:shadow-blue-500/20'
                  } focus:shadow-lg`}
                  placeholder="Welcome"
                  aria-label="Welcome text"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  User Text
                </label>
                <input
                  type="text"
                  value={config.userText}
                  onChange={(e) => handleConfigChange('userText', e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 ${
                    isDarkMode 
                      ? 'bg-gradient-to-r from-gray-800/50 to-gray-700/50 border-gray-600/50 text-white focus:border-blue-500/50 focus:shadow-blue-500/20' 
                      : 'bg-gradient-to-r from-white to-gray-50 border-gray-300 text-gray-900 focus:border-blue-500 focus:shadow-blue-500/20'
                  } focus:shadow-lg`}
                  placeholder="User"
                  aria-label="User text"
                />
              </div>
            </div>
          </div>

          {/* Configuración de colores */}
          <div className={`rounded-2xl p-4 border-2 shadow-md transition-all duration-200 ${
            isDarkMode
              ? 'bg-gradient-to-br from-[#181c24] via-[#101010] to-[#23272f] border-[#23272f]'
              : 'bg-gradient-to-br from-white via-purple-50 to-purple-100 border-purple-100'
          }`}>
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isDarkMode ? 'bg-purple-500/20' : 'bg-purple-100'
              }`}>
                <Palette className={`w-4 h-4 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} />
              </div>
              <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Color Configuration</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Background Color
                </label>
                <div className="flex gap-3">
                  <input
                    type="color"
                    value={config.backgroundColor}
                    onChange={(e) => handleConfigChange('backgroundColor', e.target.value)}
                    className="w-12 h-12 rounded-xl border-2 border-gray-300 dark:border-gray-600 cursor-pointer shadow-md"
                    aria-label="Background color"
                  />
                  <input
                    type="text"
                    value={config.backgroundColor}
                    onChange={(e) => handleConfigChange('backgroundColor', e.target.value)}
                    className={`flex-1 px-4 py-3 rounded-xl border-2 transition-all duration-200 ${
                      isDarkMode 
                        ? 'bg-gradient-to-r from-gray-800/50 to-gray-700/50 border-gray-600/50 text-white focus:border-purple-500/50 focus:shadow-purple-500/20' 
                        : 'bg-gradient-to-r from-white to-gray-50 border-gray-300 text-gray-900 focus:border-purple-500 focus:shadow-purple-500/20'
                    } focus:shadow-lg`}
                    aria-label="Background color hex"
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Text Color
                </label>
                <div className="flex gap-3">
                  <input
                    type="color"
                    value={config.textColor}
                    onChange={(e) => handleConfigChange('textColor', e.target.value)}
                    className="w-12 h-12 rounded-xl border-2 border-gray-300 dark:border-gray-600 cursor-pointer shadow-md"
                    aria-label="Text color"
                  />
                  <input
                    type="text"
                    value={config.textColor}
                    onChange={(e) => handleConfigChange('textColor', e.target.value)}
                    className={`flex-1 px-4 py-3 rounded-xl border-2 transition-all duration-200 ${
                      isDarkMode 
                        ? 'bg-gradient-to-r from-gray-800/50 to-gray-700/50 border-gray-600/50 text-white focus:border-purple-500/50 focus:shadow-purple-500/20' 
                        : 'bg-gradient-to-r from-white to-gray-50 border-gray-300 text-gray-900 focus:border-purple-500 focus:shadow-purple-500/20'
                    } focus:shadow-lg`}
                    aria-label="Text color hex"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Configuración de tamaños */}
          <div className={`rounded-2xl p-4 border-2 shadow-md transition-all duration-200 ${
            isDarkMode
              ? 'bg-gradient-to-br from-[#181c24] via-[#101010] to-[#23272f] border-[#23272f]'
              : 'bg-gradient-to-br from-white via-green-50 to-green-100 border-green-100'
          }`}>
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isDarkMode ? 'bg-green-500/20' : 'bg-green-100'
              }`}>
                <Settings className={`w-4 h-4 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
              </div>
              <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Size Configuration</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Font Size: {config.fontSize}px
                </label>
                <input
                  type="range"
                  min="12"
                  max="48"
                  value={config.fontSize}
                  onChange={(e) => handleConfigChange('fontSize', parseInt(e.target.value))}
                  className={`w-full h-3 rounded-lg appearance-none cursor-pointer transition-all duration-200 ${
                    isDarkMode 
                      ? 'bg-gradient-to-r from-gray-700 to-gray-600' 
                      : 'bg-gradient-to-r from-gray-200 to-gray-300'
                  }`}
                  style={{
                    background: isDarkMode 
                      ? 'linear-gradient(to right, #374151, #4B5563)' 
                      : 'linear-gradient(to right, #E5E7EB, #D1D5DB)'
                  }}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Image Size: {config.imageSize}px
                </label>
                <input
                  type="range"
                  min="60"
                  max="200"
                  value={config.imageSize}
                  onChange={(e) => handleConfigChange('imageSize', parseInt(e.target.value))}
                  className={`w-full h-3 rounded-lg appearance-none cursor-pointer transition-all duration-200 ${
                    isDarkMode 
                      ? 'bg-gradient-to-r from-gray-700 to-gray-600' 
                      : 'bg-gradient-to-r from-gray-200 to-gray-300'
                  }`}
                  style={{
                    background: isDarkMode 
                      ? 'linear-gradient(to right, #374151, #4B5563)' 
                      : 'linear-gradient(to right, #E5E7EB, #D1D5DB)'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Configuración de mencionar al usuario */}
          <div className={`rounded-2xl p-4 border-2 shadow-md transition-all duration-200 ${
            isDarkMode
              ? 'bg-gradient-to-br from-[#181c24] via-[#101010] to-[#23272f] border-[#23272f]'
              : 'bg-gradient-to-br from-white via-orange-50 to-orange-100 border-orange-100'
          }`}>
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isDarkMode ? 'bg-orange-500/20' : 'bg-orange-100'
              }`}>
                <MessageSquare className={`w-4 h-4 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`} />
              </div>
              <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Message Configuration</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className={`flex items-center gap-3 text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <input
                    type="checkbox"
                    checked={config.mentionUser}
                    onChange={e => setConfig(prev => ({ ...prev, mentionUser: e.target.checked }))}
                    className="form-checkbox h-4 w-4 text-blue-600 transition duration-150 rounded"
                  />
                  Mention the user in the welcome
                </label>
              </div>

              {/* Configuración de mensaje personalizado (solo si mentionUser está activado) */}
              {config.mentionUser && (
                <div className={`space-y-3 pl-6 border-l-2 ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Welcome Message Configuration
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value="{user}"
                        disabled
                        className={`w-24 px-4 py-3 rounded-xl border-2 transition-all duration-200 ${
                          isDarkMode 
                            ? 'bg-gradient-to-r from-gray-700/50 to-gray-600/50 border-gray-600/50 text-gray-400' 
                            : 'bg-gradient-to-r from-gray-100 to-gray-200 border-gray-300 text-gray-500'
                        }`}
                        placeholder="{user}"
                      />
                      <input
                        type="text"
                        value={config.customMessage || ''}
                        onChange={(e) => handleConfigChange('customMessage', e.target.value)}
                        className={`flex-1 px-4 py-3 rounded-xl border-2 transition-all duration-200 ${
                          isDarkMode 
                            ? 'bg-gradient-to-r from-gray-800/50 to-gray-700/50 border-gray-600/50 text-white focus:border-orange-500/50 focus:shadow-orange-500/20' 
                            : 'bg-gradient-to-r from-white to-gray-50 border-gray-300 text-gray-900 focus:border-orange-500 focus:shadow-orange-500/20'
                        } focus:shadow-lg`}
                        placeholder="Enter your custom message (optional)"
                      />
                    </div>
                    <p className={`text-xs mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Leave empty to only mention the user, or add your custom message
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
        
        {/* Botones fijos en la parte inferior */}
        <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleSave}
            className={`w-full mt-6 py-3 rounded-xl font-bold text-lg transition-all duration-200 shadow-md
              bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white
            `}
            aria-label="Save configuration"
            disabled={saving}
          >
            {saving ? (
              <span className="flex items-center justify-center"><Save className="inline-block w-5 h-5 mr-2 animate-spin" /> Saving...</span>
            ) : (
              <><Save className="inline-block w-5 h-5 mr-2" /> Save</>
            )}
          </button>
          <button
            onClick={handleDownload}
            className={`p-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center ${
              isDarkMode 
                ? 'bg-gradient-to-r from-gray-700/50 to-gray-800/50 hover:from-gray-600/50 hover:to-gray-700/50 text-gray-300 hover:text-white border border-gray-600/30' 
                : 'bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 hover:text-gray-900 border border-gray-300'
            }`}
            title="Download Image"
          >
            <Download size={20} />
          </button>
        </div>
      </div>

      {/* Panel de preview */}
      <div className="flex-1 min-w-0 p-6 md:p-10 flex items-center justify-center h-[calc(100vh-200px)] max-h-[700px]">
        <div className="w-full max-w-[600px] space-y-6 ml-auto mr-[12rem] mb-[4rem]">
                      <div className="text-center">
              <h3 className={`text-xl font-bold mb-2 bg-gradient-to-r from-indigo-400 to-indigo-600 bg-clip-text text-transparent flex items-center justify-center gap-2 w-full`}> 
                <ImageIcon className="w-5 h-5" />
                Preview
              </h3>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}> 
              This is how your welcome image will look
            </p>
          </div>
          {/* Preview del mensaje de bienvenida */}
          <div 
            className="relative rounded-2xl overflow-hidden shadow-2xl mx-auto border-2 border-gray-200 dark:border-gray-700"
            style={{ 
              backgroundColor: config.backgroundColor,
              backgroundImage: previewBg ? `url(${previewBg})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              width: '100%',
              maxWidth: 520,
              height: 280
            }}
          >
            {/* Imagen de fondo */}
            <div className="absolute inset-0 flex items-center justify-center">
              <img
                src="/eyes.png" // Assuming a default image for preview
                alt="Welcome"
                className="rounded-full object-cover shadow-lg"
                style={{ 
                  width: `${config.imageSize}px`, 
                  height: `${config.imageSize}px` 
                }}
              />
            </div>
            {/* Texto de bienvenida */}
            <div className="absolute top-4 left-0 right-0 text-center">
              <span 
                className="font-bold"
                style={{ 
                  color: config.textColor,
                  fontSize: `${config.fontSize}px`
                }}
              >
                {config.welcomeText}
              </span>
            </div>
            {/* Texto del usuario */}
            <div className="absolute bottom-4 left-0 right-0 text-center">
              <span 
                className="font-medium"
                style={{ 
                  color: config.textColor,
                  fontSize: `${config.fontSize * 0.8}px`
                }}
              >
                {config.userText}
              </span>
            </div>
          </div>
          {/* Upload de imagen */}
          <div className="text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleBgUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`inline-flex items-center gap-3 px-6 py-3 rounded-xl border-2 border-dashed transition-all duration-200 shadow-lg hover:shadow-xl ${
                isDarkMode 
                  ? 'border-gray-600/50 text-gray-400 hover:border-blue-500/50 hover:text-blue-400 bg-gradient-to-r from-gray-800/50 to-gray-700/50 hover:from-gray-700/50 hover:to-gray-600/50' 
                  : 'border-gray-300 text-gray-600 hover:border-blue-500 hover:text-blue-600 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200'
              }`}
            >
              <Upload size={20} />
              <span className="font-medium">Custom Background</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageConfig; 