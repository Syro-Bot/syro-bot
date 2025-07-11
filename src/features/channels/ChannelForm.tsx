import React from 'react';
import { Hash, MessageSquare, Mic, Settings, Plus } from 'lucide-react';
import FormSection from '../../components/shared/FormSection';
import SuccessErrorAlert from '../../components/shared/SuccessErrorAlert';
import AdvancedOptions from './AdvancedOptions';
import type { Channel, Role } from './types';

interface ChannelFormProps {
  isDarkMode: boolean;
  name: string;
  setName: (v: string) => void;
  type: string;
  setType: (v: string) => void;
  categoryId: string;
  setCategoryId: (v: string) => void;
  topic: string;
  setTopic: (v: string) => void;
  userLimit: number;
  setUserLimit: (v: number) => void;
  categories: Channel[];
  loading: boolean;
  success: string | null;
  error: string | null;
  onSubmit: (e: React.FormEvent) => void;
  // Advanced
  roles: Role[];
  selectedRoles: string[];
  isPrivate: boolean;
  isNSFW: boolean;
  slowmode: number;
  showAdvanced: boolean;
  setShowAdvanced: (v: boolean) => void;
  setIsPrivate: (v: boolean) => void;
  setIsNSFW: (v: boolean) => void;
  setSlowmode: (v: number) => void;
  toggleRole: (roleId: string) => void;
}

const ChannelForm: React.FC<ChannelFormProps> = ({
  isDarkMode,
  name,
  setName,
  type,
  setType,
  categoryId,
  setCategoryId,
  topic,
  setTopic,
  userLimit,
  setUserLimit,
  categories,
  loading,
  success,
  error,
  onSubmit,
  roles,
  selectedRoles,
  isPrivate,
  isNSFW,
  slowmode,
  showAdvanced,
  setShowAdvanced,
  setIsPrivate,
  setIsNSFW,
  setSlowmode,
  toggleRole
}) => (
  <form onSubmit={onSubmit} className="space-y-8">
    <SuccessErrorAlert success={success} error={error} />
    <FormSection
      title="Basic Settings"
      icon={<Settings className="w-5 h-5 text-blue-500" />}
      background={
        (isDarkMode ? 'bg-[#23272e] border border-gray-700 rounded-2xl p-6 w-full' : 'bg-white border border-gray-200 rounded-2xl p-6 w-full')
      }
      isDarkMode={isDarkMode}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className={`block mb-3 font-semibold text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Channel Name</label>
          <div className="relative">
            <Hash className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className={`w-full pl-10 pr-4 py-3 rounded-xl border transition-all duration-200 ${isDarkMode
                ? 'bg-gray-800 border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
              }`}
              placeholder="ej. 🛷╏welcome"
            />
          </div>
        </div>
        <div>
          <label className={`block mb-3 font-semibold text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Channel Type</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setType('text')}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all duration-200 ${type === 'text'
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
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all duration-200 ${type === 'voice'
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
      </div>
      <div>
        <label className={`block mb-3 font-semibold text-sm mt-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Category (Optional)</label>
        <select
          value={categoryId}
          onChange={e => setCategoryId(e.target.value)}
          className={`w-full px-4 py-3 rounded-xl border transition-all duration-200 ${isDarkMode
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
      {type === 'text' && (
        <div>
          <label className={`block mb-3 font-semibold text-sm mt-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Channel Topic (Optional)</label>
          <textarea
            value={topic}
            onChange={e => setTopic(e.target.value)}
            rows={3}
            className={`w-full px-4 py-3 rounded-xl border transition-all duration-200 ${isDarkMode
              ? 'bg-gray-800 border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
              : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
            }`}
            placeholder="Describe what this channel is for..."
          />
        </div>
      )}
      {type === 'voice' && (
        <div>
          <label className={`block mb-3 font-semibold text-sm mt-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>User Limit (0 = No limit)</label>
          <input
            type="number"
            min="0"
            max="99"
            value={userLimit}
            onChange={e => setUserLimit(parseInt(e.target.value) || 0)}
            className={`w-full px-4 py-3 rounded-xl border transition-all duration-200 ${isDarkMode
              ? 'bg-gray-800 border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
              : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
            }`}
          />
        </div>
      )}
    </FormSection>
    <div className="w-full">
      <AdvancedOptions
        isDarkMode={isDarkMode}
        type={type}
        roles={roles}
        selectedRoles={selectedRoles}
        isPrivate={isPrivate}
        isNSFW={isNSFW}
        slowmode={slowmode}
        showAdvanced={showAdvanced}
        setShowAdvanced={setShowAdvanced}
        setIsPrivate={setIsPrivate}
        setIsNSFW={setIsNSFW}
        setSlowmode={setSlowmode}
        toggleRole={toggleRole}
        isCategory={false}
        labelHoverClass={isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-blue-100'}
      />
    </div>
    <button
      type="submit"
      disabled={loading}
      className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-4 px-6 rounded-xl font-semibold text-lg shadow-lg disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2">
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          Creating Channel...
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2">
          <Plus className="w-5 h-5" />
          Create Channel
        </div>
      )}
    </button>
  </form>
);

export default ChannelForm; 