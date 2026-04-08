'use client';

import { useEffect, useState } from 'react';
import { DownloadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInstallPrompt } from '@/context/InstallPromptContext';

export default function InstallButton() {
  const { installPromptEvent } = useInstallPrompt();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleInstallClick = async () => {
    if (installPromptEvent) {
      await installPromptEvent.prompt();
      const { outcome } = await installPromptEvent.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the A2HS prompt');
      } else {
        console.log('User dismissed the A2HS prompt');
      }
    }
    // If installPromptEvent is not available, do nothing, as requested.
  };

  if (!isClient) {
    return null;
  }
  
  return (
    <Button
      onClick={handleInstallClick}
      className="w-full h-14 bg-black text-amber-400 font-bold rounded-xl text-base border-2 border-amber-400/50 hover:bg-gray-800 hover:text-amber-400 shadow-lg"
    >
      <DownloadCloud className="w-5 h-5 mr-2.5" />
      INSTALL COINPOWER APP
    </Button>
  );
}
