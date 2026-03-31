'use client';

import { useEffect, useState } from 'react';
import { CheckCircle } from 'lucide-react';

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
    if (isInstalled) return;

    if (!deferredPrompt) {
      // If the browser isn't ready, show a professional tip
      alert("To install CoinPower: Tap the 3 dots (⋮) in Chrome and select 'Install App'.");
      return;
    }
    // 3. TRIGGER THE REAL INSTALL WINDOW
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
        // The 'appinstalled' event will handle setting isInstalled
        setDeferredPrompt(null);
    }
  };
  
  // Don't show the button at all if it's not an installable context and not already installed.
  if (!deferredPrompt && !isInstalled) {
      return null;
  }

  return (
    <button 
      onClick={handleInstallClick}
      disabled={isInstalled}
      style={{
        background: isInstalled ? '#22c55e' : 'linear-gradient(135deg, #000 0%, #1a1a1a 100%)',
        color: isInstalled ? '#fff' : '#D4AF37',
        border: isInstalled ? '2px solid #16a34a' : '2px solid #D4AF37',
        padding: '16px 24px',
        borderRadius: '12px',
        fontWeight: 'bold',
        width: '100%',
        marginTop: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        boxShadow: isInstalled ? '0 4px 15px rgba(34, 197, 94, 0.2)' : '0 4px 15px rgba(212, 175, 55, 0.2)',
        cursor: isInstalled ? 'default' : 'pointer',
        transition: 'all 0.3s ease',
        opacity: isInstalled ? 0.7 : 1,
      }}
    >
      {isInstalled ? (
        <>
          <CheckCircle width="24" height="24" />
          APP INSTALLED
        </>
      ) : (
        <>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
          </svg>
          INSTALL COINPOWER APP
        </>
      )}
    </button>
  );
}
