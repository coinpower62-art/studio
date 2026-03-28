'use client';

import { useEffect, useState } from 'react';
import { DownloadCloud } from 'lucide-react';

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
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
        <DownloadCloud className="w-4 h-4 text-amber-600" />
        Install CoinPower App
      </h3>
      <p className="text-xs text-gray-500 mt-1 mb-3">Get a native app experience with one-click access from your home screen.</p>
      
      {device === 'ios' && (
        <div className="text-gray-700 text-sm space-y-1">
           <p>1. Tap the <strong>Share</strong> icon in your browser.</p>
           <p>2. Scroll down and tap <strong>'Add to Home Screen'</strong>.</p>
           <p>3. Tap <strong>'Add'</strong> to finish.</p>
        </div>
      )}

      {device === 'android' && (
        <div className="text-gray-700 text-sm space-y-1">
            <p>1. Tap the <strong>three dots (⋮)</strong> in Chrome.</p>
            <p>2. Select <strong>'Install app'</strong> or <strong>'Add to Home screen'</strong>.</p>
            <p>3. Confirm the installation.</p>
        </div>
      )}

      {device === 'desktop' && (
        <p className="text-gray-700 text-sm">Click the <strong>Install icon</strong> in your browser's address bar to add CoinPower to your desktop.</p>
      )}
    </div>
  );
}
