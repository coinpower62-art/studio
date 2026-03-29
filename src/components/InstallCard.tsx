'use client';

import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from './ui/dialog';
import { Smartphone, Share, MoreVertical, X } from 'lucide-react';

export function InstallCard() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // This "catches" the official install signal from Chrome
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
    
    // Detect iOS for specific instructions
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));

  }, []);

  const handleDownloadClick = async () => {
    if (deferredPrompt) {
      // This is the "Magic" line that triggers the real Android Install window
      deferredPrompt.prompt();
      
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('User installed CoinPower');
      }
      setDeferredPrompt(null);
    } else {
      // If the browser isn't ready or it's an iOS device, show the guide
      setShowInstallGuide(true);
    }
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex flex-col items-center gap-3">
            <h3 className="font-bold text-gray-900 text-sm text-center">Click to download CoinPower app</h3>
            <p className="text-xs text-gray-500 mt-0.5 text-center">For faster access and notifications, install the app on your device.</p>
            <button 
              onClick={handleDownloadClick}
              style={{
                backgroundColor: '#000',
                color: '#D4AF37',
                padding: '15px 30px',
                borderRadius: '50px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
                border: 'none',
                cursor: 'pointer',
                marginTop: '8px',
              }}
            >
              <span>Download</span>
              <div style={{ 
                backgroundColor: '#D4AF37', 
                borderRadius: '50%', 
                padding: '5px',
                display: 'flex' 
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3">
                  <path d="M12 5v14M5 12l7 7 7-7"/>
                </svg>
              </div>
            </button>
        </div>
      </div>

      <Dialog open={showInstallGuide} onOpenChange={setShowInstallGuide}>
        <DialogContent className="max-w-sm p-6">
           <DialogClose className="absolute right-3 top-3 rounded-full p-1.5 bg-gray-100 hover:bg-gray-200 transition-colors">
              <X className="w-4 h-4 text-gray-600" />
            </DialogClose>
          <DialogHeader className="text-left">
             <DialogTitle className="flex items-center gap-2 text-lg">
              <Smartphone className="w-5 h-5" />
              Install CoinPower App
            </DialogTitle>
             <DialogDescription className="text-muted-foreground pt-1 leading-relaxed">
               The direct install prompt isn't available right now (this can happen if you've previously dismissed it). No problem! Just follow the steps for your device below.
            </DialogDescription>
          </DialogHeader>
          
          <div className="text-sm pt-2">
            <p className="font-bold text-foreground mb-3">For {isIOS ? 'iPhone & iPad' : 'Android & Desktop'}:</p>
             <div className="space-y-4">
              {isIOS ? (
                <>
                  <div className="flex items-start gap-3">
                    <span className="text-primary font-bold text-xl leading-tight">1.</span>
                    <p className="text-muted-foreground mt-0.5">Tap the <span className="font-semibold text-foreground">Share</span> icon (<Share className="w-4 h-4 inline-block" />) in your Safari menu.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-primary font-bold text-xl leading-tight">2.</span>
                    <p className="text-muted-foreground mt-0.5">Scroll down and tap on <span className="font-semibold text-foreground">"Add to Home Screen"</span>.</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-3">
                    <span className="text-primary font-bold text-xl leading-tight">1.</span>
                    <p className="text-muted-foreground mt-0.5">Open your browser menu (usually three dots <MoreVertical className="w-4 h-4 inline-block" /> in the top-right).</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-primary font-bold text-xl leading-tight">2.</span>
                    <p className="text-muted-foreground mt-0.5">Look for and tap on <span className="font-semibold text-foreground">"Install App"</span> or <span className="font-semibold text-foreground">"Add to Home Screen"</span>.</p>
                  </div>
                </>
              )}
            </div>
          </div>

          <Button onClick={() => setShowInstallGuide(false)} className="w-full mt-4 h-11 text-base">Got it</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
