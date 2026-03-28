'use client';

import { useEffect, useState } from 'react';

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // 1. Check if user already dismissed this banner in this session
    const isDismissed = sessionStorage.getItem('installBannerDismissed');
    if (isDismissed) return;

    // 2. Detect iOS
    const ua = navigator.userAgent.toLowerCase();
    const isIphone = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIphone);

    // iOS doesn't have a 'beforeinstallprompt' event, so we show the banner manually
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
      alert("Install CoinPower:\n1. Tap the Share icon (square with arrow)\n2. Select 'Add to Home Screen'");
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setIsVisible(false);
      setDeferredPrompt(null);
    }
  };

  const closeBanner = () => {
    setIsVisible(false);
    sessionStorage.setItem('installBannerDismissed', 'true');
  };

  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '20px',
      right: '20px',
      backgroundColor: '#D4AF37', // CoinPower Gold
      padding: '16px',
      borderRadius: '12px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      zIndex: 9999,
      border: '1px solid rgba(255,255,255,0.2)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={closeBanner} style={{ 
          background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#000', padding: '0 5px' 
        }}>✕</button>
        <div style={{ color: '#000', fontWeight: 'bold', fontSize: '14px' }}>
          Install CoinPower App
        </div>
      </div>
      
      <button 
        onClick={handleInstall}
        style={{
          backgroundColor: '#000',
          color: '#D4AF37',
          border: 'none',
          padding: '10px 18px',
          borderRadius: '8px',
          fontWeight: '800',
          cursor: 'pointer',
          fontSize: '13px'
        }}
      >
        INSTALL
      </button>
    </div>
  );
}
