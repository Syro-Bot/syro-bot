import React from 'react';

interface FormSectionProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /**
   * Clases extra para el fondo/borde del contenedor principal
   */
  background?: string;
  isDarkMode?: boolean;
}

const FormSection: React.FC<FormSectionProps> = ({ title, icon, children, className, background, isDarkMode }) => (
  <section className={`mb-8 ${className || ''}`}>
    <div className="flex items-center gap-2 mb-4">
      {icon}
      <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{title}</h3>
    </div>
    <div className={background}>{children}</div>
  </section>
);

export default FormSection; 