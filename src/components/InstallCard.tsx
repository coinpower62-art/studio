'use client';

export function InstallCard() {
  const downloadUrl = '/coinpower.apk'; // Make sure the file is in your /public folder

  return (
    <div style={{ textAlign: 'center', margin: '20px' }}>
      <a 
        href={downloadUrl} 
        download="CoinPower.apk"
        style={{
          backgroundColor: '#D4AF37', // Your Gold
          color: '#000',
          padding: '18px 40px',
          borderRadius: '12px',
          fontWeight: '900',
          fontSize: '16px',
          textDecoration: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          border: '2px solid #000'
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
        </svg>
        DOWNLOAD ANDROID APP (.APK)
      </a>
      
      <p style={{ color: '#888', fontSize: '12px', marginTop: '10px' }}>
        *If prompted, select "Download Anyway" or "Allow from this source".
      </p>
    </div>
  );
}
