import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface Template {
  _id: string;
  name: string;
  tags: string;
  link: string;
  icon?: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedBy: {
    userId: string;
    username: string;
  };
  reviewedBy?: {
    userId: string;
    username: string;
  };
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface User {
  id: string;
  username: string;
  avatar: string;
}

interface TemplateContextType {
  pendingTemplates: Template[];
  approvedTemplates: Template[];
  pendingCount: number;
  isLoading: boolean;
  user: User | null;
  setUser: (user: User | null) => void;
  fetchPendingTemplates: () => Promise<void>;
  fetchApprovedTemplates: () => Promise<void>;
  approveTemplate: (id: string) => Promise<void>;
  rejectTemplate: (id: string) => Promise<void>;
  submitTemplate: (templateData: { name: string; tags: string; link: string; icon?: string }) => Promise<{ success: boolean; error?: string }>;
}

const TemplateContext = createContext<TemplateContextType | undefined>(undefined);

export const useTemplates = () => {
  const context = useContext(TemplateContext);
  if (context === undefined) {
    throw new Error('useTemplates must be used within a TemplateProvider');
  }
  return context;
};

export const TemplateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pendingTemplates, setPendingTemplates] = useState<Template[]>([]);
  const [approvedTemplates, setApprovedTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const fetchPendingTemplates = useCallback(async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const response = await fetch('/api/templates/pending', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ userId: user.id })
      });
      
      if (response.ok) {
        const data = await response.json();
        setPendingTemplates(data.templates);
      } else if (response.status === 403) {
        // No es el owner, no mostrar error
        setPendingTemplates([]);
      } else {
        console.error('Error fetching pending templates');
      }
    } catch (error) {
      console.error('Error fetching pending templates:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const fetchApprovedTemplates = useCallback(async () => {
    try {
      const response = await fetch('/api/templates/approved', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setApprovedTemplates(data.templates);
      } else {
        console.error('Error fetching approved templates');
      }
    } catch (error) {
      console.error('Error fetching approved templates:', error);
    }
  }, []);

  const approveTemplate = useCallback(async (id: string) => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/templates/${id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ userId: user.id, username: user.username })
      });
      
      if (response.ok) {
        await fetchPendingTemplates();
        await fetchApprovedTemplates(); // Actualizar templates aprobados
      } else {
        console.error('Error approving template');
      }
    } catch (error) {
      console.error('Error approving template:', error);
    }
  }, [user, fetchPendingTemplates, fetchApprovedTemplates]);

  const rejectTemplate = useCallback(async (id: string) => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/templates/${id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ userId: user.id, username: user.username })
      });
      
      if (response.ok) {
        await fetchPendingTemplates();
      } else {
        console.error('Error rejecting template');
      }
    } catch (error) {
      console.error('Error rejecting template:', error);
    }
  }, [user, fetchPendingTemplates]);

  const submitTemplate = useCallback(async (templateData: { name: string; tags: string; link: string; icon?: string }) => {
    if (!user) {
      return { success: false, error: 'Usuario no autenticado' };
    }
    
    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...templateData,
          userId: user.id,
          username: user.username
        })
      });
      
      if (response.ok) {
        // Si el usuario actual es el owner, actualizar la lista de pendientes
        await fetchPendingTemplates();
        return { success: true };
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.error };
      }
    } catch (error) {
      console.error('Error submitting template:', error);
      return { success: false, error: 'Error interno del servidor' };
    }
  }, [user, fetchPendingTemplates]);

  useEffect(() => {
    if (user) {
      fetchPendingTemplates();
    }
  }, [user, fetchPendingTemplates]);

  const value: TemplateContextType = {
    pendingTemplates,
    approvedTemplates,
    pendingCount: pendingTemplates.length,
    isLoading,
    user,
    setUser,
    fetchPendingTemplates,
    fetchApprovedTemplates,
    approveTemplate,
    rejectTemplate,
    submitTemplate
  };

  return (
    <TemplateContext.Provider value={value}>
      {children}
    </TemplateContext.Provider>
  );
}; 