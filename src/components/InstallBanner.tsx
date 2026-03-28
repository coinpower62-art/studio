'use client';

import { useEffect, useState } from 'react';

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isDismissed = sessionStorage.getItem('downloadDismissed');
    if (isDismissed) return;

    const ua = navigator.userAgent.toLowerCase();
    const isIphone = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIphone);

    if (isIphone) setIsVisible(true);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleDownload = async () => {
    if (isIOS) {
      alert("To Download CoinPower to your iPhone:\n1. Tap the Share icon (square with arrow)\n2. Select 'Add to Home Screen'");
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsVisible(false);
      }
      setDeferredPrompt(null);
    }
  };
  
  const closeBanner = () => {
    setIsVisible(false);
    sessionStorage.setItem('downloadDismissed', 'true');
  };

  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '15px',
      left: '15px',
      right: '15px',
      backgroundColor: '#111',
      border: '2px solid #D4AF37', // Your Gold
      padding: '12px 15px 12px 12px',
      borderRadius: '50px', // Capsule shape like a real app link
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      zIndex: 9999,
      boxShadow: '0 10px 30px rgba(0,0,0,0.8)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button onClick={closeBanner} style={{ 
          background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#888', padding: '0 5px' 
        }}>✕</button>
        <img src="/icon-192.png" alt="Logo" style={{ width: '30px', height: '30px', borderRadius: '6px' }} />
        <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '14px' }}>CoinPower App</span>
      </div>
      
      <button 
        onClick={handleDownload}
        style={{
          backgroundColor: '#D4AF37',
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
        Download
      </button>
    </div>
  );
}
