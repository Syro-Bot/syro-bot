import React, { useState, useEffect } from 'react';
import { useTemplates } from '../../contexts/TemplateContext';
import { Check, X, Clock, User, Tag, ExternalLink, X as CloseIcon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface PendingTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PendingTemplatesModal: React.FC<PendingTemplatesModalProps> = ({ isOpen, onClose }) => {
  const { pendingTemplates, approveTemplate, rejectTemplate, isLoading } = useTemplates();
  const { isDarkMode } = useTheme();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
              fetch('/api/me', { credentials: 'include' })
        .then(res => res.ok ? res.json() : null)
        .then(data => setUser(data?.user || null));
    }
  }, [isOpen]);

  const isOwner = user?.id === '590275518599921701';

  const handleApprove = async (id: string) => {
    if (confirm('¿Estás seguro de que quieres aprobar este template?')) {
      await approveTemplate(id);
    }
  };

  const handleReject = async (id: string) => {
    if (confirm('¿Estás seguro de que quieres rechazar este template?')) {
      await rejectTemplate(id);
    }
  };

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div>
            <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Templates Pendientes
            </h2>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {pendingTemplates.length} template{pendingTemplates.length !== 1 ? 's' : ''} esperando revisión
            </p>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <CloseIcon size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {!isOwner ? (
            <div className="text-center py-16">
              <p className={`text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Solo el administrador puede moderar templates.
              </p>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : pendingTemplates.length === 0 ? (
            <div className="text-center py-16">
              <Clock className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h3 className={`text-xl font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                No hay templates pendientes
              </h3>
              <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Todos los templates han sido revisados
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingTemplates.map((template) => (
                <div
                  key={template._id}
                  className={`rounded-xl border p-4 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}
                >
                  {/* Icono del template */}
                  <div className="flex justify-center mb-3">
                    <img
                      src={template.icon || "/eyes.png"}
                      alt={template.name}
                      className="w-20 h-20 rounded-lg object-cover border-2 border-gray-200 dark:border-gray-600"
                    />
                  </div>

                  {/* Información del template */}
                  <div className="text-center mb-3">
                    <h3 className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {template.name}
                    </h3>
                    <div className="flex flex-col gap-1 text-sm text-gray-600 dark:text-gray-300">
                      <div className="flex items-center justify-center gap-1">
                        <User size={14} />
                        <span>{template.submittedBy.username}</span>
                      </div>
                      <div className="flex items-center justify-center gap-1">
                        <Tag size={14} />
                        <span>{template.tags}</span>
                      </div>
                      <div className="flex items-center justify-center gap-1">
                        <Clock size={14} />
                        <span>{formatDate(template.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Link del template */}
                  <div className="mb-4 text-center">
                    <a
                      href={template.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors text-sm"
                    >
                      <ExternalLink size={14} />
                      <span className="truncate">Ver Template</span>
                    </a>
                  </div>

                  {/* Botones de acción */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(template._id)}
                      className="flex-1 flex items-center justify-center gap-1 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg font-semibold transition-colors text-sm"
                    >
                      <Check size={14} />
                      Aprobar
                    </button>
                    <button
                      onClick={() => handleReject(template._id)}
                      className="flex-1 flex items-center justify-center gap-1 bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg font-semibold transition-colors text-sm"
                    >
                      <X size={14} />
                      Rechazar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PendingTemplatesModal; 