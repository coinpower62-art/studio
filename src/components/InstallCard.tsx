'use client';

import { useEffect, useState } from 'react';

export function InstallCard() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // This "catches" the official install signal from Chrome and other supported browsers.
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent the browser from showing the default install prompt.
      e.preventDefault();
      // Store the event so we can trigger it later from our button.
      setDeferredPrompt(e);
    });
  }, []);

  const handleDownloadClick = async () => {
    // Check if we have the stored install prompt event.
    if (deferredPrompt) {
      // Show the browser's native install prompt.
      deferredPrompt.prompt();
      
      // Wait for the user to respond to the prompt.
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('User accepted the CoinPower app install prompt');
      }
      // We can only use the prompt once, so we clear it.
      setDeferredPrompt(null);
    } else {
      // If the deferredPrompt is not available, it means the browser isn't ready,
      // the user is on an unsupported browser (like iOS Safari), or has previously
      // dismissed the prompt. In this case, we show a helpful alert.
      alert("To install, please tap the three dots (⋮) in your browser menu and select 'Install App' or 'Add to Home Screen'.");
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
