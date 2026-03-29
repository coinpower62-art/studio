'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DownloadCloud } from 'lucide-react';

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIosDevice);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      alert("To install CoinPower:\n\n1. Tap the 'Share' icon in your browser.\n2. Scroll down and select 'Add to Home Screen'.");
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      }
      setDeferredPrompt(null);
    } else {
      // Fallback for browsers that don't fire the event or if it was dismissed
      alert("To install CoinPower:\n\n1. Tap the menu (⋮) in your browser.\n2. Select 'Install app' or 'Add to Home screen'.");
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg">
                <DownloadCloud className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
                <h3 className="font-bold text-gray-900">Install CoinPower App</h3>
                <p className="text-sm text-gray-500 mt-1">Get a native app experience for one-click access.</p>
            </div>
             <Button onClick={handleInstallClick}>
                Install App
            </Button>
        </div>
    </div>
  );
}
