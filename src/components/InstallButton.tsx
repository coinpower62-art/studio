'use client';

import { useEffect, useState } from 'react';
import { DownloadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInstallPrompt } from '@/context/InstallPromptContext';
import { useToast } from '@/hooks/use-toast';

export default function InstallButton() {
  const { installPromptEvent } = useInstallPrompt();
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleInstallClick = async () => {
    if (!installPromptEvent) {
      toast({
        title: "App is Installed or Installable",
        description: "To install the app, open your browser menu and select 'Add to Home Screen' or 'Install App'. If already installed, you can launch it from your home screen.",
      });
      return;
    }
    
    await installPromptEvent.prompt();
    const { outcome } = await installPromptEvent.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the A2HS prompt');
    } else {
      console.log('User dismissed the A2HS prompt');
    }
  };

  if (!isClient) {
    return null;
  }

  return (
    <Button
      onClick={handleInstallClick}
      className="w-full h-14 bg-black text-amber-400 font-bold rounded-xl text-base border-2 border-amber-400/50 hover:bg-gray-800 hover:border-amber-400 shadow-lg"
    >
      <DownloadCloud className="w-5 h-5 mr-2.5" />
      INSTALL COINPOWER APP
    </Button>
  );
}
