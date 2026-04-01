'use client';

import { useEffect, useState } from 'react';
import { DownloadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInstallPrompt } from '@/context/InstallPromptContext';

export default function InstallButton() {
  const { setIsOpen } = useInstallPrompt();
  const [isStandalone, setIsStandalone] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(isInstalled);
  }, []);

  const handleOpen = () => setIsOpen(true);

  if (!isClient || isStandalone) {
    return null;
  }

  return (
    <Button
      onClick={handleOpen}
      className="w-full h-14 bg-black text-amber-400 font-bold rounded-xl text-base border-2 border-amber-400/50 hover:bg-gray-800 hover:border-amber-400 shadow-lg"
    >
      <DownloadCloud className="w-5 h-5 mr-2.5" />
      INSTALL COINPOWER APP
    </Button>
  );
}
