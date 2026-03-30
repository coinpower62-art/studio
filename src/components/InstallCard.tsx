'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DownloadCloud, Share } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function InstallCard() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const isIphone = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIphone);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true); // Show the button when the prompt is available
    };

    window.addEventListener('beforeinstallprompt', handler);

    if (isIphone) {
      // Always show the install card on iOS.
      setIsVisible(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleDownload = async () => {
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

    // For other browsers, trigger the deferred prompt if available.
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsVisible(false); // Hide the card after successful install
        toast({ title: "App installed!", description: "CoinPower has been added to your Home screen." });
      }
      setDeferredPrompt(null);
    }
  };
  
  if (!isVisible) {
      return null; // Don't show anything if install is not available (and not on iOS)
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
            Add CoinPower to your home screen for easy access and notifications.
          </p>
        </div>
        <button 
          onClick={handleDownload}
          style={{
            backgroundColor: '#D4AF37', // A gold color
            color: '#000',
            border: 'none',
            padding: '8px 20px',
            borderRadius: '25px',
            fontWeight: '900',
            fontSize: '12px',
            cursor: 'pointer',
            textTransform: 'uppercase'
          }}
        >
          Download & Install
        </button>
      </div>
    </div>
  );
}
