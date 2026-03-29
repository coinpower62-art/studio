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
      // This is the "Magic" line that triggers the real Android Install window
      deferredPrompt.prompt();
      
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('User installed CoinPower');
      }
      setDeferredPrompt(null);
    } else {
      // If the browser isn't ready, we tell the user how to force it
      alert("Browser is preparing the download. If nothing happens, tap the 3 dots (⋮) and select 'Install App'.");
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
