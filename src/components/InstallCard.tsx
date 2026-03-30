'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DownloadCloud, Loader } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function InstallCard() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // If the user clicked while we were waiting for the prompt, hide the spinner
      setIsPreparing(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Show the install prompt
      deferredPrompt.prompt();
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        toast({ title: "App installed!", description: "CoinPower has been added to your Home screen." });
      }
      // We can only use the prompt once, clear it.
      setDeferredPrompt(null);
    } else {
      // If prompt isn't ready, show a preparing state
      setIsPreparing(true);
      // Hide preparing state after a few seconds if the event doesn't fire (e.g., on iOS)
      setTimeout(() => setIsPreparing(false), 3000);
    }
  };

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
          disabled={isPreparing}
        >
          {isPreparing ? (
            <>
              <Loader className="mr-2 h-4 w-4 animate-spin" />
              Preparing...
            </>
          ) : (
            'Install App'
          )}
        </Button>
      </div>
    </div>
  );
}
