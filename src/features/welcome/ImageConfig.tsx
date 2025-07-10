import React, { useState, useRef } from 'react';
import { ArrowLeft, Upload, Download, Settings } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface ImageConfigProps {
  onBack: () => void;
  selectedChannel: {
    id: string;
    name: string;
  } | null;
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

  const [previewImage, setPreviewImage] = useState<string>('/eyes.png');
  const [previewBg, setPreviewBg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

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
    const channelId = selectedChannel.id;
    const configToSend = {
      ...config,
      backgroundImage: previewBg // base64 o null
    };
    const response = await fetch('http://localhost:3001/api/welcome-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channelId,
        config: configToSend
      })
    });
    if (response.ok) {
      alert('Configuración guardada correctamente');
    } else {
      alert('Error al guardar la configuración');
    }
  };

  const handleDownload = () => {
    // Aquí implementarías la lógica para descargar la imagen generada
    console.log('Downloading welcome image');
  };

  return (
    <div className="flex h-full w-full">
      {/* Panel de configuración */}
      <div className="w-1/3 p-6 border-r border-gray-200 dark:border-gray-700">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-200 text-gray-900'}`}
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Image Configuration
              </h2>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Configure #{selectedChannel?.name}
              </p>
            </div>
          </div>

          {/* Configuración de texto */}
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Welcome Text
              </label>
              <input
                type="text"
                value={config.welcomeText}
                onChange={(e) => handleConfigChange('welcomeText', e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                  isDarkMode 
                    ? 'bg-gray-800 border-gray-600 text-white focus:border-blue-500' 
                    : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                }`}
                placeholder="Welcome"
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
                className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                  isDarkMode 
                    ? 'bg-gray-800 border-gray-600 text-white focus:border-blue-500' 
                    : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                }`}
                placeholder="User"
              />
            </div>
          </div>

          {/* Configuración de colores */}
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Background Color
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={config.backgroundColor}
                  onChange={(e) => handleConfigChange('backgroundColor', e.target.value)}
                  className="w-12 h-10 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer"
                />
                <input
                  type="text"
                  value={config.backgroundColor}
                  onChange={(e) => handleConfigChange('backgroundColor', e.target.value)}
                  className={`flex-1 px-3 py-2 rounded-lg border transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-800 border-gray-600 text-white focus:border-blue-500' 
                      : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Text Color
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={config.textColor}
                  onChange={(e) => handleConfigChange('textColor', e.target.value)}
                  className="w-12 h-10 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer"
                />
                <input
                  type="text"
                  value={config.textColor}
                  onChange={(e) => handleConfigChange('textColor', e.target.value)}
                  className={`flex-1 px-3 py-2 rounded-lg border transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-800 border-gray-600 text-white focus:border-blue-500' 
                      : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Configuración de tamaños */}
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
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
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
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
            </div>
          </div>

          {/* Configuración de mencionar al usuario */}
          <div className="space-y-4">
          <div>
            <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <input
                type="checkbox"
                checked={config.mentionUser}
                onChange={e => setConfig(prev => ({ ...prev, mentionUser: e.target.checked }))}
                className="form-checkbox h-4 w-4 text-blue-600 transition duration-150"
              />
              Mention the user in the welcome
            </label>
            </div>

            {/* Configuración de mensaje personalizado (solo si mentionUser está activado) */}
            {config.mentionUser && (
              <div className="space-y-3 pl-6 border-l-2 border-gray-200 dark:border-gray-600">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Welcome Message Configuration
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value="{user}"
                      disabled
                      className={`w-20 px-3 py-2 rounded-lg border transition-colors ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-gray-400' 
                          : 'bg-gray-100 border-gray-300 text-gray-500'
                      }`}
                      placeholder="{user}"
                    />
                    <input
                      type="text"
                      value={config.customMessage || ''}
                      onChange={(e) => handleConfigChange('customMessage', e.target.value)}
                      className={`flex-1 px-3 py-2 rounded-lg border transition-colors ${
                        isDarkMode 
                          ? 'bg-gray-800 border-gray-600 text-white focus:border-blue-500' 
                          : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                      }`}
                      placeholder="Enter your custom message (optional)"
                    />
                  </div>
                  <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Leave empty to only mention the user, or add your custom message
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Botones de acción */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSave}
              className="flex-1 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:from-blue-500 hover:via-blue-600 hover:to-blue-700 transition-all duration-200"
            >
              Save Configuration
            </button>
            <button
              onClick={handleDownload}
              className="p-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              title="Download Image"
            >
              <Download size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Panel de preview */}
      <div className="flex-1 p-6">
        <div className="flex items-center justify-center h-full">
          <div className="space-y-6">
            <div className="text-center">
              <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Preview
              </h3>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                This is how your welcome image will look
              </p>
            </div>

            {/* Preview del mensaje de bienvenida */}
            <div 
              className="relative rounded-2xl overflow-hidden shadow-2xl"
              style={{ 
                backgroundColor: config.backgroundColor,
                backgroundImage: previewBg ? `url(${previewBg})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                width: '600px',
                height: '300px'
              }}
            >
              {/* Imagen de fondo */}
              <div className="absolute inset-0 flex items-center justify-center">
                <img
                  src={previewImage}
                  alt="Welcome"
                  className="rounded-full object-cover"
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
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed transition-colors ${
                  isDarkMode 
                    ? 'border-gray-600 text-gray-400 hover:border-blue-500 hover:text-blue-400' 
                    : 'border-gray-300 text-gray-600 hover:border-blue-500 hover:text-blue-600'
                }`}
              >
                <Upload size={20} />
                <span>Custom Background</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageConfig; 