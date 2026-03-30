'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DownloadCloud, MoreHorizontal, PlusSquare, Share } from 'lucide-react';
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
      // deferredPrompt is not available. This can happen on iOS,
      // or if the PWA is already installed, or if the user dismissed the prompt.
      // So, we show a helpful guide.
      setShowInstallGuide(true);
    }
  };

  const isIos = () => {
    // A simple check for iOS devices
    if (typeof navigator === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  };


  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0 shadow-lg">
            <DownloadCloud className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 text-base">Install CoinPower App</h3>
            <p className="text-xs text-gray-500 mt-1">
              Get the full app experience. Add CoinPower to your home screen for easy access and notifications.
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
      
      <Dialog open={showInstallGuide} onOpenChange={setShowInstallGuide}>
        <DialogContent className="max-w-sm mx-auto rounded-2xl p-0 overflow-hidden">
            <DialogHeader className="p-5 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-center">
              <DialogTitle className="text-white text-xl font-black">Manual Install Guide</DialogTitle>
              <DialogDescription className="text-amber-100">
                Follow these steps to add CoinPower to your home screen.
              </DialogDescription>
            </DialogHeader>
            <div className="p-5">
              {isIos() ? (
                <div className="space-y-4 text-sm text-gray-700">
                  <p className="flex items-start gap-3">
                    <span className="font-bold text-amber-600">1.</span>
                    <span>Tap the <span className="font-semibold">Share</span> button in your Safari browser toolbar.</span>
                    <Share className="w-8 h-8 text-blue-500 flex-shrink-0" />
                  </p>
                  <p className="flex items-start gap-3">
                    <span className="font-bold text-amber-600">2.</span>
                    <span>Scroll down and tap on <span className="font-semibold">'Add to Home Screen'</span>.</span>
                    <PlusSquare className="w-8 h-8 text-gray-600 flex-shrink-0" />
                  </p>
                   <p className="flex items-start gap-3">
                    <span className="font-bold text-amber-600">3.</span>
                    <span>Confirm by tapping <span className="font-semibold">'Add'</span> in the top-right corner.</span>
                  </p>
                </div>
              ) : (
                <div className="space-y-4 text-sm text-gray-700">
                  <p className="flex items-start gap-3">
                    <span className="font-bold text-amber-600">1.</span>
                    <span>Tap the <span className="font-semibold">three dots</span> menu button in your Chrome browser.</span>
                    <MoreHorizontal className="w-8 h-8 text-gray-600 flex-shrink-0" />
                  </p>
                   <p className="flex items-start gap-3">
                    <span className="font-bold text-amber-600">2.</span>
                    <span>Tap on <span className="font-semibold">'Install App'</span> or <span className="font-semibold">'Add to Home screen'</span>.</span>
                    <DownloadCloud className="w-8 h-8 text-blue-500 flex-shrink-0" />
                  </p>
                   <p className="flex items-start gap-3">
                    <span className="font-bold text-amber-600">3.</span>
                    <span>Follow the on-screen prompts to install.</span>
                  </p>
                </div>
              )}
              <Button onClick={() => setShowInstallGuide(false)} className="w-full mt-5">Done</Button>
            </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
