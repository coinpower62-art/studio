'use client';

import { useEffect, useState } from 'react';

export default function InstallButton() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Only check and show once per session
    const hasSeenNotice = sessionStorage.getItem('coinpower_regional_notified');
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

    if (!hasSeenNotice && !isStandalone) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    sessionStorage.setItem('coinpower_regional_notified', 'true');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '20px',
      backdropFilter: 'blur(8px)'
    }}>
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #e5e7eb',
        borderRadius: '24px',
        padding: '35px 25px',
        maxWidth: '380px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
      }}>
        {/* Your Gold Logo */}
        <div style={{ 
          width: '70px', height: '70px', 
          margin: '0 auto 20px auto', 
          backgroundImage: 'url("/icon-512x512.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          borderRadius: '18px',
          border: '1px solid #fde68a'
        }} />

        <h2 style={{ 
          color: '#111827', 
          fontSize: '20px', 
          marginBottom: '15px',
          fontWeight: 'bold'
        }}>
          Dashboard Notice
        </h2>

        <p style={{ color: '#374151', fontSize: '14px', lineHeight: '1.6', marginBottom: '10px' }}>
          To ensure all global users can access <strong>CoinPower</strong> mining tools without regional interference, we recommend installing this platform directly.
        </p>
        
        <p style={{ color: '#6b7280', fontSize: '13px', lineHeight: '1.5', marginBottom: '25px' }}>
          Due to regional app store restrictions, our official mobile app is hosted here for secure, unrestricted access.
        </p>

        <button 
          onClick={handleClose}
          style={{
            backgroundColor: '#D4AF37',
            color: '#000',
            border: 'none',
            padding: '14px 0',
            width: '100%',
            borderRadius: '12px',
            fontWeight: '900',
            fontSize: '14px',
            cursor: 'pointer',
            letterSpacing: '1px'
          }}
        >
          GOT IT
        </button>
      </div>
    </div>
  );
}
