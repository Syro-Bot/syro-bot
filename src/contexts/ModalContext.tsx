import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface ModalContextType {
  showRaidTypeModal: boolean;
  setShowRaidTypeModal: (show: boolean) => void;
  raidTypeModalProps: {
    onSelectType: (type: 'join' | 'channel' | 'role') => void;
    isDarkMode: boolean;
  } | null;
  setRaidTypeModalProps: (props: {
    onSelectType: (type: 'join' | 'channel' | 'role') => void;
    isDarkMode: boolean;
  } | null) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const useModal = () => {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

interface ModalProviderProps {
  children: ReactNode;
}

export const ModalProvider: React.FC<ModalProviderProps> = ({ children }) => {
  const [showRaidTypeModal, setShowRaidTypeModal] = useState(false);
  const [raidTypeModalProps, setRaidTypeModalProps] = useState<{
    onSelectType: (type: 'join' | 'channel' | 'role') => void;
    isDarkMode: boolean;
  } | null>(null);

  const value = {
    showRaidTypeModal,
    setShowRaidTypeModal,
    raidTypeModalProps,
    setRaidTypeModalProps
  };

  return (
    <ModalContext.Provider value={value}>
      {children}
    </ModalContext.Provider>
  );
}; 