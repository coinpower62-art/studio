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
    // This effect should run only on the client
    setIsClient(true);
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(isInstalled);
  }, []);

  const handleOpen = () => setIsOpen(true);

  // Don't show the button if the app is already installed or if not on client
  if (!isClient || isStandalone) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center justify-between gap-4">
      <div>
        <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
          <DownloadCloud className="w-4 h-4 text-amber-600" />
          Install App
        </h3>
        <p className="text-xs text-gray-500 mt-1">For the best experience, install the app to your home screen.</p>
      </div>
      <Button onClick={handleOpen} size="sm" className="bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold rounded-lg shadow-md transition-all">
        Learn More
      </Button>
    </div>
  );
}
