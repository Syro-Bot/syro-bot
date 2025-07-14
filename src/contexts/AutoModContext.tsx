import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { AutoModRule } from '../features/automoderation/types';

interface AutoModContextType {
  // Estado
  rules: Record<string, AutoModRule[]>; // featureName -> rules[]
  isLoading: boolean;
  error: string | null;
  
  // Acciones
  addRule: (featureName: string, rule: Omit<AutoModRule, 'id'>) => Promise<void>;
  updateRule: (featureName: string, ruleId: number, updates: Partial<AutoModRule>) => Promise<void>;
  deleteRule: (featureName: string, ruleId: number) => Promise<void>;
  loadRules: (guildId: string) => Promise<void>;
  saveRules: (guildId: string) => Promise<void>;
}

const AutoModContext = createContext<AutoModContextType | undefined>(undefined);

interface AutoModProviderProps {
  children: ReactNode;
  guildId?: string; // Hacer opcional para que se pueda obtener dinámicamente
}

export const AutoModProvider: React.FC<AutoModProviderProps> = ({ children, guildId }) => {
  const [rules, setRules] = useState<Record<string, AutoModRule[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  // Cargar reglas al montar el componente o cuando cambie guildId
  useEffect(() => {
    if (guildId) {
      loadRules(guildId);
    }
  }, [guildId]);

  // Limpiar timeout al desmontar
  useEffect(() => {
    return () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
    };
  }, [saveTimeout]);

  // Guardar reglas automáticamente cuando cambien (con debouncing)
  useEffect(() => {
    if (guildId && !isInitialLoad && Object.keys(rules).length > 0) {
      // Solo guardar si las reglas han cambiado por el usuario, no por carga inicial
      const hasUserChanges = Object.values(rules).some(rulesArray => 
        rulesArray.some(rule => rule.id && rule.id > Date.now() - 10000) 
      );
      
      if (hasUserChanges) {
        console.log('🔄 Reglas cambiaron por el usuario, programando guardado...');
        debouncedSave(guildId);
      }
    }
  }, [rules, guildId, isInitialLoad]);

  const loadRules = async (guildId: string) => {
    console.log('🔄 Cargando reglas para guildId:', guildId);
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/servers/${guildId}/automod/rules`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📥 Reglas cargadas:', data.automodRules);
        setRules(data.automodRules || {});
        setIsInitialLoad(false);
      } else {
        throw new Error(`Error al cargar reglas: ${response.status}`);
      }
    } catch (err) {
      console.error('❌ Error cargando reglas:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      
      // En caso de error, establecer reglas vacías por defecto
      const defaultRules = {
        Spam: [],
        Words: [],
        Links: [],
        Raids: [],
        Mentions: [],
        NSFW: [],
        Caps: [],
        Emojis: [],
        Flood: [],
        Slowmode: [],
        Mute: [],
        Logs: []
      };
      setRules(defaultRules);
      setIsInitialLoad(false);
    } finally {
      setIsLoading(false);
    }
  };

  const saveRules = async (guildId: string) => {
    console.log('💾 Guardando reglas para guildId:', guildId);
    console.log('📤 Reglas a guardar:', rules);
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/servers/${guildId}/automod/rules`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ automodRules: rules })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        console.error('❌ Error response:', result);
        throw new Error(result.error || 'Error al guardar reglas');
      }
      
      console.log('✅ Reglas guardadas:', result);
    } catch (err) {
      console.error('❌ Error guardando reglas:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  const debouncedSave = (guildId: string) => {
    // Cancelar el timeout anterior si existe
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    
    // Crear nuevo timeout
    const timeout = setTimeout(() => {
      console.log('⏰ Debounced save ejecutándose...');
      saveRules(guildId);
    }, 1000); // Esperar 1 segundo después del último cambio
    
    setSaveTimeout(timeout);
  };

  const addRule = async (featureName: string, ruleData: Omit<AutoModRule, 'id'>) => {
    if (!guildId) {
      setError('No hay servidor seleccionado');
      return;
    }

    const newRule: AutoModRule = {
      ...ruleData,
      id: Date.now()
    };

    console.log('➕ Agregando regla:', { featureName, newRule });

    setRules(prev => {
      const updatedRules = {
        ...prev,
        [featureName]: [...(prev[featureName] || []), newRule]
      };
      console.log('📋 Estado actualizado:', updatedRules);
      return updatedRules;
    });
  };

  const updateRule = async (featureName: string, ruleId: number, updates: Partial<AutoModRule>) => {
    if (!guildId) {
      setError('No hay servidor seleccionado');
      return;
    }

    setRules(prev => {
      const updatedRules = {
        ...prev,
        [featureName]: (prev[featureName] || []).map(rule =>
          rule.id === ruleId ? { ...rule, ...updates } : rule
        )
      };
      return updatedRules;
    });
  };

  const deleteRule = async (featureName: string, ruleId: number) => {
    if (!guildId) {
      setError('No hay servidor seleccionado');
      return;
    }

    setRules(prev => {
      const updatedRules = {
        ...prev,
        [featureName]: (prev[featureName] || []).filter(rule => ruleId !== rule.id)
      };
      // GUARDA usando el estado actualizado, no el global
      saveRulesWithRules(guildId, updatedRules);
      return updatedRules;
    });
  };

  // Nueva función auxiliar:
  const saveRulesWithRules = async (guildId: string, rulesToSave: Record<string, AutoModRule[]>) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/servers/${guildId}/automod/rules`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ automodRules: rulesToSave })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al guardar reglas');
      }
      console.log('✅ Reglas guardadas:', result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  const value: AutoModContextType = {
    rules,
    isLoading,
    error,
    addRule,
    updateRule,
    deleteRule,
    loadRules,
    saveRules
  };

  return (
    <AutoModContext.Provider value={value}>
      {children}
    </AutoModContext.Provider>
  );
};

export const useAutoMod = () => {
  const context = useContext(AutoModContext);
  if (context === undefined) {
    throw new Error('useAutoMod debe usarse dentro de AutoModProvider');
  }
  return context;
}; 