
'use client';

import { useEffect, useState } from 'react';

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // 1. Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // 2. Capture the 'Install' signal from Chrome
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    
    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
        window.removeEventListener('beforeinstallprompt', handler);
    }
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // If the browser isn't ready, show a professional tip
      alert("To install CoinPower: Tap the 3 dots (⋮) in Chrome and select 'Install App'.");
      return;
    }
    // 3. TRIGGER THE REAL INSTALL WINDOW
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  if (isInstalled || !deferredPrompt) return null; // Hide if already an app or if prompt not available

  return (
    <button 
      onClick={handleInstallClick}
      style={{
        background: 'linear-gradient(135deg, #000 0%, #1a1a1a 100%)',
        color: '#D4AF37',
        border: '2px solid #D4AF37',
        padding: '16px 24px',
        borderRadius: '12px',
        fontWeight: 'bold',
        width: '100%',
        marginTop: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        boxShadow: '0 4px 15px rgba(212, 175, 55, 0.2)'
      }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
      </svg>
      INSTALL COINPOWER APP
    </button>
  );
}
