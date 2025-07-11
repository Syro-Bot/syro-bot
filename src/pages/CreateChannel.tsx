import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import axios from 'axios';
import { Hash, Folder, MessageSquare, Mic, CheckCircle, AlertCircle } from 'lucide-react';
import ChannelListDisplay from '../features/channels/ChannelListDisplay';
import type { Channel as ChannelType } from '../features/channels/ChannelListDisplay';

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
  const [channels, setChannels] = useState<ChannelType[]>([]);

  // Fetch channels
  const fetchChannels = async () => {
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
    fetchChannels();
  }, [guildId]);

  // Obtener categorías ordenadas
  const categories = channels.filter(c => c.type === 4).sort((a, b) => a.position - b.position);

  // Create channel
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
        setName('');
        setType('text');
        setCategoryId('');
        fetchChannels();
      } else {
        setError(response.data.error || 'Error creating channel');
      }
    } catch (e: any) {
      setError('Error creating channel');
    } finally {
      setLoading(false);
    }
  };

  // Create category
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
        setCatName('');
        fetchChannels();
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
    <div className="flex h-full w-full items-center justify-center gap-8 p-6">
      {/* Channel list left */}
      <div className="flex-1 max-w-2xl">
        <div className="rounded-3xl p-6">
          <h2 className={`text-xl font-bold mb-4 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            <Hash className="w-5 h-5 text-blue-500" />
            Server Channels
          </h2>
          <ChannelListDisplay channels={channels} height={480} />
        </div>
      </div>

      {/* Form right */}
      <div className="flex-1 max-w-md">
        <div className={`rounded-3xl shadow-2xl ${isDarkMode ? 'bg-[#181c24]' : 'bg-white'}`} style={{ height: '650px' }}>
          {/* Banner Header */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-t-3xl p-8 text-white">
            <h1 className="text-2xl font-bold text-center mb-2">
              Create New {mode === 'channel' ? 'Channel' : 'Category'}
            </h1>
            <p className="text-blue-100 text-center text-sm">
              Add a new {mode === 'channel' ? 'channel' : 'category'} to your server
            </p>
          </div>

          {/* Content */}
          <div className="p-8 flex flex-col" style={{ height: 'calc(650px - 120px)' }}>
            {/* Toggle buttons */}
            <div className="flex gap-3 mb-8">
              <button
                type="button"
                onClick={() => setMode('channel')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold transition-all duration-200 ${
                  mode === 'channel'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                    : isDarkMode
                      ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                Channel
              </button>
              <button
                type="button"
                onClick={() => setMode('category')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold transition-all duration-200 ${
                  mode === 'category'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                    : isDarkMode
                      ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Folder className="w-4 h-4" />
                Category
              </button>
            </div>

            {/* Success/Error Messages */}
            {success && (
              <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-green-500 font-medium">{success}</span>
              </div>
            )}
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span className="text-red-500 font-medium">{error}</span>
              </div>
            )}

            {/* Formulario según modo */}
            {mode === 'channel' ? (
              <form onSubmit={handleChannelSubmit} className="flex-1 flex flex-col">
                <div className="space-y-6 flex-1">
                  <div>
                    <label className={`block mb-3 font-semibold text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Channel Name
                    </label>
                    <div className="relative">
                      <Hash className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                      <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                        className={`w-full pl-10 pr-4 py-3 rounded-xl border transition-all duration-200 ${
                          isDarkMode 
                            ? 'bg-gray-800 border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20' 
                            : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                        }`}
                        placeholder="e.g. 🛷╏welcome"
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block mb-3 font-semibold text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Channel Type
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setType('text')}
                        className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all duration-200 ${
                          type === 'text'
                            ? 'bg-blue-500 text-white shadow-lg'
                            : isDarkMode
                              ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <MessageSquare className="w-4 h-4" />
                        Text
                      </button>
                      <button
                        type="button"
                        onClick={() => setType('voice')}
                        className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all duration-200 ${
                          type === 'voice'
                            ? 'bg-blue-500 text-white shadow-lg'
                            : isDarkMode
                              ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <Mic className="w-4 h-4" />
                        Voice
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className={`block mb-3 font-semibold text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Category (Optional)
                    </label>
                    <select
                      value={categoryId}
                      onChange={e => setCategoryId(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border transition-all duration-200 ${
                        isDarkMode 
                          ? 'bg-gray-800 border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20' 
                          : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                      }`}
                    >
                      <option value="">No Category</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3 px-6 rounded-xl font-semibold text-lg shadow-lg disabled:opacity-60 disabled:cursor-not-allowed mt-6"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Creating...
                    </div>
                  ) : (
                    'Create Channel'
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleCategorySubmit} className="flex-1 flex flex-col">
                <div className="space-y-6 flex-1">
                  <div>
                    <label className={`block mb-3 font-semibold text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Category Name
                    </label>
                    <div className="relative">
                      <Folder className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                      <input
                        type="text"
                        value={catName}
                        onChange={e => setCatName(e.target.value)}
                        required
                        className={`w-full pl-10 pr-4 py-3 rounded-xl border transition-all duration-200 ${
                          isDarkMode 
                            ? 'bg-gray-800 border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20' 
                            : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                        }`}
                        placeholder="e.g. Important"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3 px-6 rounded-xl font-semibold text-lg shadow-lg disabled:opacity-60 disabled:cursor-not-allowed mt-6"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Creating...
                    </div>
                  ) : (
                    'Create Category'
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateChannel; 