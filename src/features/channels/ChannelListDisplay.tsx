import React from 'react';
import { Hash, Folder, Mic } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export interface Channel {
  id: string;
  name: string;
  type: number;
  position: number;
  parent?: string | null;
  parentId?: string | null;
  guildName?: string;
}

interface ChannelListDisplayProps {
  channels: Channel[];
  onChannelClick?: (channel: Channel) => void;
  selectedChannelId?: string;
  height?: string | number;
}

const ChannelListDisplay: React.FC<ChannelListDisplayProps> = ({
  channels,
  onChannelClick,
  selectedChannelId,
  height = 520
}) => {
  const { isDarkMode } = useTheme();
  // Categorías ordenadas
  const categories = channels.filter(c => c.type === 4).sort((a, b) => a.position - b.position);
  // Canales sin categoría
  const noCategoryChannels = channels.filter(c => c.type !== 4 && (!c.parentId || c.parentId === null)).sort((a, b) => a.position - b.position);

  return (
    <div className={`flex flex-col items-center justify-center min-w-[340px] max-w-[380px] w-full rounded-2xl px-6 py-0`} style={{ height }}>
      <div className="w-full h-full overflow-y-auto pt-6 pb-6 pr-3">
        {categories.map(category => (
          <div key={category.id} className="mb-2 w-full">
            <div className={`flex items-center gap-2 justify-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <Folder size={14} />
              <span className="font-medium text-sm uppercase tracking-wide">{category.name}</span>
            </div>
            <div className="space-y-2 flex flex-col items-center w-full">
              {channels
                .filter(c => c.parentId === category.id)
                .sort((a, b) => a.position - b.position)
                .map(channel => (
                  <div
                    key={channel.id}
                    onClick={onChannelClick ? () => onChannelClick(channel) : undefined}
                    className={`rounded-lg p-3 border max-w-md w-full transition-colors cursor-pointer ${selectedChannelId === channel.id
                      ? 'border-blue-500 bg-blue-500/20'
                      : isDarkMode
                        ? 'bg-white/10 border-white/10 hover:bg-white/20'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                    {channel.type === 2 ? (
                      <Mic size={14} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                    ) : (
                      <Hash size={14} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                    )}
                      <span className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{channel.name}</span>
                      <span className="text-xs text-gray-500 ml-auto">#{channel.position}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
        {/* Canales sin categoría */}
        {noCategoryChannels.length > 0 && (
          <div className="mb-2 w-full">
            <div className={`flex items-center gap-2 justify-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <Folder size={14} />
              <span className="font-medium text-sm uppercase tracking-wide">No Category</span>
            </div>
            <div className="space-y-2 flex flex-col items-center w-full">
              {noCategoryChannels.map(channel => (
                <div
                  key={channel.id}
                  onClick={onChannelClick ? () => onChannelClick(channel) : undefined}
                  className={`rounded-lg p-3 border max-w-md w-full transition-colors cursor-pointer ${selectedChannelId === channel.id
                    ? 'border-blue-500 bg-blue-500/20'
                    : isDarkMode
                      ? 'bg-white/10 border-white/10 hover:bg-white/20'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {channel.type === 2 ? (
                      <Mic size={14} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                    ) : (
                    <Hash size={14} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                    )}
                    <span className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{channel.name}</span>
                    <span className="text-xs text-gray-500 ml-auto">#{channel.position}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChannelListDisplay; 