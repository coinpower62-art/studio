'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DownloadCloud, Smartphone } from 'lucide-react';

export function InstallCard() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Prevent banner from showing if user has already installed the app
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsVisible(false);
      return;
    }

    // 1. Check if user already dismissed this banner in this session
    const isDismissed = sessionStorage.getItem('installCardDismissed');
    if (isDismissed) return;

    // 2. Detect iOS
    const ua = navigator.userAgent.toLowerCase();
    const isIphone = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIphone);

    // iOS doesn't have a 'beforeinstallprompt' event, so we show the banner manually
    // if the app is not already installed.
    if (isIphone) setIsVisible(true);

    // 3. For Android/Chrome
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      alert("To install CoinPower on your iPhone:\n\n1. Tap the 'Share' icon (a square with an arrow pointing up) in your browser's toolbar.\n\n2. Scroll down and tap on 'Add to Home Screen'.\n\n3. Tap 'Add' in the top-right corner.");
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
          setIsVisible(false);
          sessionStorage.setItem('installCardDismissed', 'true');
      }
      setDeferredPrompt(null);
    } else {
        // Fallback for desktop browsers that don't fire the event but are installable
        alert("To install CoinPower on your desktop:\n\nLook for an 'Install' icon in your browser's address bar (usually on the right side) and click it.");
    }
  };

  const closeBanner = () => {
    setIsVisible(false);
    sessionStorage.setItem('installCardDismissed', 'true');
  };

  if (!isVisible) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm relative">
        <button onClick={closeBanner} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg flex-shrink-0">
                <DownloadCloud className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
                <h3 className="font-bold text-gray-900 text-sm">Install CoinPower App</h3>
                <p className="text-xs text-gray-500 mt-0.5">Get a native app experience for faster access and notifications.</p>
            </div>
            <Button
                onClick={handleInstall}
                className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold rounded-lg shadow-md transition-all flex items-center gap-2 justify-center text-sm px-5 h-10"
            >
                <Smartphone className="w-4 h-4" />
                Download & Install
            </Button>
        </div>
    </div>
  );
}
