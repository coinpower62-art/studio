'use client';

import { createContext, useContext, useState, ReactNode, Dispatch, SetStateAction } from 'react';

type InstallPromptContextType = {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
};

const InstallPromptContext = createContext<InstallPromptContextType | undefined>(undefined);

export function InstallPromptProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <InstallPromptContext.Provider value={{ isOpen, setIsOpen }}>
      {children}
    </InstallPromptContext.Provider>
  );
}

export function useInstallPrompt() {
  const context = useContext(InstallPromptContext);
  if (context === undefined) {
    throw new Error('useInstallPrompt must be used within an InstallPromptProvider');
  }
  return context;
}
