import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { useTheme } from '../../contexts/ThemeContext';
import axios from "axios";
import { gsap } from "gsap";
import type { Channel as ChannelType } from '../channels/types';
import ImageConfig from './ImageConfig';

interface WelcomeMessageConfigProps {
  type: "join" | "leave" | "boost";
  onBack: () => void;
  guildId?: string;
}

const typeLabels = {
  join: "Join",
  leave: "Leave",
  boost: "Boost"
};

const WelcomeMessageConfig: React.FC<WelcomeMessageConfigProps> = ({ type, onBack, guildId }) => {
  const { isDarkMode } = useTheme();
  const [channels, setChannels] = useState<ChannelType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<ChannelType | null>(null);
  const [showImageConfig, setShowImageConfig] = useState(false);
  const channelListRef = useRef<HTMLDivElement>(null);

  // Fetch channels (simula guildId=1, reemplaza por prop si lo necesitas)
  useEffect(() => {
    const fetchChannels = async () => {
      try {
        setLoading(true);
        if (!guildId) {
          setError('No guild selected');
          setLoading(false);
          return;
        }
        const response = await axios.get(`http://localhost:3001/api/channels/${guildId}`);
        if (response.data.success) {
          setChannels(response.data.channels);
        } else {
          setError('Failed to fetch channels');
        }
      } catch (err) {
        setError('Could not connect to bot API. Make sure the bot is running.');
      } finally {
        setLoading(false);
      }
    };
    fetchChannels();
  }, [guildId]);

  // Animación de entrada de la lista de canales
  useEffect(() => {
    if (!selectedChannel && channelListRef.current) {
      gsap.fromTo(
        channelListRef.current,
        { opacity: 0, x: 60 },
        { opacity: 1, x: 0, duration: 0.7, ease: "power3.out" }
      );
    }
  }, [selectedChannel]);

  // Animación al seleccionar canal
  useEffect(() => {
    if (selectedChannel && !showImageConfig && channelListRef.current) {
      gsap.to(channelListRef.current, {
        opacity: 0,
        duration: 0.4,
        ease: "power2.inOut",
        onComplete: () => {
          setShowImageConfig(true);
        }
      });
    }
  }, [selectedChannel]);

  // Animación al volver a la lista de canales
  const handleBackToChannels = () => {
    if (channelListRef.current) {
      setShowImageConfig(false);
      setSelectedChannel(null);
      gsap.to(channelListRef.current, {
        opacity: 1,
        duration: 0.4,
        ease: "power2.out"
      });
    } else {
      setShowImageConfig(false);
      setSelectedChannel(null);
    }
  };

  // --- Agrupación y orden de canales ---
  const categories = channels.filter(c => c.type === 4).sort((a, b) => a.position - b.position);
  const channelsByCategory = (catId: string) => channels.filter(c => c.parentId === catId).sort((a, b) => a.position - b.position);
  const noCategoryChannels = channels.filter(c => c.type !== 4 && (!c.parentId || c.parentId === null)).sort((a, b) => a.position - b.position);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <p className={`text-xl ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Loading channels...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <p className={`text-xl text-center max-w-md ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>{error}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col items-start justify-start gap-8 px-2 py-8 md:py-0">
      {/* Botón volver y título */}
      <div className="flex items-center gap-4 z-20 mb-4">
        <button
          onClick={showImageConfig ? handleBackToChannels : onBack}
          className={`p-2 rounded-lg hover:bg-white/10 transition-colors ${isDarkMode ? 'text-white' : 'text-black'}`}
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className={`text-md font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>{typeLabels[type]} Messages Configuration</h1>
      </div>
      {/* Lista de canales o ImageConfig */}
      {!showImageConfig && (
        <div className="flex items-center justify-center w-full h-full">
          <div ref={channelListRef} className="w-full md:w-[380px] max-w-[400px] z-10 mx-auto">
            <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto pr-2">
              {/* Categorías y sus canales */}
              {categories.map(category => (
                <React.Fragment key={category.id}>
                  <div className="flex items-center gap-2 px-2 py-1 mt-2 mb-1">
                    <span className={`text-xs font-bold uppercase tracking-wide ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{category.name}</span>
                    <div className={`flex-1 h-px ml-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
                  </div>
                  {channelsByCategory(category.id).map(channel => (
                    <div
                      key={channel.id}
                      onClick={channel.type === 2 ? undefined : () => setSelectedChannel(channel)}
                      className={`rounded-2xl p-3 border-2 shadow-md transition-all duration-300 flex items-center gap-3 mx-2
                        ${isDarkMode
                          ? 'bg-gradient-to-br from-[#181c24] via-[#101010] to-[#23272f] border-[#23272f] hover:shadow-blue-900/30'
                          : 'bg-gradient-to-br from-white via-blue-50 to-blue-100 border-blue-100 hover:shadow-blue-300/30'
                        }
                        hover:scale-105 hover:border-blue-400
                        ${selectedChannel?.id === channel.id ? 'border-blue-500 ring-2 ring-blue-400' : ''}
                        ${channel.type === 2 ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                      style={{ minWidth: 180 }}
                    >
                      {channel.type === 2 ? (
                        <span className="mr-2"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 18v-1a3 3 0 0 1 3-3h0a3 3 0 0 1 3 3v1"/><circle cx="12" cy="7" r="4"/></svg></span>
                      ) : (
                        <span className="font-bold text-lg mr-2">#</span>
                      )}
                      <span className={`font-semibold text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{channel.name}</span>
                      <span className="ml-auto text-xs text-gray-500">{channel.type === 2 ? 'Voice' : 'Text'}</span>
                    </div>
                  ))}
                </React.Fragment>
              ))}
              {/* Canales sin categoría */}
              {noCategoryChannels.length > 0 && (
                <>
                  <div className="flex items-center gap-2 px-2 py-1 mt-2 mb-1">
                    <span className={`text-xs font-bold uppercase tracking-wide ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>No Category</span>
                    <div className={`flex-1 h-px ml-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
                  </div>
                  {noCategoryChannels.map(channel => (
                    <div
                      key={channel.id}
                      onClick={channel.type === 2 ? undefined : () => setSelectedChannel(channel)}
                      className={`rounded-2xl p-3 border-2 shadow-md transition-all duration-300 flex items-center gap-3 mx-2
                        ${isDarkMode
                          ? 'bg-gradient-to-br from-[#181c24] via-[#101010] to-[#23272f] border-[#23272f] hover:shadow-blue-900/30'
                          : 'bg-gradient-to-br from-white via-blue-50 to-blue-100 border-blue-100 hover:shadow-blue-300/30'
                        }
                        hover:scale-105 hover:border-blue-400
                        ${selectedChannel?.id === channel.id ? 'border-blue-500 ring-2 ring-blue-400' : ''}
                        ${channel.type === 2 ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                      style={{ minWidth: 180 }}
                    >
                      {channel.type === 2 ? (
                        <span className="mr-2"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 18v-1a3 3 0 0 1 3-3h0a3 3 0 0 1 3 3v1"/><circle cx="12" cy="7" r="4"/></svg></span>
                      ) : (
                        <span className="font-bold text-lg mr-2">#</span>
                      )}
                      <span className={`font-semibold text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{channel.name}</span>
                      <span className="ml-auto text-xs text-gray-500">{channel.type === 2 ? 'Voice' : 'Text'}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {/* ImageConfig para canal de texto */}
      {showImageConfig && selectedChannel && selectedChannel.type !== 2 && (
        <div className="w-full h-full z-20 animate-fade-in">
          <ImageConfig onBack={handleBackToChannels} selectedChannel={selectedChannel} />
        </div>
      )}
    </div>
  );
};

export default WelcomeMessageConfig; 