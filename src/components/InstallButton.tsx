'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DownloadCloud } from 'lucide-react';

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [canBeInstalled, setCanBeInstalled] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIosDevice);

    // Show button for iOS devices immediately for manual 'Add to Home Screen'
    if (isIosDevice) {
      setCanBeInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanBeInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      alert("To install CoinPower:\n\n1. Tap the 'Share' icon in your browser.\n2. Scroll down and select 'Add to Home Screen'.");
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setCanBeInstalled(false); // Hide button after successful install
    }
    setDeferredPrompt(null);
  };

  if (!canBeInstalled) return null;

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
