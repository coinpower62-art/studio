'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DownloadCloud, Share, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function InstallCard() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if the app is already installed and running in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Detect if the user is on an iOS device
    const ua = navigator.userAgent.toLowerCase();
    const isIphone = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIphone);

    // Listen for the beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleDownload = async () => {
    // If the app is already installed, do nothing.
    if (isInstalled) {
        toast({ title: "App is already installed!" });
        return;
    }

    // If on iOS, show the manual install guide toast.
    if (isIOS) {
        toast({
            title: "How to Install on iOS",
            description: (
                <div className="flex flex-col gap-2 text-sm">
                    <p>1. Tap the <Share className="inline-block h-4 w-4 mx-1" /> Share icon in your browser.</p>
                    <p>2. Scroll down and tap 'Add to Home Screen'.</p>
                </div>
            ),
            duration: 8000,
        });
        return;
    }

    // If the deferredPrompt is available, show the browser's install prompt.
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        toast({ title: "App installed!", description: "CoinPower has been added to your Home screen." });
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      // If the prompt isn't available, guide the user.
      toast({
        title: "Installation Not Ready",
        description: "The install prompt isn't ready yet. Please browse the app for a moment and try again. You can also use your browser's 'Install App' menu option.",
        duration: 8000,
      });
    }
  };
  
  // The card should be visible if it's not installed yet, or if it is installed (to show the "Installed" state)
  // We always show it, and the button's state changes.
  const isVisible = true; 

  if (!isVisible) {
      return null;
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0 shadow-lg">
          <DownloadCloud className="w-7 h-7 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-gray-900 text-base">Install CoinPower App</h3>
          <p className="text-xs text-gray-500 mt-1">
            Add CoinPower to your home screen for easy access and a better experience.
          </p>
        </div>
        {isInstalled ? (
           <Button 
             disabled
             className="bg-green-500 hover:bg-green-500 text-white font-bold text-xs uppercase rounded-full px-5 py-2.5 flex items-center gap-2 cursor-not-allowed"
           >
             <CheckCircle className="w-4 h-4" />
             Installed
           </Button>
        ) : (
          <Button 
            onClick={handleDownload}
            className="bg-amber-500 hover:bg-amber-600 text-black font-black text-xs uppercase rounded-full px-5 py-2.5"
          >
            {isIOS ? 'Install Guide' : 'Download & Install'}
          </Button>
        )}
      </div>
    </div>
  );
}
