import React from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface SuccessErrorAlertProps {
  success?: string | null;
  error?: string | null;
}

const SuccessErrorAlert: React.FC<SuccessErrorAlertProps> = ({ success, error }) => {
  if (!success && !error) return null;
  return (
    <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 border ${success ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
      {success ? <CheckCircle className="w-5 h-5 text-green-500" /> : <AlertCircle className="w-5 h-5 text-red-500" />}
      <span className={success ? 'text-green-500 font-medium' : 'text-red-500 font-medium'}>{success || error}</span>
    </div>
  );
};

export default SuccessErrorAlert; 