'use client';

import { useEffect, useState } from 'react';
import { DownloadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function InstallButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // This effect should run only on the client
    setIsClient(true);
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(isInstalled);
  }, []);

  const handleOpen = () => setIsOpen(true);
  const handleClose = () => setIsOpen(false);

  // Don't show the button if the app is already installed or if not on client
  if (!isClient || isStandalone) {
    return null;
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
            <DownloadCloud className="w-4 h-4 text-amber-600" />
            Install App
          </h3>
          <p className="text-xs text-gray-500 mt-1">For the best experience, install the app to your home screen.</p>
        </div>
        <Button onClick={handleOpen} size="sm" className="bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold rounded-lg shadow-md transition-all">
          Learn More
        </Button>
      </div>

      {isOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.95)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100000, padding: '20px', backdropFilter: 'blur(12px)'
        }}>
          <div style={{
            backgroundColor: '#0D0D0D',
            border: '1px solid #D4AF37',
            borderRadius: '30px',
            padding: '40px 30px',
            maxWidth: '450px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 0 50px rgba(212, 175, 55, 0.25)'
          }}>
            {/* Branding */}
            <div style={{ 
              width: '80px', height: '80px', margin: '0 auto 25px auto', 
              backgroundImage: 'url("/icon-512x512.png")',
              backgroundSize: 'cover', borderRadius: '20px', border: '1px solid #D4AF37'
            }} />

            <h2 style={{ color: '#D4AF37', fontSize: '24px', fontWeight: '800', marginBottom: '20px' }}>
              GLOBAL ACCESS PROTOCOL
            </h2>

            <div style={{ textAlign: 'left', marginBottom: '30px' }}>
              <p style={{ color: '#FFFFFF', fontSize: '15px', lineHeight: '1.7', marginBottom: '15px' }}>
                To provide our services worldwide, <strong>CoinPower</strong> utilizes a direct-to-device installation method. 
              </p>
              
              <p style={{ color: '#AAAAAA', fontSize: '14px', lineHeight: '1.6', marginBottom: '15px' }}>
                Traditional platforms like the <strong>Google Play Store</strong> and <strong>Apple App Store</strong> often impose regional restrictions on cryptocurrency and mining applications, limiting access for millions of users.
              </p>

              <div style={{ 
                backgroundColor: 'rgba(212, 175, 55, 0.05)', 
                padding: '15px', 
                borderRadius: '12px', 
                borderLeft: '3px solid #D4AF37' 
              }}>
                <p style={{ color: '#D4AF37', fontSize: '13px', margin: 0, fontWeight: '600' }}>
                  By installing directly from our secure servers, you bypass these regional blocks and receive the same high-level encryption and security features found in standard store apps.
                </p>
              </div>
            </div>

            <button 
              onClick={handleClose}
              style={{
                backgroundColor: '#D4AF37',
                color: '#000',
                border: 'none',
                padding: '18px 0',
                width: '100%',
                borderRadius: '15px',
                fontWeight: '900',
                fontSize: '15px',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                boxShadow: '0 4px 20px rgba(212, 175, 55, 0.4)'
              }}
            >
              Proceed to Dashboard
            </button>
          </div>
        </div>
      )}
    </>
  );
}
