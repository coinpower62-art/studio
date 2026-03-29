'use client';

import { useEffect, useState } from 'react';
import { ArrowDownToLine, Smartphone } from 'lucide-react';

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

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Also check for iOS to show manual instructions
    const ua = navigator.userAgent.toLowerCase();
    const isIphone = /iphone|ipad|ipod/.test(ua);
    if (isIphone) {
        setIsIOS(true);
        setIsVisible(true);
    }


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
      }
      setDeferredPrompt(null);
    } else {
        // Fallback for desktop/other browsers
        alert("To install CoinPower on your device:\n\nLook for an 'Install' icon in your browser's address bar or check the browser menu for an 'Install App' option.");
    }
  };

  if (!isVisible) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex flex-col items-center gap-3">
             <h3 className="font-bold text-gray-900 text-sm text-center">Click to download CoinPower app</h3>
             <p className="text-xs text-gray-500 mt-0.5 text-center">For faster access and notifications, install the app on your device.</p>
            <button
                onClick={handleInstall}
                className="group w-full max-w-xs mx-auto bg-slate-900 text-white font-semibold rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-between text-base h-14 mt-2"
            >
                <span className="pl-8">Download</span>
                <div className="mr-2 h-11 w-11 rounded-full bg-red-600 group-hover:bg-red-500 transition-colors flex items-center justify-center ring-2 ring-slate-900">
                    <ArrowDownToLine className="w-5 h-5 text-white" />
                </div>
            </button>
        </div>
    </div>
  );
}
