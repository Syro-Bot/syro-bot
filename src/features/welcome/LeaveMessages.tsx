import React, { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useTheme } from '../../contexts/ThemeContext';
import ChannelSelector from '../channels/ChannelSelector';
import type { Channel as ChannelType } from '../channels/ChannelListDisplay';

interface LeaveMessagesProps {
  onBack: () => void;
}

interface Channel {
  id: string;
  name: string;
  type: number;
  position: number;
  parent: string | null;
  guildName: string;
}

const LeaveMessages: React.FC<LeaveMessagesProps> = ({ onBack }) => {
  const { isDarkMode } = useTheme();
  const [selectedChannel, setSelectedChannel] = useState<ChannelType | null>(null);

  const handleChannelSelect = (channel: ChannelType) => {
    setSelectedChannel(channel);
    console.log('Selected channel for Leave Messages:', channel);
    // La animación GSAP se maneja automáticamente en ChannelSelector
  };

  return (
    <div className="flex h-full w-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className={`p-2 rounded-lg hover:bg-white/10 transition-colors ${isDarkMode ? 'text-white' : 'text-black'
            }`}
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className={`text-md font-bold ${isDarkMode ? 'text-white' : 'text-black'
          }`}>
          Leave Messages Configuration
        </h1>
      </div>

            {/* Content */}
      <div className="flex-1 flex flex-col">
        <ChannelSelector 
          onChannelSelect={handleChannelSelect}
          selectedChannelId={selectedChannel?.id}
          title="Available Channels"
        />
      </div>
    </div>
  );
};

export default LeaveMessages; 