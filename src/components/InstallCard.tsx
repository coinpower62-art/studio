'use client';

import { useEffect, useState } from 'react';
import { ArrowDownToLine, Smartphone, Share, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function InstallCard() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showManualInstall, setShowManualInstall] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    const ua = navigator.userAgent.toLowerCase();
    const isIphone = /iphone|ipad|ipod/.test(ua);
    if (isIphone) {
      setIsIOS(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => {
        setDeferredPrompt(null);
      });
    } else {
      setShowManualInstall(true);
    }
  };

  return (
    <>
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

      <Dialog open={showManualInstall} onOpenChange={setShowManualInstall}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                Install CoinPower App
            </DialogTitle>
            <DialogDescription>
              The direct install prompt isn't available right now (this can happen if you've previously dismissed it). No problem! Just follow the steps for your device below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 text-sm">
            {isIOS ? (
              <div className="space-y-3">
                <p className="font-semibold text-gray-800">For iPhone & iPad:</p>
                <div className="flex items-start gap-3">
                  <div className="font-bold text-lg text-amber-600">1.</div>
                  <p>Tap the <Share className="w-4 h-4 inline-block mx-1" /> 'Share' icon in your Safari browser toolbar.</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="font-bold text-lg text-amber-600">2.</div>
                  <p>Scroll down in the share menu and tap on 'Add to Home Screen'.</p>
                </div>
                 <div className="flex items-start gap-3">
                  <div className="font-bold text-lg text-amber-600">3.</div>
                  <p>Tap 'Add' in the top-right corner of the screen.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                 <p className="font-semibold text-gray-800">For Android & Desktop:</p>
                  <div className="flex items-start gap-3">
                  <div className="font-bold text-lg text-amber-600">1.</div>
                  <p>Open your browser menu (usually three dots <MoreVertical className="w-4 h-4 inline-block mx-0.5" /> in the top-right).</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="font-bold text-lg text-amber-600">2.</div>
                  <p>Look for and tap on "Install App" or "Add to Home Screen".</p>
                </div>
              </div>
            )}
          </div>
          <Button onClick={() => setShowManualInstall(false)} className="w-full">
            Got it
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
