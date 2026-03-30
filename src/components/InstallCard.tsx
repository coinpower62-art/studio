'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DownloadCloud, MoreVertical, PlusSquare, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function InstallCard() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    // If the browser has offered the install prompt, show it.
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        toast({ title: "App installed!", description: "CoinPower has been added to your Home screen." });
      }
      setDeferredPrompt(null);
    } else {
      // Otherwise, show the manual installation guide.
      setShowInstallGuide(true);
    }
  };

  if (showInstallGuide) {
    return (
        <div className="bg-white rounded-2xl border-2 border-amber-300 p-5 shadow-lg animate-in fade-in">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Manual Install Guide</h3>
                <p className="text-xs text-gray-500 mt-1">
                    Follow these steps to add the app to your Home Screen.
                </p>
              </div>
               <Button variant="ghost" size="sm" onClick={() => setShowInstallGuide(false)} className="text-gray-500 hover:bg-gray-100">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back
                </Button>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center flex-shrink-0 font-bold text-sm">1</div>
                  <div>
                      <p className="font-semibold text-gray-800 text-sm">Open Browser Menu</p>
                      <p className="text-xs text-gray-600">Tap the <MoreVertical className="inline-block w-4 h-4" /> icon in your browser's address bar.</p>
                  </div>
              </div>
              <div className="flex items-start gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center flex-shrink-0 font-bold text-sm">2</div>
                  <div>
                      <p className="font-semibold text-gray-800 text-sm">Tap 'Install App'</p>
                      <p className="text-xs text-gray-600">Select <span className="font-semibold">"Install App"</span> or <span className="font-semibold">"Add to Home Screen"</span> from the menu.</p>
                  </div>
              </div>
            </div>
        </div>
    )
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
        <Button
          onClick={handleInstallClick}
          className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold rounded-xl h-10 px-6 shadow-md transition-all text-sm"
        >
          Install App
        </Button>
      </div>
    </div>
  );
}
