'use client';

import { useEffect, useState } from 'react';

export default function RegionalNotice() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Show the notice at the start of every new session.
    const hasSeenNoticeInSession = sessionStorage.getItem('coinpower_session_notice_acknowledged');
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

    // Do not show if already seen in this session or if running as an installed app.
    if (!hasSeenNoticeInSession && !isStandalone) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    // Mark as seen for the current browser session.
    sessionStorage.setItem('coinpower_session_notice_acknowledged', 'true');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
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

        <h2 style={{ color: '#D4AF37', fontSize: '24px', fontWeight: '800', marginBottom: '10px' }}>
          Platform Access Notice
        </h2>
        <p style={{color: '#AAAAAA', fontSize: '13px', marginBottom: '20px'}}>A message from the CoinPower compliance team.</p>


        <div style={{ textAlign: 'left', marginBottom: '30px' }}>
          <p style={{ color: '#FFFFFF', fontSize: '15px', lineHeight: '1.7', marginBottom: '15px' }}>
            To guarantee unrestricted global access and comply with international financial regulations, CoinPower operates as a direct-to-device web application.
          </p>
          
          <p style={{ color: '#AAAAAA', fontSize: '14px', lineHeight: '1.6', marginBottom: '15px' }}>
            This model allows us to deliver a secure, high-performance service without the regional blockades often imposed by traditional app stores on investment platforms.
          </p>

          <div style={{ 
            backgroundColor: 'rgba(212, 175, 55, 0.05)', 
            padding: '15px', 
            borderRadius: '12px', 
            borderLeft: '3px solid #D4AF37' 
          }}>
            <p style={{ color: '#D4AF37', fontSize: '13px', margin: 0, fontWeight: '600' }}>
              Installing CoinPower on your home screen ensures you receive critical security updates directly from our servers and enjoy the best possible user experience.
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
          Acknowledge & Continue
        </button>
      </div>
    </div>
  );
}
