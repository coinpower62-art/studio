'use client';

import { useEffect, useState } from 'react';

export default function InstallGuide() {
  const [device, setDevice] = useState<'ios' | 'android' | 'desktop' | null>(null);

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      setDevice('ios');
    } else if (/android/.test(ua)) {
      setDevice('android');
    } else {
      setDevice('desktop');
    }
  }, []);

  if (!device) return null;

  return (
    <div style={{ 
      padding: '20px', 
      border: '1px solid #D4AF37', 
      borderRadius: '12px', 
      backgroundColor: '#111', 
      color: '#fff',
      marginTop: '20px' 
    }}>
      <h3 style={{ color: '#D4AF37' }}>Install CoinPower App</h3>
      
      {device === 'ios' && (
        <p>1. Tap the <strong>Share</strong> icon (square with arrow) <br />
           2. Scroll down and tap <strong>'Add to Home Screen'</strong> <br />
           3. Tap <strong>'Add'</strong> to finish.</p>
      )}

      {device === 'android' && (
        <p>1. Tap the <strong>three dots (⋮)</strong> in Chrome <br />
           2. Select <strong>'Install app'</strong> or <strong>'Add to Home screen'</strong> <br />
           3. Confirm the installation.</p>
      )}

      {device === 'desktop' && (
        <p>Click the <strong>Install icon</strong> in your browser's address bar to add CoinPower to your desktop.</p>
      )}
    </div>
  );
}
