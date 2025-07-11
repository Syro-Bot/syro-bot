import React from 'react';
import { Folder, Settings, Plus } from 'lucide-react';
import FormSection from '../../components/shared/FormSection';
import SuccessErrorAlert from '../../components/shared/SuccessErrorAlert';
import AdvancedOptions from './AdvancedOptions';
import type { Role } from './types';

interface CategoryFormProps {
  isDarkMode: boolean;
  catName: string;
  setCatName: (v: string) => void;
  loading: boolean;
  success: string | null;
  error: string | null;
  onSubmit: (e: React.FormEvent) => void;
  // Advanced
  roles: Role[];
  selectedRoles: string[];
  isPrivate: boolean;
  showAdvanced: boolean;
  setShowAdvanced: (v: boolean) => void;
  setIsPrivate: (v: boolean) => void;
  toggleRole: (roleId: string) => void;
}

const CategoryForm: React.FC<CategoryFormProps> = ({
  isDarkMode,
  catName,
  setCatName,
  loading,
  success,
  error,
  onSubmit,
  roles,
  selectedRoles,
  isPrivate,
  showAdvanced,
  setShowAdvanced,
  setIsPrivate,
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
      <div>
        <label className={`block mb-3 font-semibold text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Category Name</label>
        <div className="relative">
          <Folder className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          <input
            type="text"
            value={catName}
            onChange={e => setCatName(e.target.value)}
            required
            className={`w-full pl-10 pr-4 py-3 rounded-xl border transition-all duration-200 ${isDarkMode
              ? 'bg-gray-800 border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
              : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
            }`}
            placeholder="ej. Canales importantes"
          />
        </div>
      </div>
    </FormSection>
    <div className="w-full">
      <AdvancedOptions
        isDarkMode={isDarkMode}
        type={''}
        roles={roles}
        selectedRoles={selectedRoles}
        isPrivate={isPrivate}
        isNSFW={false}
        slowmode={0}
        showAdvanced={showAdvanced}
        setShowAdvanced={setShowAdvanced}
        setIsPrivate={setIsPrivate}
        setIsNSFW={() => {}}
        setSlowmode={() => {}}
        toggleRole={toggleRole}
        isCategory={true}
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
          Creating Category...
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2">
          <Plus className="w-5 h-5" />
          Create Category
        </div>
      )}
    </button>
  </form>
);

export default CategoryForm; 