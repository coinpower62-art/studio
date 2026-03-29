'use client';

import { useEffect, useState } from 'react';

export function InstallCard() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // This "catches" the official install signal from Chrome
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const handleDownloadClick = async () => {
    if (deferredPrompt) {
      try {
        // This is the "Magic" line that triggers the real Android Install window
        await deferredPrompt.prompt();
        
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          console.log('User installed CoinPower');
        }
        // We do not set the deferredPrompt to null to allow repeated clicks,
        // though the browser will likely only show the prompt once.
        // The catch block will handle subsequent attempts.
      } catch (error) {
        // This error will likely be thrown on subsequent clicks.
        // We show the manual instructions as a fallback.
        alert("Installation prompt can only be shown once. To install, tap the 3 dots (⋮) in your browser menu and select 'Install App' or 'Add to Home Screen'.");
      }
    } else {
      // If the browser isn't ready or doesn't support the prompt (e.g., iOS)
      alert("To install this app, tap the 3 dots (⋮) in your browser menu and select 'Install App' or 'Add to Home Screen'.");
    }
  };

  return (
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
  );
}
