import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import type { Channel as ChannelType } from './types';

interface ChannelListModernProps {
  channels: ChannelType[];
  onChannelClick?: (channel: ChannelType) => void;
  selectedChannelId?: string;
  height?: string | number;
}

const ChannelListModern: React.FC<ChannelListModernProps> = ({
  channels,
  onChannelClick,
  selectedChannelId,
  height = 420
}) => {
  const { isDarkMode } = useTheme();
  // Agrupación y orden
  const categories = channels.filter(c => c.type === 4).sort((a, b) => a.position - b.position);
  const channelsByCategory = (catId: string) => channels.filter(c => c.parentId === catId).sort((a, b) => a.position - b.position);
  const noCategoryChannels = channels.filter(c => c.type !== 4 && (!c.parentId || c.parentId === null)).sort((a, b) => a.position - b.position);

  return (
    <div
      className="flex flex-col items-center justify-center min-w-[340px] max-w-[400px] w-full rounded-2xl px-2 py-0"
      style={{ height }}
    >
      <div className="w-full h-full overflow-y-auto pt-4 pb-4 pr-1 flex flex-col gap-2">
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
                onClick={onChannelClick ? () => onChannelClick(channel) : undefined}
                className={`rounded-2xl p-3 border-2 shadow-md cursor-pointer transition-all duration-300 flex items-center gap-3 mx-2
                  ${isDarkMode
                    ? 'bg-gradient-to-br from-[#181c24] via-[#101010] to-[#23272f] border-[#23272f] hover:shadow-blue-900/30'
                    : 'bg-gradient-to-br from-white via-blue-50 to-blue-100 border-blue-100 hover:shadow-blue-300/30'
                  }
                  hover:scale-105 hover:border-blue-400
                  ${selectedChannelId === channel.id ? 'border-blue-500 ring-2 ring-blue-400' : ''}
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
                onClick={onChannelClick ? () => onChannelClick(channel) : undefined}
                className={`rounded-2xl p-3 border-2 shadow-md cursor-pointer transition-all duration-300 flex items-center gap-3 mx-2
                  ${isDarkMode
                    ? 'bg-gradient-to-br from-[#181c24] via-[#101010] to-[#23272f] border-[#23272f] hover:shadow-blue-900/30'
                    : 'bg-gradient-to-br from-white via-blue-50 to-blue-100 border-blue-100 hover:shadow-blue-300/30'
                  }
                  hover:scale-105 hover:border-blue-400
                  ${selectedChannelId === channel.id ? 'border-blue-500 ring-2 ring-blue-400' : ''}
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
  );
};

export default ChannelListModern; 