import React, { useEffect } from "react";
import { useTemplates } from '../contexts/TemplateContext';
import { ExternalLink } from "lucide-react";

const Templates: React.FC = () => {
  const { approvedTemplates, fetchApprovedTemplates, isLoading } = useTemplates();

  useEffect(() => {
    fetchApprovedTemplates();
  }, [fetchApprovedTemplates]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (approvedTemplates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full">
        <h1 className="text-6xl font-extrabold bg-gradient-to-r from-blue-400 via-blue-600 to-blue-900 bg-clip-text text-transparent uppercase leading-none mb-4 text-center">
          Templates
        </h1>
        <p className="text-2xl text-gray-600 dark:text-gray-300 text-center">
          Templates aprobados para tu servidor
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-400 via-blue-600 to-blue-900 bg-clip-text text-transparent uppercase leading-none mb-4">
          Templates
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Templates aprobados para tu servidor
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {approvedTemplates.map((template) => (
          <div
            key={template._id}
            className="group cursor-pointer"
            onClick={() => window.open(template.link, '_blank')}
          >
            {/* Imagen del template */}
            <div className="relative mb-3">
              <img
                src={template.icon || "/eyes.png"}
                alt={template.name}
                className="w-full h-42 object-cover rounded-xl border-2 border-gray-200 dark:border-gray-600 group-hover:border-blue-400 transition-colors"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-xl flex items-center justify-center">
                <ExternalLink className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={24} />
              </div>
            </div>
            {/* Nombre y tag uno al lado del otro */}
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                {template.name}
              </h3>
              <span className="inline-block max-w-[60%] truncate bg-gradient-to-r from-blue-500 via-blue-600 to-blue-800 text-black dark:text-white px-3 py-1 rounded-md text-xs font-semibold shadow-sm">
                {template.tags}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Templates; 