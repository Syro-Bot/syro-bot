import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, Image } from "lucide-react";
import axios from "axios";
import { gsap } from "gsap";
import { useTheme } from "../../contexts/ThemeContext";
import ImageConfig from '../welcome/ImageConfig';
import ChannelListDisplay from './ChannelListDisplay';
import type { Channel as ChannelType } from './ChannelListDisplay';

interface ChannelSelectorProps {
  onChannelSelect?: (channel: ChannelType) => void;
  selectedChannelId?: string;
  title?: string;
}

const ChannelSelector: React.FC<ChannelSelectorProps> = ({
  onChannelSelect,
  selectedChannelId,
  title = "Select Channel"
}) => {
  const { isDarkMode } = useTheme();
  const [channels, setChannels] = useState<ChannelType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<ChannelType | null>(null);
  const [showConfigOptions, setShowConfigOptions] = useState(false);
  const [showImageConfig, setShowImageConfig] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const channelListRef = useRef<HTMLDivElement>(null);
  const configOptionsRef = useRef<HTMLDivElement>(null);
  const imageConfigRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        setLoading(true);
        const response = await axios.get('http://localhost:3001/api/channels');

        if (response.data.success) {
          setChannels(response.data.channels);
        } else {
          setError('Failed to fetch channels');
        }
      } catch (err) {
        setError('Could not connect to bot API. Make sure the bot is running.');
        console.error('Error fetching channels:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchChannels();
  }, []);

  useEffect(() => {
    if (selectedChannel && !showConfigOptions) {
      animateToConfigOptions();
    }
  }, [selectedChannel]);

  useEffect(() => {
    if (showImageConfig && imageConfigRef.current) {
      // Animate image config in from the right
      gsap.to(imageConfigRef.current, {
        x: '0%',
        opacity: 1,
        duration: 0.6,
        ease: 'power2.inOut'
      });
    }
  }, [showImageConfig]);

  const handleChannelClick = (channel: ChannelType) => {
    setSelectedChannel(channel);
    if (onChannelSelect) {
      onChannelSelect(channel);
    }
  };

  const animateToConfigOptions = () => {
    if (!channelListRef.current || !configOptionsRef.current) return;
    gsap.set(configOptionsRef.current, { x: '-30%', opacity: 0 });
    gsap.to(channelListRef.current, {
      x: '-18%',
      duration: 0.6,
      ease: 'power2.inOut',
      onComplete: () => {
        setShowConfigOptions(true);
        gsap.to(configOptionsRef.current, {
          x: '0%',
          opacity: 1,
          duration: 0.6,
          ease: 'power2.inOut'
        });
      }
    });
  };

  const handleBackToChannels = () => {
    if (!channelListRef.current || !configOptionsRef.current) return;
    gsap.to(configOptionsRef.current, {
      x: '-30%',
      opacity: 0,
      duration: 0.6,
      ease: 'power2.inOut',
      onComplete: () => {
        setShowConfigOptions(false);
        setSelectedChannel(null);
        gsap.to(channelListRef.current, {
          x: '0%',
          duration: 0.6,
          ease: 'power2.inOut'
        });
      }
    });
  };

  const handleConfigOptionClick = (option: string) => {
    if (option === 'Images') {
      animateToImageConfig();
    } else {
      console.log(`Selected ${option} for channel:`, selectedChannel);
      // Aquí puedes agregar la lógica para manejar Messages
    }
  };

  const animateToImageConfig = () => {
    if (!configOptionsRef.current || !channelListRef.current) return;

    // Animate channel list to fade out (no movement)
    gsap.to(channelListRef.current, {
      opacity: 0,
      duration: 0.6,
      ease: 'power2.inOut'
    });

    // Animate config options to slide right and fade out
    gsap.to(configOptionsRef.current, {
      x: '100%',
      opacity: 0,
      duration: 0.6,
      ease: 'power2.inOut',
      onComplete: () => {
        setShowImageConfig(true);
      }
    });
  };

  const handleBackFromImageConfig = () => {
    setShowImageConfig(false);
    
    // Reset config options position and animate back in
    if (configOptionsRef.current && channelListRef.current) {
      // Reset channel list opacity and animate fade in
      gsap.set(channelListRef.current, { opacity: 0 });
      gsap.to(channelListRef.current, {
        opacity: 1,
        duration: 0.6,
        ease: 'power2.inOut'
      });

      // Reset config options position and animate slide in from left
      gsap.set(configOptionsRef.current, { x: '-100%', opacity: 0 });
      gsap.to(configOptionsRef.current, {
        x: '0%',
        opacity: 1,
        duration: 0.6,
        ease: 'power2.inOut',
        onComplete: () => {
          // Restaurar el estado showConfigOptions para que los cuadrados sean visibles
          setShowConfigOptions(true);
        }
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className={`text-xl ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Loading channels...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className={`text-xl text-center max-w-md ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>{error}</p>
      </div>
    );
  }

  // Si estamos en la configuración de imágenes, mostrar el componente ImageConfig
  if (showImageConfig) {
    return (
      <div ref={imageConfigRef} className="w-full h-full" style={{ transform: 'translateX(100%)', opacity: 0 }}>
        <ImageConfig 
          onBack={handleBackFromImageConfig}
          selectedChannel={selectedChannel}
        />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative overflow-hidden h-full flex items-center justify-center">
      {/* Channel List - centrado */}
      <div ref={channelListRef} className="flex flex-col items-center justify-center h-full w-full absolute left-0 right-0 mx-auto" style={{ zIndex: 10 }}>
        <h2 className={`text-lg font-semibold text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          {title} ({channels.length})
        </h2>
        <ChannelListDisplay
          channels={channels}
          onChannelClick={handleChannelClick}
          selectedChannelId={selectedChannelId}
          height={400}
        />
        {channels.length === 0 && (
          <p className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            No text channels found in this server.
          </p>
        )}
        {/* Selected Channel Info - En su posición original */}
        {selectedChannel && (
          <div className="text-center mt-2">
            <p className={`text-sm ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
              Selected: #{selectedChannel.name}
            </p>
          </div>
        )}
      </div>
      {/* Config Options - 2 cuadrados, aparecen a la derecha */}
      <div
        ref={configOptionsRef}
        className={`absolute top-0 right-0 h-full flex items-center justify-center ${showConfigOptions ? 'block' : 'hidden'}`}
        style={{ width: 'auto', minWidth: '350px', transform: 'translateX(-30%)', opacity: 0, zIndex: 20 }}
      >
        <div className="flex flex-col items-center justify-center gap-y-6 w-full">
          {/* Header con arrow y nombre del canal */}
          <div className="flex items-center gap-2 w-full mb-2">
            <button
              onClick={handleBackToChannels}
              className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-200 text-gray-900'}`}
              style={{ minWidth: 40 }}
              title="Volver"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            <span className={`text-lg font-semibold truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`} style={{ maxWidth: 220 }}>
              {selectedChannel?.name ? `#${selectedChannel.name}` : ''}
            </span>
          </div>
          {/* Dos cuadrados nuevos con el mismo diseño que WelcomeMessages */}
          <div className="flex gap-x-6 items-center justify-center">
            {[
              { label: 'Messages', icon: MessageSquare },
              { label: 'Images', icon: Image }
            ].map(({ label, icon: Icon }) => (
              <div
                key={label}
                onClick={() => handleConfigOptionClick(label)}
                className={`relative w-64 h-64 rounded-2xl flex items-center justify-center overflow-hidden cursor-pointer transition-all duration-200 ${isDarkMode
                  ? 'bg-white/10 dark:bg-black/20 hover:bg-white/20 dark:hover:bg-black/30'
                  : 'bg-white hover:bg-gray-50'
                }`}
              >
                <Icon className={`absolute inset-0 w-full h-full pointer-events-none ${isDarkMode ? 'opacity-5' : 'opacity-40'}`} style={{ color: '#c9daf8' }} />
                <span className="relative z-10 text-xl font-bold text-center drop-shadow bg-gradient-to-r from-blue-300 via-blue-400 to-blue-500 bg-clip-text text-transparent">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChannelSelector; 