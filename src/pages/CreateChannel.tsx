import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import axios from 'axios';
import ChannelListModern from '../features/channels/ChannelListModern';
import ChannelForm from '../features/channels/ChannelForm';
import CategoryForm from '../features/channels/CategoryForm';
import type { Channel } from '../features/channels/types';
import { Hash } from 'lucide-react';

interface CreateChannelProps {
  guildId?: string;
}

const CreateChannel: React.FC<CreateChannelProps> = ({ guildId }) => {
  const { isDarkMode } = useTheme();
  const [mode, setMode] = useState<'channel' | 'category'>('channel');
  const [name, setName] = useState('');
  const [type, setType] = useState('text');
  const [categoryId, setCategoryId] = useState<string>('');
  const [catName, setCatName] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);

  // Advanced
  const [isPrivate, setIsPrivate] = useState(false);
  const [isNSFW, setIsNSFW] = useState(false);
  const [slowmode, setSlowmode] = useState(0);
  const [userLimit, setUserLimit] = useState(0);
  const [topic, setTopic] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Fetch channels
  const fetchData = async () => {
    if (!guildId) {
      setError('No guild selected');
      return;
    }
    try {
      const response = await axios.get(`http://localhost:3001/api/channels/${guildId}`);
      if (response.data.success) {
        setChannels(response.data.channels);
      } else {
        setError('Could not fetch channels');
      }
    } catch (err) {
      setError('Could not connect to bot API.');
    }
  };

  useEffect(() => {
    fetchData();
  }, [guildId]);

  // Get sorted categories
  const categories = channels.filter(c => c.type === 4).sort((a, b) => a.position - b.position);

  // Reset form
  const resetForm = () => { setName(''); setCatName(''); setType('text'); setCategoryId(''); setIsPrivate(false); setIsNSFW(false); setSlowmode(0); setUserLimit(0); setTopic(''); setSelectedRoles([]); setShowAdvanced(false); };

  // Toggle role
  const toggleRole = (roleId: string) => {
    setSelectedRoles(prev =>
      prev.includes(roleId)
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    );
  };

  // Submit handlers
  const handleChannelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guildId) {
      setError('No guild selected');
      return;
    }
    setLoading(true);
    setSuccess(null);
    setError(null);
    try {
      const response = await axios.post('http://localhost:3001/api/channels', {
        name,
        type,
        parentId: categoryId || null,
        guildId: guildId
      });
      if (response.data.success) {
        setSuccess('Channel created successfully');
        resetForm();
        fetchData();
      } else {
        setError(response.data.error || 'Error creating channel');
      }
    } catch (e: any) {
      setError('Error creating channel');
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guildId) {
      setError('No guild selected');
      return;
    }
    setLoading(true);
    setSuccess(null);
    setError(null);
    try {
      const response = await axios.post('http://localhost:3001/api/channels', {
        name: catName,
        type: 'category',
        guildId: guildId
      });
      if (response.data.success) {
        setSuccess('Category created successfully');
        resetForm();
        fetchData();
      } else {
        setError(response.data.error || 'Error creating category');
      }
    } catch (e: any) {
      setError('Error creating category');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[90rem] mx-auto py-6 transition-colors duration-300">
      {/* Banner Header */}
      <div className="bg-gradient-to-r from-blue-400 via-blue-600 to-blue-900 rounded-3xl p-10 md:p-24 mb-8 md:mb-10 max-w-[80rem] mx-auto">
        <h1 className="text-3xl md:text-6xl font-extrabold text-white uppercase leading-none text-center">
          Create New Channel
        </h1>
        <p className="text-blue-100 text-center text-base md:text-xl mt-4 font-medium">
          Build your server's communication structure
        </p>
      </div>
      {/* Responsive layout: mobile vertical, desktop grid */}
      <div className="flex flex-col gap-8 md:grid md:grid-cols-3 md:gap-8 max-w-[80rem] mx-auto">
        {/* Server Channels */}
        <div className="md:col-span-1">
          <div className="sticky top-8">
            <div className="flex items-center gap-3 mb-4 md:mb-6">
              <div className="p-2 bg-blue-500/10 rounded-xl">
                <Hash className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <h2 className={`text-lg md:text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Server Channels</h2>
                <p className={`text-xs md:text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{channels.length} channels total</p>
              </div>
            </div>
            {/* Responsive height: 400px en móvil, 700px en desktop */}
            <ChannelListModern channels={channels} height={typeof window !== 'undefined' && window.innerWidth >= 768 ? 700 : 400} />
          </div>
        </div>
        {/* Formulario y opciones */}
        <div className="md:col-span-2 flex flex-col gap-6">
          {/* Basic Settings */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 md:p-8 text-white rounded-3xl mb-4 md:mb-8">
            <div className="flex flex-col md:flex-row items-center justify-center md:h-20 gap-4 md:gap-0">
              <div className="flex gap-4 md:gap-6 w-full max-w-2xl">
                <button
                  type="button"
                  onClick={() => setMode('channel')}
                  className={`flex-1 flex items-center justify-center gap-3 py-3 md:py-5 px-4 md:px-8 rounded-xl font-semibold text-base md:text-lg transition-all duration-200 ${mode === 'channel'
                    ? 'bg-white/20 text-white'
                    : 'bg-white/10 text-blue-100 hover:bg-white/15'
                  }`}
                >
                  Channel
                </button>
                <button
                  type="button"
                  onClick={() => setMode('category')}
                  className={`flex-1 flex items-center justify-center gap-3 py-3 md:py-5 px-4 md:px-8 rounded-xl font-semibold text-base md:text-lg transition-all duration-200 ${mode === 'category'
                    ? 'bg-white/20 text-white'
                    : 'bg-white/10 text-blue-100 hover:bg-white/15'
                  }`}
                >
                  Category
                </button>
              </div>
            </div>
          </div>
          {/* Formulario dinámico */}
          <div className="rounded-2xl shadow p-4 md:p-8">
            {mode === 'channel' ? (
              <ChannelForm
                isDarkMode={isDarkMode}
                name={name}
                setName={setName}
                type={type}
                setType={setType}
                categoryId={categoryId}
                setCategoryId={setCategoryId}
                topic={topic}
                setTopic={setTopic}
                isPrivate={isPrivate}
                setIsPrivate={setIsPrivate}
                isNSFW={isNSFW}
                setIsNSFW={setIsNSFW}
                slowmode={slowmode}
                setSlowmode={setSlowmode}
                userLimit={userLimit}
                setUserLimit={setUserLimit}
                roles={[]}
                selectedRoles={selectedRoles}
                toggleRole={toggleRole}
                categories={categories}
                loading={loading}
                error={error}
                success={success}
                onSubmit={handleChannelSubmit}
                showAdvanced={showAdvanced}
                setShowAdvanced={setShowAdvanced}
              />
            ) : (
              <CategoryForm
                isDarkMode={isDarkMode}
                catName={catName}
                setCatName={setCatName}
                loading={loading}
                error={error}
                success={success}
                onSubmit={handleCategorySubmit}
                roles={[]}
                selectedRoles={selectedRoles}
                isPrivate={isPrivate}
                showAdvanced={showAdvanced}
                setShowAdvanced={setShowAdvanced}
                setIsPrivate={setIsPrivate}
                toggleRole={toggleRole}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateChannel; 